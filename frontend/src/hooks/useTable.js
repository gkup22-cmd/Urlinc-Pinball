import { useCallback, useEffect, useState } from "react";
import { http } from "../lib/api";

export const isGenerating = (t) => Object.values(t?.art_status || {}).some((s) => s === "generating");

export function useTable(id) {
  const [table, setTable] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    () => http.get(`/tables/${id}`).then((r) => setTable(r.data)).catch((e) => setError(e?.response?.status === 404 ? "Table not found" : "Could not load table")),
    [id]
  );
  useEffect(() => {
    load();
  }, [load]);
  const generating = isGenerating(table);
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => {
      http.get(`/tables/${id}`).then((r) => {
        setTable((prev) => ({ ...prev, art: r.data.art, art_status: r.data.art_status, art_enabled: r.data.art_enabled }));
      });
    }, 5000);
    return () => clearInterval(t);
  }, [generating, id]);
  return { table, setTable, error, reload: load };
}
