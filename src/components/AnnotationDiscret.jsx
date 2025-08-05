import React, { useState } from "react";

const AnnotationDiscret = ({
  time,
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

  const percent = (time - viewStart) / duration;
  const left = percent * 100;

  // Masquer si hors de la timeline visible
  if (percent < 0 || percent > 1) return null;

  const handleMouseDown = (e) => {
    e.preventDefault();

    const initialX = e.clientX;
    const initialTime = time;
    const rect = timelineRef.current.getBoundingClientRect();

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - initialX;
      const percentDelta = deltaX / rect.width;
      const timeDelta = percentDelta * duration;
      let newTime = initialTime + timeDelta;

      // clamp à l'intérieur du zoom visible
      newTime = Math.max(viewStart, Math.min(viewStart + duration, newTime));

      onSlide(newTime);
      setTooltip({ visible: true, x: moveEvent.clientX, time: newTime });
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
        onMouseDown={handleMouseDown}
        className="absolute top-1 bottom-1 z-30 group"
        style={{ left: `${left}%`, cursor: "grab" }}
      >
        <div
          className="w-[2px] h-full transition group-hover:brightness-75"
          style={{ backgroundColor: color }}
        />

        <div className="absolute -top-6 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-40">
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
          className="fixed z-50 px-2 py-1 bg-black text-white text-xs rounded shadow-lg pointer-events-none"
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

export default AnnotationDiscret;
