import { useCallback, useRef, useState } from "react";

export function useDraggable() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef(null);

  const handlePointerDown = useCallback(
    (event) => {
      // Ignore if triggered on interactive elements
      if (event.target.closest("a, button, input, label")) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      startRef.current = {
        px: event.clientX,
        py: event.clientY,
        ox: offset.x,
        oy: offset.y,
      };
      setIsDragging(true);
    },
    [offset.x, offset.y],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!startRef.current) return;
      const dx = event.clientX - startRef.current.px;
      const dy = event.clientY - startRef.current.py;
      setOffset({ x: startRef.current.ox + dx, y: startRef.current.oy + dy });
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    startRef.current = null;
    setIsDragging(false);
  }, []);

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };

  return { offset, isDragging, dragHandleProps };
}
