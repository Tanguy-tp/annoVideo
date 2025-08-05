import React, { useEffect, useState, useRef } from "react";
import AnnotationContinu from "./AnnotationContinu";
import AnnotationDiscret from "./AnnotationDiscret";

const Timeline = ({
  annotation,
  annotationIndex,
  currentTime,
  duration,
  viewStart,
  viewEnd,
  onSeek,
  updateAnnotationStart,
  updateAnnotationEnd,
  handleDuplicateTime,
  handleDeleteTime,
  onSlideAnnotation,
}) => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isDraggingCursor, setIsDraggingCursor] = useState(false);
  const [cursorTooltip, setCursorTooltip] = useState({ visible: false, x: 0, time: 0 });
  const timelineRef = useRef(null);

  const visibleDuration = viewEnd - viewStart;

  const handleCursorDrag = (e) => {
    e.preventDefault();
    if (!timelineRef.current || !onSeek) return;

    const rect = timelineRef.current.getBoundingClientRect();
    setIsDraggingCursor(true);

    const updatePosition = (clientX) => {
      const offsetX = clientX - rect.left;
      const percent = offsetX / rect.width;
      const newTime = Math.max(viewStart, Math.min(viewEnd, viewStart + percent * visibleDuration));
      onSeek(newTime);
      setCursorTooltip({ visible: true, x: clientX, time: newTime });
    };

    updatePosition(e.clientX);

    const onMouseMove = (moveEvent) => updatePosition(moveEvent.clientX);
    const onMouseUp = () => {
      setIsDraggingCursor(false);
      setCursorTooltip({ visible: false, x: 0, time: 0 });
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    if (visibleDuration > 0) {
      setCursorPosition(((currentTime - viewStart) / visibleDuration) * 100);
    }
  }, [currentTime, viewStart, viewEnd]);

  const isDiscrete = annotation.isDiscrete;
  const times = annotation.getAllTimes();

  return (
    <div className="flex items-center w-full mt-2">
      <div
        ref={timelineRef}
        onClick={(e) => {
          if (!timelineRef.current || !onSeek) return;
          const rect = timelineRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percent = clickX / rect.width;
          const newTime = Math.max(viewStart, Math.min(viewEnd, viewStart + percent * visibleDuration));
          onSeek(newTime);
        }}
        className="relative flex-grow h-8 bg-gray-200 rounded-lg overflow-visible shadow-inner"
      >
        {/* Curseur rouge */}
        <div
          onMouseDown={handleCursorDrag}
          className={`absolute w-[2px] z-20 cursor-ew-resize transition ${
            isDraggingCursor ? "bg-yellow-400" : "bg-red-500"
          }`}
          style={{
            left: `${cursorPosition}%`,
            top: "-4px",
            height: "calc(100% + 8px)",
          }}
        />

        {/* Annotations continues */}
        {!isDiscrete &&
          times.map((time, i) => {
            if (!time) return null;
            const { start, end } = time;
            const isVisible = end >= viewStart && start <= viewEnd;
            if (!isVisible) return null;

            return (
              <AnnotationContinu
                key={i}
                annotationIndex={annotationIndex}
                start={start}
                end={end}
                color={annotation.color}
                duration={visibleDuration}
                timelineRef={timelineRef}
                viewStart={viewStart}
                onUpdateEnd={(newEndTime) => updateAnnotationEnd(annotationIndex, i, newEndTime)}
                onUpdateStart={(newStartTime) => updateAnnotationStart(annotationIndex, i, newStartTime)}
                onDelete={() => handleDeleteTime(annotationIndex, i)}
                onDuplicate={() => handleDuplicateTime(annotationIndex, i)}
                onSlide={(newstart) => onSlideAnnotation(annotationIndex, i, newstart)}
              />
            );
          })}

        {/* Annotations discrètes */}
        {isDiscrete &&
          times.map((time, i) => {
            const t = time.start;
            if (t < viewStart || t > viewEnd) return null;

            return (
              <AnnotationDiscret
                key={i}
                annotationIndex={annotationIndex}
                time={t}
                color={annotation.color}
                duration={visibleDuration}
                timelineRef={timelineRef}
                viewStart={viewStart}
                onUpdateEnd={(newEndTime) => updateAnnotationEnd(annotationIndex, i, newEndTime)}
                onUpdateStart={(newStartTime) => updateAnnotationStart(annotationIndex, i, newStartTime)}
                onDelete={() => handleDeleteTime(annotationIndex, i)}
                onDuplicate={() => handleDuplicateTime(annotationIndex, i)}
                onSlide={(newstart) => onSlideAnnotation(annotationIndex, i, newstart)}
              />
            );
          })}
      </div>

      {/* Nom de la timeline */}
      <div className="ml-4 w-32 text-sm font-medium text-black text-center h-3">
        {annotation.name}
      </div>

      {/* Tooltip */}
      {cursorTooltip.visible && (
        <div
          className="fixed z-50 px-2 py-1 bg-black text-white text-xs rounded shadow-lg pointer-events-none transition"
          style={{
            left: cursorTooltip.x,
            top: timelineRef.current?.getBoundingClientRect().top - 30,
            transform: "translateX(-50%)",
          }}
        >
          {cursorTooltip.time.toFixed(2)}s
        </div>
      )}
    </div>
  );
};

export default Timeline;
