import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from storage import APP_NAME, get_object, init_storage, put_object  # noqa: E402
from table_gen import art_prompt, generate_layout, generate_story, sanitize_layout, sanitize_story  # noqa: E402
from parts import build_router  # noqa: E402

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ART_KINDS = ["playfield", "backglass", "cabinet", "caps"]
NO_ID = {"_id": 0}


def now():
    return datetime.now(timezone.utc).isoformat()


class BrandOptions(BaseModel):
    enabled: bool = False
    asset_ids: List[str] = []
    bumperCaps: bool = True
    backglassLogo: bool = True
    apronLogo: bool = True


class GenerateRequest(BaseModel):
    theme: str = Field(min_length=1, max_length=300)
    brand: BrandOptions = BrandOptions()
    generate_art: bool = False
    parts_kit_id: Optional[str] = None


class TableUpdate(BaseModel):
    name: Optional[str] = None
    saved: Optional[bool] = None
    palette: Optional[dict] = None
    bumpers: Optional[list] = None
    targets: Optional[list] = None
    rollovers: Optional[list] = None
    ramps: Optional[list] = None
    saucers: Optional[list] = None
    rails: Optional[list] = None
    style: Optional[dict] = None
    story: Optional[dict] = None
    missions: Optional[list] = None
    scoring: Optional[dict] = None
    physics: Optional[dict] = None
    backglass: Optional[dict] = None
    brand: Optional[BrandOptions] = None
    art_enabled: Optional[dict] = None
    parts_kit_id: Optional[str] = None


class ArtRequest(BaseModel):
    kinds: List[str] = ART_KINDS


class ScoreRequest(BaseModel):
    score: int = Field(ge=0)


async def get_table_or_404(table_id: str) -> dict:
    t = await db.tables.find_one({"id": table_id}, NO_ID)
    if not t:
        raise HTTPException(404, "Table not found")
    return t


async def run_art(table_id: str, kind: str):
    from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
    try:
        t = await get_table_or_404(table_id)
        gen = OpenAIImageGeneration(api_key=os.environ["EMERGENT_LLM_KEY"])
        prompt = art_prompt(kind, t)
        images = await asyncio.to_thread(
            lambda: asyncio.run(gen.generate_images(prompt=prompt, model="gpt-image-1.5", number_of_images=1)))
        if not images:
            raise RuntimeError("No image returned")
        path = f"{APP_NAME}/art/{table_id}/{kind}-{uuid.uuid4().hex[:8]}.png"
        res = await asyncio.to_thread(put_object, path, images[0], "image/png")
        await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": res["path"], "content_type": "image/png",
                                   "is_deleted": False, "created_at": now()})
        await db.tables.update_one({"id": table_id}, {"$set": {f"art.{kind}": res["path"], f"art_status.{kind}": "ready",
                                                               f"art_enabled.{kind}": True}})
    except Exception as e:
        logger.exception("Art generation failed")
        await db.tables.update_one({"id": table_id}, {"$set": {f"art_status.{kind}": f"error: {str(e)[:120]}"}})


_tasks = set()


def start_art(table_id: str, kinds: List[str]):
    for k in kinds:
        task = asyncio.create_task(run_art(table_id, k))
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)


@api.get("/")
async def root():
    return {"message": "Pinball Forge API"}


@api.post("/tables/generate")
async def generate_table(req: GenerateRequest):
    brand_names = []
    if req.brand.enabled and req.brand.asset_ids:
        assets = await db.assets.find({"id": {"$in": req.brand.asset_ids}, "is_deleted": False}, NO_ID).to_list(50)
        brand_names = sorted({a.get("brand") or a["name"] for a in assets})
    kit = None
    if req.parts_kit_id:
        kit = await db.parts_kits.find_one({"id": req.parts_kit_id, "is_deleted": False}, NO_ID)
        if not kit:
            raise HTTPException(404, "Parts kit not found")
    try:
        layout = await generate_layout(req.theme.strip(), brand_names)
    except Exception as e:
        logger.exception("Layout generation failed")
        raise HTTPException(502, f"Table generation failed, please try again ({str(e)[:80]})")
    if kit:
        layout["style"]["material"] = kit.get("material", layout["style"]["material"])
    table = {
        "id": str(uuid.uuid4()), "theme": req.theme.strip(), "saved": False, **layout,
        "parts_kit_id": kit["id"] if kit else None,
        "brand": req.brand.model_dump() if req.brand.enabled else BrandOptions().model_dump(),
        "art": {}, "art_status": {k: "generating" for k in ART_KINDS} if req.generate_art else {},
        "art_enabled": {k: True for k in ART_KINDS},
        "high_score": 0, "plays": 0, "created_at": now(), "updated_at": now(),
    }
    await db.tables.insert_one(dict(table))
    if req.generate_art:
        start_art(table["id"], ART_KINDS)
    return table


@api.get("/tables")
async def list_tables(saved: Optional[bool] = True):
    q = {} if saved is None else {"saved": saved}
    return await db.tables.find(q, NO_ID).sort("updated_at", -1).to_list(500)


@api.get("/tables/{table_id}")
async def get_table(table_id: str):
    return await get_table_or_404(table_id)


