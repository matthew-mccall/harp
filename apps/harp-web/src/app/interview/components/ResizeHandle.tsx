interface ResizeHandleProps {
  orientation: 'horizontal' | 'vertical';
  onMouseDown: () => void;
  isDragging: boolean;
}

export default function ResizeHandle({ orientation, onMouseDown, isDragging }: ResizeHandleProps) {
  const isHorizontal = orientation === 'horizontal';
  
  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        ${isHorizontal ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize'}
        bg-white/10 hover:bg-white/30 transition-colors relative group
        ${isDragging ? 'bg-white/30' : ''}
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`
            ${isHorizontal ? 'w-12 h-0.5' : 'h-12 w-0.5'}
            bg-white/20 group-hover:bg-white/40 rounded-full transition-colors
          `}
        />
      </div>
    </div>
  );
}
