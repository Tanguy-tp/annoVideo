import React, { useRef } from "react";

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const OverviewTimeline = ({ currentTime, duration, viewStart, viewEnd, onSeek }) => {
  const percent = (time) => (time / duration) * 100;
  const timelineRef = useRef(null);

  const handleClick = (e) => {
    if (!timelineRef.current || !onSeek) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const newTime = Math.max(0, Math.min(duration, clickPercent * duration));

    onSeek(newTime);
  };

  return (
    <div className="relative w-full my-4">
      {/* Temps au-dessus du curseur */}
      <div
        className="absolute text-xs text-red-600 -top-5 translate-x-[-50%]"
        style={{ left: `${percent(currentTime)}%` }}
      >
        {formatTime(currentTime)}
      </div>

      {/* Temps au-dessus de viewStart */}
      <div
        className="absolute text-xs text-blue-600 -top-5 translate-x-[-50%]"
        style={{ left: `${percent(viewStart)}%` }}
      >
        {formatTime(viewStart)}
      </div>

      {/* Temps au-dessus de viewEnd */}
      <div
        className="absolute text-xs text-blue-600 -top-5 translate-x-[-50%]"
        style={{ left: `${percent(viewEnd)}%` }}
      >
        {formatTime(viewEnd)}
      </div>

      {/* Timeline fond cliquable */}
      <div
        ref={timelineRef}
        onClick={handleClick}
        className="relative h-6 bg-gray-200 rounded-md overflow-hidden cursor-pointer"
      >
        {/* Zone visible */}
        <div
          className="absolute top-0 h-full bg-blue-300 bg-opacity-50"
          style={{
            left: `${percent(viewStart)}%`,
            width: `${percent(viewEnd - viewStart)}%`,
          }}
        />

        {/* Curseur rouge */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: `${percent(currentTime)}%` }}
        />
      </div>
    </div>
  );
};

export default OverviewTimeline;
