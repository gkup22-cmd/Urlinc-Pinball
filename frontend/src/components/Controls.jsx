import { useEffect } from "react";
import { Rocket, Vibrate } from "lucide-react";
import { unlockAudio } from "../game/sound";

const LEFT_KEYS = ["ArrowLeft", "KeyZ", "ShiftLeft"];
const RIGHT_KEYS = ["ArrowRight", "Slash", "KeyM", "ShiftRight"];
const PLUNGE_KEYS = ["Space", "Enter", "ArrowDown"];

export function useKeyboardControls(gameRef, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handle = (down) => (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      const g = gameRef.current;
      if (!g) return;
      let used = true;
      if (LEFT_KEYS.includes(e.code)) g.setFlipper("left", down);
      else if (RIGHT_KEYS.includes(e.code)) g.setFlipper("right", down);
      else if (PLUNGE_KEYS.includes(e.code)) !e.repeat && g.setPlunger(down);
      else if (e.code === "KeyN" && down && !e.repeat) g.nudge();
      else used = false;
      if (used) {
        e.preventDefault();
        unlockAudio();
      }
    };
    const kd = handle(true);
    const ku = handle(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gameRef, enabled]);
}

const hold = (fn) => ({
  onPointerDown: (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    unlockAudio();
    fn(true);
  },
  onPointerUp: () => fn(false),
  onPointerCancel: () => fn(false),
  onContextMenu: (e) => e.preventDefault(),
});

export const TouchControls = ({ gameRef }) => {
  const g = () => gameRef.current;
  return (
    <div className="grid w-full grid-cols-[1fr_auto_auto_1fr] items-stretch gap-2 select-none" data-testid="touch-controls">
      <button className="flipper-btn" {...hold((d) => g()?.setFlipper("left", d))} data-testid="left-flipper-btn">
        LEFT
      </button>
      <button className="ctrl-btn" onClick={() => g()?.nudge()} data-testid="nudge-btn" aria-label="Nudge">
        <Vibrate className="h-5 w-5" />
      </button>
      <button className="ctrl-btn launch" {...hold((d) => g()?.setPlunger(d))} data-testid="launch-btn" aria-label="Launch">
        <Rocket className="h-5 w-5" />
      </button>
      <button className="flipper-btn" {...hold((d) => g()?.setFlipper("right", d))} data-testid="right-flipper-btn">
        RIGHT
      </button>
    </div>
  );
};
