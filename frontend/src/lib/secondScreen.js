import { toast } from "sonner";

export const channelName = (id) => `pinball-forge-${id}`;

export async function openBackglassScreen(id) {
  const url = `${window.location.origin}/backglass/${id}`;
  let features = "popup,width=1280,height=720";
  let placed = false;
  try {
    if ("getScreenDetails" in window) {
      const details = await window.getScreenDetails();
      const other = details.screens.find((s) => s !== details.currentScreen);
      if (other) {
        features = `popup,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
        placed = true;
      }
    }
  } catch {
    // permission denied or unsupported: fall back to a normal popup
  }
  const w = window.open(url, "pinball-forge-backglass", features);
  if (!w) {
    toast.error("Pop-up blocked. Allow pop-ups for this site to use a second screen.");
    return null;
  }
  toast.success(placed ? "Back-glass opened on your second screen. Click it and press F for fullscreen." : "Drag the back-glass window to your second screen, then press F for fullscreen.");
  return w;
}
