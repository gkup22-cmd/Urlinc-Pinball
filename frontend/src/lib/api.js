import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const http = axios.create({ baseURL: API });

export const fileUrl = (path) => (path ? `${API}/files/${path}` : null);

export const errMsg = (e) => e?.response?.data?.detail || e?.message || "Something went wrong";

export function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export const PRESETS = ["Haunted Mansion", "Deep Sea Kraken", "Neon Synthwave", "Jurassic Safari", "Samurai Storm", "Galactic Heist"];
