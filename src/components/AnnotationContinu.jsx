import React, { useState } from "react";

const AnnotationContinu = ({
  start,
  end,
  color,
  duration,
  viewStart,
  timelineRef,
  onUpdateStart,
  onUpdateEnd,
  onDelete,
  onDuplicate,
  onSlide,
}) => {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, time: 0 });

  const visibleStart = Math.max(start, viewStart);
  const visibleEnd = Math.min(end, viewStart + duration);
  if (visibleEnd <= visibleStart) return null;

  const left = ((visibleStart - viewStart) / duration) * 100;
  const width = ((visibleEnd - visibleStart) / duration) * 100;

  const handleDrag = (initialX, startInitial, endInitial) => {

    const timelineRect = timelineRef.current.getBoundingClientRect();

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - initialX;
      const percentDelta = deltaX / timelineRect.width;
      const timeDelta = percentDelta * duration;

      let newStart = startInitial + timeDelta;
      let newEnd = endInitial + timeDelta;

      // Contraintes
      const viewEnd = viewStart + duration;
      if (newStart < viewStart) {
        newEnd += viewStart - newStart;
        newStart = viewStart;
      } else if (newEnd > viewEnd) {
        const overflow = newEnd - viewEnd;
        newStart -= overflow;
        newEnd = viewEnd;
      }
      
      onSlide(newStart);

      setTooltip({
        visible: true,
        x: moveEvent.clientX,
        time: newStart,
      });
    };

    const onMouseUp = () => {
      setTooltip({ visible: false, x: 0, time: 0 });
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleMouseDownBlock = (e) => {
    if (e.target.closest("button") || e.target.classList.contains("handle")) return;
    e.preventDefault();
    handleDrag(e.clientX, start, end);
  };

  const handleMouseDownStart = (e) => {
    e.preventDefault();
    handleDragStart(e.clientX, start, end, true);
  };

  const handleMouseDownEnd = (e) => {
    e.preventDefault();
    const initialX = e.clientX;
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const endInitial = end;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - initialX;
      const percentDelta = deltaX / timelineRect.width;
      const timeDelta = percentDelta * duration;

      let newEnd = endInitial + timeDelta;
      const viewEnd = viewStart + duration;
      newEnd = Math.min(viewEnd, Math.max(start + 0.1, newEnd));

      onUpdateEnd(newEnd);

      setTooltip({
        visible: true,
        x: moveEvent.clientX,
        time: newEnd,
      });
    };

    const onMouseUp = () => {
      setTooltip({ visible: false, x: 0, time: 0 });
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDragStart = (initialX, startInitial, endInitial, isStart) => {
    const timelineRect = timelineRef.current.getBoundingClientRect();

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - initialX;
      const percentDelta = deltaX / timelineRect.width;
      const timeDelta = percentDelta * duration;

      const viewEnd = viewStart + duration;
      let newTime = startInitial + timeDelta;

      if (isStart) {
        newTime = Math.max(viewStart, Math.min(end - 0.1, newTime));
        onUpdateStart(newTime);
      } else {
        newTime = Math.min(viewEnd, Math.max(start + 0.1, newTime));
        onUpdateEnd(newTime);
      }

      setTooltip({
        visible: true,
        x: moveEvent.clientX,
        time: newTime,
      });
    };

    const onMouseUp = () => {
      setTooltip({ visible: false, x: 0, time: 0 });
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <>
      <div
        onMouseDown={handleMouseDownBlock}
        className="absolute top-1 bottom-1 z-10 rounded group transition"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          cursor: "grab",
        }}
      >
        <div
          className="absolute inset-0 rounded bg-opacity-50 transition group-hover:brightness-50 pointer-events-none z-0"
          style={{ backgroundColor: color }}
        />

        <div
          onMouseDown={handleMouseDownStart}
          className="absolute left-0 top-0 bottom-0 w-[2px] cursor-ew-resize z-20 handle"
        />
        <div
          onMouseDown={handleMouseDownEnd}
          className="absolute right-0 top-0 bottom-0 w-[2px] cursor-ew-resize z-20 handle"
        />

        <div
          className="absolute flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30"
          style={{ top: "-10px", right: "4px" }}
        >
          <button
            onClick={onDuplicate}
            className="px-1 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 leading-none"
            title="Dupliquer"
          >
            +
          </button>
          <button
            onClick={onDelete}
            className="px-1 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600 leading-none"
            title="Supprimer"
          >
            ×
          </button>
        </div>
      </div>

      {tooltip.visible && (
        <div
          className="fixed z-50 px-2 py-1 bg-black text-white text-xs rounded shadow-lg pointer-events-none transition"
          style={{
            left: tooltip.x,
            top: timelineRef.current?.getBoundingClientRect().top - 30,
            transform: "translateX(-50%)",
          }}
        >
          {tooltip.time.toFixed(2)}s
        </div>
      )}
    </>
  );
};

export default AnnotationContinu;
