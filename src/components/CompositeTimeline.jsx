import React, { useEffect, useState, useRef } from "react";
import AnnotationContinu from "./AnnotationContinu";
import AnnotationDiscret from "./AnnotationDiscret";
import Timeline from "./Timeline";

const CompositeTimeline = ({
  annotationCategory,
  annotationCategoryIndex,
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
  const [isOpen, setIsOpen] = useState(false);
  const timelineRef = useRef(null);

  const visibleDuration = viewEnd - viewStart;

  
  useEffect(() => {
    if (visibleDuration > 0) {
      setCursorPosition(((currentTime - viewStart) / visibleDuration) * 100);
    }
  }, [currentTime, visibleDuration, viewStart]);

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
    const onMouseMove = (e) => updatePosition(e.clientX);
    const onMouseUp = () => {
      setIsDraggingCursor(false);
      setCursorTooltip({ visible: false, x: 0, time: 0 });
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const annotations = annotationCategory.getAnnotations();
  const categoryName = annotationCategory.name;

  return (
    <div className="relative w-full flex flex-col mt-2">
      {isOpen && (
        <div className="absolute top-0 left-[-10px] w-[2px] bg-gray-300 h-full z-0" />
      )}

      <div className="flex items-center w-full">
        <div
          ref={timelineRef}
          onClick={(e) => {
            const rect = timelineRef.current.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = Math.max(viewStart, Math.min(viewEnd, viewStart + percent * visibleDuration));
            onSeek(newTime);
          }}
          className="relative flex-grow h-8 bg-gray-200 rounded-lg overflow-visible shadow-inner"
        >
          <div
            onMouseDown={handleCursorDrag}
            className={`absolute w-[2px] z-20 cursor-ew-resize transition ${isDraggingCursor ? "bg-yellow-400" : "bg-red-500"}`}
            style={{
              left: `${cursorPosition}%`,
              top: "-4px",
              height: "calc(100% + 8px)",
            }}
          />

          {annotations.map((annotation, annotationIndex) =>
            annotation.times.map((t, i) => {
              const isDiscrete = annotation.isDiscrete;
              if (isDiscrete && (t.start < viewStart || t.start > viewEnd)) return null;
              if (!isDiscrete && (t.end < viewStart || t.start > viewEnd)) return null;

              const key = `${annotation.name}-${i}`;
              const CommonProps = {
                annotationIndex: annotationIndex,
                timeIndex: i,
                color: annotation.color,
                duration: visibleDuration,
                timelineRef,
                viewStart,
                onUpdateStart: (newStart) => updateAnnotationStart(categoryName, annotation.name, i, newStart),
                onDelete: () => handleDeleteTime(categoryName, annotation.name, i),
                onDuplicate: () => handleDuplicateTime(categoryName, annotation.name, i),
                onSlide: (newStart) => onSlideAnnotation(categoryName, annotation.name, i, newStart),
              };

              return isDiscrete ? (
                <AnnotationDiscret key={key} {...CommonProps} time={t.start} />
              ) : (
                <AnnotationContinu
                  key={key}
                  {...CommonProps}
                  start={t.start}
                  end={t.end}
                  onUpdateEnd={(newEnd) => updateAnnotationEnd(categoryName, annotation.name, i, newEnd)}
                />
              );

            })
          )}
        </div>

        <div className="ml-4 w-32 text-sm font-medium text-black h-8 flex items-center justify-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`mr-2 text-black text-xl transform transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            title={isOpen ? "Réduire" : "Afficher les sous-timelines"}
          >
            ▸
          </button>
          <span>{annotationCategory.name}</span>
        </div>


      </div>

      {cursorTooltip.visible && (
        <div
          className="fixed z-50 px-2 py-1 bg-black text-white text-xs rounded shadow-lg pointer-events-none"
          style={{
            left: cursorTooltip.x,
            top: timelineRef.current?.getBoundingClientRect().top - 30,
            transform: "translateX(-50%)",
          }}
        >
          {cursorTooltip.time.toFixed(2)}s
        </div>
      )}

      {isOpen && (
        <div className="w-full transition-all duration-300 ease-in-out animate-fade">
          {annotations.map((annotation, index) => (
            <Timeline
              key={`timeline-${index}`}
              annotation={annotation}
              annotationIndex={index}
              currentTime={currentTime}
              duration={duration}
              viewStart={viewStart}
              viewEnd={viewEnd}
              onSeek={onSeek}
              updateAnnotationStart={(ai, ti, offset) =>
                updateAnnotationStart(categoryName, annotation.name, ti, offset)
              }
              updateAnnotationEnd={(ai, ti, offset) =>
                updateAnnotationEnd(categoryName, annotation.name, ti, offset)
              }
              handleDeleteTime={(ai, ti) =>
                handleDeleteTime(categoryName, annotation.name, ti)
              }
              handleDuplicateTime={(ai, ti) =>
                handleDuplicateTime(categoryName, annotation.name, ti)
              }
              onSlideAnnotation={(ai, ti, offset) =>
                onSlideAnnotation(categoryName, annotation.name, ti, offset)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CompositeTimeline;
