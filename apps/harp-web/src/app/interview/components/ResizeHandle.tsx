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
        bg-green-400/20 hover:bg-green-400/50 transition-colors relative group border-green-400/30
        ${isDragging ? 'bg-green-400/50' : ''}
      `}
      style={{ boxShadow: isDragging ? '0 0 10px rgba(0, 255, 0, 0.5)' : '0 0 5px rgba(0, 255, 0, 0.2)' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`
            ${isHorizontal ? 'w-8 h-0.5' : 'h-8 w-0.5'}
            bg-green-400/50 group-hover:bg-green-400 transition-colors
          `}
          style={{ boxShadow: '0 0 5px rgba(0, 255, 0, 0.5)' }}
        />
      </div>
    </div>
  );
}
