import { useEffect, useRef } from "react";
import { PinballGame } from "../game/engine";
import { useTableImages } from "../hooks/useTableMedia";

export const PlayfieldCanvas = ({ table, preview = false, gameRef, onState, onGameOver, className = "", ...rest }) => {
  const canvasRef = useRef(null);
  const game = useRef(null);
  const { images, brandImgs } = useTableImages(table);
  const cbs = useRef({ onState, onGameOver });
  cbs.current = { onState, onGameOver };

  useEffect(() => {
    const g = new PinballGame(canvasRef.current, table, {
      preview,
      onState: (s) => cbs.current.onState?.(s),
      onGameOver: (s) => cbs.current.onGameOver?.(s),
    });
    game.current = g;
    if (gameRef) gameRef.current = g;
    return () => g.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    game.current?.setTable(table);
  }, [table]);

  useEffect(() => {
    game.current?.setImages(images, brandImgs);
  }, [images, brandImgs]);

  return (
    <canvas
      ref={canvasRef}
      className={`block aspect-[5/9] max-w-full touch-none select-none ${className}`}
      data-testid="playfield-canvas"
      {...rest}
    />
  );
};
