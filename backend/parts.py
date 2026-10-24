import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from storage import APP_NAME, put_object

SLOTS = ["bumper_cap", "bumper_cap_lit", "bumper_base", "ball", "saucer", "flipper_left", "slingshot",
         "target_drop", "target_flag", "target_shield", "target_gem", "target_post",
         "rollover", "rollover_lit", "arrow", "arrow_lit", "rail", "rail_post", "apron_left", "apron_right"]
MATERIALS = ["chrome", "gold", "copper", "neon", "crystal"]
SEED_DIR = Path(__file__).parent / "seed_parts"
NO_ID = {"_id": 0}


def now():
    return datetime.now(timezone.utc).isoformat()


class KitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    material: str = "chrome"


class KitUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=40)
    material: str | None = None


def build_router(db) -> APIRouter:
    r = APIRouter(prefix="/parts-kits")

    async def get_kit(kit_id):
        kit = await db.parts_kits.find_one({"id": kit_id, "is_deleted": False}, NO_ID)
        if not kit:
            raise HTTPException(404, "Parts kit not found")
        return kit

    async def store(path, data, ctype):
        res = await asyncio.to_thread(put_object, path, data, ctype)
        await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": res["path"], "content_type": ctype,
                                   "is_deleted": False, "created_at": now()})
        return res["path"]

    @r.get("")
    async def list_kits():
        return await db.parts_kits.find({"is_deleted": False}, NO_ID).sort("created_at", 1).to_list(100)

    @r.get("/slots")
    async def slots():
        return SLOTS

    @r.post("")
    async def create_kit(body: KitCreate):
        kit = {"id": str(uuid.uuid4()), "name": body.name.strip(), "parts": {}, "is_deleted": False,
               "material": body.material if body.material in MATERIALS else "chrome", "created_at": now()}
        await db.parts_kits.insert_one(dict(kit))
        kit.pop("_id", None)
        return kit

    @r.put("/{kit_id}")
    async def update_kit(kit_id: str, body: KitUpdate):
        await get_kit(kit_id)
        data = {}
        if body.name and body.name.strip():
            data["name"] = body.name.strip()
        if body.material in MATERIALS:
            data["material"] = body.material
        if data:
            await db.parts_kits.update_one({"id": kit_id}, {"$set": data})
        return await get_kit(kit_id)

    @r.delete("/{kit_id}")
    async def delete_kit(kit_id: str):
        await get_kit(kit_id)
        await db.parts_kits.update_one({"id": kit_id}, {"$set": {"is_deleted": True}})
        await db.tables.update_many({"parts_kit_id": kit_id}, {"$set": {"parts_kit_id": None}})
        return {"ok": True}

    @r.post("/{kit_id}/parts/{slot}")
    async def upload_part(kit_id: str, slot: str, file: UploadFile = File(...)):
        await get_kit(kit_id)
        if slot not in SLOTS:
            raise HTTPException(400, "Unknown part slot")
        if not (file.content_type or "").startswith("image/"):
            raise HTTPException(400, "Only image files are allowed")
        data = await file.read()
        if len(data) > 8 * 1024 * 1024:
            raise HTTPException(400, "File too large (max 8MB)")
        ext = (file.filename or "p.png").rsplit(".", 1)[-1].lower()
        path = await store(f"{APP_NAME}/parts/{kit_id}/{slot}-{uuid.uuid4().hex[:6]}.{ext}", data, file.content_type)
        await db.parts_kits.update_one({"id": kit_id}, {"$set": {f"parts.{slot}": path}})
        return await get_kit(kit_id)

    @r.delete("/{kit_id}/parts/{slot}")
    async def remove_part(kit_id: str, slot: str):
        await get_kit(kit_id)
        await db.parts_kits.update_one({"id": kit_id}, {"$unset": {f"parts.{slot}": ""}})
        return await get_kit(kit_id)

    async def seed():
        for folder in sorted(SEED_DIR.glob("*")):
            if not folder.is_dir() or await db.parts_kits.find_one({"seed_key": folder.name}):
                continue
            kit_id = str(uuid.uuid4())
            parts = {}
            for f in folder.glob("*.png"):
                if f.stem in SLOTS:
                    parts[f.stem] = await store(f"{APP_NAME}/parts/seed-{folder.name}/{f.name}", f.read_bytes(), "image/png")
            name = " ".join(w.capitalize() for w in folder.name.split("_")).replace("Urlinc", "URLinc")
            material = next((m for m in MATERIALS if m in folder.name), "chrome")
            await db.parts_kits.insert_one({"id": kit_id, "name": name, "seed_key": folder.name, "parts": parts,
                                            "material": material, "is_deleted": False, "created_at": now()})

    r.seed = seed
    return r
