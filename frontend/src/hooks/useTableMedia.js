import { useEffect, useState } from "react";
import { fileUrl, http, loadImage } from "../lib/api";

export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const refresh = () =>
    http.get("/assets").then((r) => setAssets(r.data)).finally(() => setLoading(false));
  useEffect(() => {
    refresh();
  }, []);
  return { assets, loading, refresh };
}

export function useTableImages(table) {
  const [state, setState] = useState({ images: {}, brandImgs: [] });
  const pf = table?.art_enabled?.playfield !== false ? table?.art?.playfield : null;
  const caps = table?.art_enabled?.caps !== false ? table?.art?.caps : null;
  const ids = table?.brand?.enabled ? (table.brand.asset_ids || []).join(",") : "";
  const apron = table?.brand?.enabled && table?.brand?.apronLogo;
  useEffect(() => {
    let alive = true;
    (async () => {
      const playfield = await loadImage(fileUrl(pf));
      const capsImg = await loadImage(fileUrl(caps));
      let brandImgs = [];
      if (ids) {
        const { data } = await http.get("/assets");
        const chosen = data.filter((a) => ids.split(",").includes(a.id));
        brandImgs = (await Promise.all(chosen.map((a) => loadImage(fileUrl(a.storage_path))))).filter(Boolean);
      }
      if (alive) setState({ images: { playfield, caps: capsImg, apronLogo: apron ? brandImgs[0] : null }, brandImgs });
    })();
    return () => {
      alive = false;
    };
  }, [pf, caps, ids, apron]);
  return state;
}