@api.put("/tables/{table_id}")
async def update_table(table_id: str, upd: TableUpdate):
    t = await get_table_or_404(table_id)
    data = upd.model_dump(exclude_none=True)
    layout_keys = {"palette", "bumpers", "targets", "rollovers", "ramps", "saucers", "rails", "style", "missions", "scoring", "physics", "backglass"}
    if layout_keys & data.keys():
        merged = {k: data.get(k, t.get(k)) for k in layout_keys}
        clean = sanitize_layout(merged)
        for k in layout_keys & data.keys():
            data[k] = clean[k]
    if "story" in data:
        data["story"] = sanitize_story(data["story"], t.get("name"))
    if "name" in data:
        data["name"] = data["name"].strip()[:32] or t["name"]
    if "parts_kit_id" in data:
        kid = data["parts_kit_id"]
        if kid and not await db.parts_kits.find_one({"id": kid, "is_deleted": False}):
            raise HTTPException(404, "Parts kit not found")
        data["parts_kit_id"] = kid or None
    data["updated_at"] = now()
    await db.tables.update_one({"id": table_id}, {"$set": data})
    return await get_table_or_404(table_id)


@api.delete("/tables/{table_id}")
async def delete_table(table_id: str):
    res = await db.tables.delete_one({"id": table_id})
    if not res.deleted_count:
        raise HTTPException(404, "Table not found")
    await db.files.update_many({"storage_path": {"$regex": f"^{APP_NAME}/art/{table_id}/"}}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api.post("/tables/{table_id}/art")
async def generate_art(table_id: str, req: ArtRequest):
    await get_table_or_404(table_id)
    kinds = [k for k in req.kinds if k in ART_KINDS]
    if not kinds:
        raise HTTPException(400, "No valid art kinds")
    await db.tables.update_one({"id": table_id}, {"$set": {f"art_status.{k}": "generating" for k in kinds}})
    start_art(table_id, kinds)
    return {"ok": True, "kinds": kinds}


@api.post("/tables/{table_id}/story")
async def write_story(table_id: str):
    t = await get_table_or_404(table_id)
    try:
        res = await generate_story(t)
    except Exception as e:
        logger.exception("Story generation failed")
        raise HTTPException(502, f"Story generation failed, please try again ({str(e)[:80]})")
    await db.tables.update_one({"id": table_id}, {"$set": {**res, "updated_at": now()}})
    return await get_table_or_404(table_id)


@api.post("/tables/{table_id}/score")
async def submit_score(table_id: str, req: ScoreRequest):
    t = await get_table_or_404(table_id)
    high = max(t.get("high_score", 0), req.score)
    await db.tables.update_one({"id": table_id}, {"$set": {"high_score": high}, "$inc": {"plays": 1}})
    return {"high_score": high, "new_record": req.score > t.get("high_score", 0)}


@api.get("/assets")
async def list_assets():
    return await db.assets.find({"is_deleted": False}, NO_ID).sort("created_at", 1).to_list(200)


@api.post("/assets")
async def upload_asset(file: UploadFile = File(...), name: str = Form(...), brand: str = Form("")):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Only image files are allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 8MB)")
    ext = (file.filename or "img.png").rsplit(".", 1)[-1].lower()
    path = f"{APP_NAME}/assets/{uuid.uuid4()}.{ext}"
    res = await asyncio.to_thread(put_object, path, data, file.content_type)
    asset = {"id": str(uuid.uuid4()), "name": name.strip()[:40] or "Asset", "brand": brand.strip()[:40],
             "storage_path": res["path"], "content_type": file.content_type, "is_deleted": False, "created_at": now()}
    await db.assets.insert_one(dict(asset))
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": res["path"], "content_type": file.content_type,
                               "is_deleted": False, "created_at": now()})
    asset.pop("is_deleted")
    return asset


@api.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    res = await db.assets.update_one({"id": asset_id}, {"$set": {"is_deleted": True}})
    if not res.matched_count:
        raise HTTPException(404, "Asset not found")
    return {"ok": True}


@api.get("/files/{path:path}")
async def download(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False}, NO_ID)
    if not rec:
        raise HTTPException(404, "File not found")
    data, ctype = await asyncio.to_thread(get_object, path)
    return Response(content=data, media_type=rec.get("content_type") or ctype,
                    headers={"Cache-Control": "public, max-age=86400"})


parts_router = build_router(db)
api.include_router(parts_router)
app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    await db.tables.create_index("id", unique=True)
    await db.assets.create_index("id", unique=True)
    await db.files.create_index("storage_path")
    try:
        await asyncio.to_thread(init_storage)
        await seed_brand_assets()
        await parts_router.seed()
    except Exception as e:
        logger.error(f"Storage init/seed failed: {e}")


SEED = [("round", "URLinc Round Badge"), ("pill", "URLinc Pill Badge"), ("plate", "URLinc Plate"),
        ("button", "URLinc 3D Button"), ("pressme", "URLinc Press Me Button")]


async def seed_brand_assets():
    for key, name in SEED:
        if await db.assets.find_one({"seed_key": key}):
            continue
        data = (ROOT_DIR / "seed_assets" / f"urlinc_{key}.png").read_bytes()
        res = await asyncio.to_thread(put_object, f"{APP_NAME}/assets/seed-urlinc-{key}.png", data, "image/png")
        await db.assets.insert_one({"id": str(uuid.uuid4()), "name": name, "brand": "URLinc", "seed_key": key,
                                    "storage_path": res["path"], "content_type": "image/png", "is_deleted": False,
                                    "created_at": now()})
        await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": res["path"], "content_type": "image/png",
                                   "is_deleted": False, "created_at": now()})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
