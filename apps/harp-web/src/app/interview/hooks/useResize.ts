import { useState, useEffect, useCallback } from 'react';

interface UseResizeOptions {
  initialSize: number;
  min: number;
  max: number;
  orientation: 'horizontal' | 'vertical';
}

export function useResize({ initialSize, min, max, orientation }: UseResizeOptions) {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);

  const startDragging = useCallback(() => {
    setIsDragging(true);
  }, []);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // This will be overridden by the specific implementation
      // The actual resize logic is handled in the component
    };

    const handleMouseUp = () => {
      stopDragging();
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = orientation === 'horizontal' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, orientation, stopDragging]);

  const updateSize = useCallback((newSize: number) => {
    const clampedSize = Math.min(Math.max(newSize, min), max);
    setSize(clampedSize);
  }, [min, max]);

  return {
    size,
    isDragging,
    startDragging,
    stopDragging,
    updateSize,
  };
}
