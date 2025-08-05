import React, { useEffect, useMemo, useRef, useState } from "react";
import Timeline from "./Timeline";
import OverviewTimeline from "./OverviewTimeline";
import CompositeTimeline from "./CompositeTimeline";
import ExportButton from "./ExportButton"; 

import "../styles/VideoUploader.css";
import { exportDataEn } from "../../module_enregistrement/model/SaveAndexport/ExportManagerEn";
import { exportDataFr } from "../../module_enregistrement/model/SaveAndexport/ExportManagerFr";




const VideoUploader = ({ app, handleRedo, handleUndo, actualiser}) => {
  const [videoURL, setVideoURL] = useState(null);
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
  const handleKeyDown = (event) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const step = 5;

    if (event.key === "ArrowRight") {
      video.currentTime = Math.min(video.duration, video.currentTime + step);
    } else if (event.key === "ArrowLeft") {
      video.currentTime = Math.max(0, video.currentTime - step);
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, []); 

  useEffect(() => {

    const update = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        rafId = requestAnimationFrame(update);
      }
    };

    let rafId;

    if (videoURL) {
      rafId = requestAnimationFrame(update);
    }

    return () => cancelAnimationFrame(rafId);
  }, [videoURL, app]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl+Z → Undo
      if (ctrlKey && event.key === "z") {
        event.preventDefault();
        handleUndo();
      }

      // Ctrl+Y → Redo
      if (ctrlKey && event.key === "y") {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);



  useEffect(() => {
  const pendingStartTimes = new Map(); 

  const handleKeyDown = (e) => {
    if (!videoRef.current || videoRef.current.paused) return;

    const key = e.key.toLowerCase();
    const annotations = app.getAllAnnotations();
    const matched = annotations.find(a => a.key.toLowerCase() === key);

    if (!matched) return;

    const now = videoRef.current.currentTime;

    if (matched.isDiscrete) {
      matched.addTime(now, now);
      forceUpdate(n => n + 1);
    } else {
      if (!pendingStartTimes.has(key)) {
        pendingStartTimes.set(key, now);
      } else {
        const start = pendingStartTimes.get(key);
        const end = now;
        if (end > start + 0.05) {
          matched.addTime(start, end);
          forceUpdate(n => n + 1);
        }
        pendingStartTimes.delete(key);
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [videoURL, app]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault(); // Empêche le scroll
        handlePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  
  useEffect(() => {
    const unsubscribe = app.subscribe(() => forceUpdate(n => n + 1));
    return unsubscribe;
  }, [app]);

  const visibleDuration = useMemo(
    () => duration * (1 - zoomLevel / 100),
    [duration, zoomLevel]
  );

  const viewStart = useMemo(() => {
    if (duration === 0 || visibleDuration >= duration) return 0;
    const rawStart = currentTime - visibleDuration / 2;
    return Math.max(0, Math.min(rawStart, duration - visibleDuration));
  }, [currentTime, duration, visibleDuration]);

  const viewEnd = viewStart + visibleDuration;

  const handlePlayPause = () => {
    if (videoRef.current) {
      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    }
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoURL(url);
    }
  };

  const handleChangeVideo = () => {
    URL.revokeObjectURL(videoURL);
    setVideoURL(null);
  };

  const getAnnotationsByType = (isDiscrete) => {
    return app.getOnlyAnnotations().filter((a) => a.isDiscrete === isDiscrete);
  };

  const updateAnnotation = (index, newTime, isDiscrete) => {
    const filtered = getAnnotationsByType(isDiscrete);
    const annotation = filtered[index];
    if (!annotation) return;

    if (isDiscrete) {
      annotation.slide(index, newTime - annotation.times[index].start);
    } else {
      annotation.setEnd(index, newTime);
    }
  };

  const handleDuplicateTime = (annotationIndex, timeIndex, isDiscrete) => {
    const annotations = getAnnotationsByType(isDiscrete);
    const annotation = annotations[annotationIndex];
    if (!annotation) return;

    annotation.duplicateTime(timeIndex);
    forceUpdate(n => n + 1);
  };

  const handleDeleteTime = (annotationIndex, timeIndex, isDiscrete) => {
    const annotations = getAnnotationsByType(isDiscrete);
    const annotation = annotations[annotationIndex];
    if (!annotation) return;

    annotation.removeTime(timeIndex);
    forceUpdate(n => n + 1);
  };


  const slideAnnotation = (annotationIndex, timeIndex, newStart, isDiscrete) => {
    const filtered = getAnnotationsByType(isDiscrete);
    const annotation = filtered[annotationIndex];
    if (!annotation) return;

    const time = annotation.getTime(timeIndex);
    if (!time) return;

    time.slide(newStart);
    forceUpdate(n => n + 1);
  };

  const updateAnnotationStart = (annotationIndex, timeIndex, newStart, isDiscrete) => {
    const filtered = getAnnotationsByType(isDiscrete);
    const annotation = filtered[annotationIndex];
    if (!annotation) return;

    const time = annotation.getTime(timeIndex);
    if (!time) return;

    time.setStart(newStart); // méthode prévue dans ton modèle
    forceUpdate((n) => n + 1);
  };

  const updateAnnotationEnd = (annotationIndex, timeIndex, newEnd, isDiscrete) => {
    const filtered = getAnnotationsByType(isDiscrete);
    const annotation = filtered[annotationIndex];
    if (!annotation) return;

    const time = annotation.getTime(timeIndex);
    if (!time) return;

    time.setEnd(newEnd); // méthode prévue dans ton modèle
    forceUpdate((n) => n + 1);
  };

  const handleDuplicateTimeInCategory = (categoryName, annotationName, timeIndex) => {
    const category = app.getCategoryByName(categoryName);
    if (!category) return;

    const annotation = category.getAnnotationByName(annotationName);
    if (!annotation) return;

    annotation.duplicateTime(timeIndex);
    forceUpdate(n => n + 1);
  };

  const handleDeleteTimeInCategory = (categoryName, annotationName, timeIndex) => {
    const category = app.getCategoryByName(categoryName);
    if (!category) return;

    const annotation = category.getAnnotationByName(annotationName);
    if (!annotation) return;

    annotation.removeTime(timeIndex);
    forceUpdate(n => n + 1);
  };

  const slideAnnotationInCategory = (categoryName, annotationName, timeIndex, newStart) => {
    const category = app.getCategoryByName(categoryName);
    if (!category) return;

    const annotation = category.getAnnotationByName(annotationName);
    if (!annotation) return;

    const time = annotation.getTime(timeIndex);
    if (!time) return;

    time.slide(newStart);
    forceUpdate(n => n + 1);
  };

  const updateAnnotationStartInCategory = (categoryName, annotationName, timeIndex, newStart) => {
    const category = app.getCategoryByName(categoryName);
    if (!category) return;

    const annotation = category.getAnnotationByName(annotationName);
    if (!annotation) return;

    const time = annotation.getTime(timeIndex);
    if (!time) return;

    time.setStart(newStart);
    forceUpdate(n => n + 1);
  };

  const updateAnnotationEndInCategory = (categoryName, annotationName, timeIndex, newEnd) => {
    const category = app.getCategoryByName(categoryName);
    if (!category) return;

    const annotation = category.getAnnotationByName(annotationName);
    if (!annotation) return;

    const time = annotation.getTime(timeIndex);
    if (!time) return;

    time.setEnd(newEnd);
    forceUpdate(n => n + 1);
  };

  const handleImportJson = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        importFromJson(json);
      } catch (err) {
        console.error("Erreur de parsing du JSON :", err);
        alert("Erreur lors de l'import du fichier JSON.");
      }
    };

  const importFromJson = (json) => {
    console.log("ok")
    if (!json || !json.annotationItems) return;

    json.annotationItems.forEach((item) => {
      if (item.type === "category") {
        const category = app.addCategory(item.name); // crée AnnotationCategory
        item.annotations.forEach((ann) => {
          const annotation = category.addAnnotationByParams(
            ann.name,
            ann.color,
            ann.key,
            ann.isDiscrete
          );
          ann.times.forEach((t) =>
            annotation.addTime(t.start, t.isDiscrete ? undefined : t.end)
          );
        });
      } else if (item.type === "annotation") {
        const annotation = app.addAnnotation(
          item.name,
          item.color,
          item.key,
          item.isDiscrete
        );
        item.times.forEach((t) =>
          annotation.addTime(t.start, t.isDiscrete ? undefined : t.end)
        );
      }
      actualiser()
    });

  forceUpdate((n) => n + 1); // pour rafraîchir l'affichage
};


  reader.readAsText(file);
};



  const convertToFlatTimes = (annotation) => {
    return annotation.times.flatMap((t) => [t.start, t.end]);
  };

  const convertToStartTimes = (annotation) => {
    return annotation.times.map((t) => t.start);
  };

  const continuous = getAnnotationsByType(false);
  const discrete = getAnnotationsByType(true);
  const categories = app.getOnlyCategories()  ;


  return (
    <div className={`w-full ${!videoURL ? "h-[calc(100vh-4rem)] flex items-center justify-center" : "min-h-[calc(100vh-4rem)] h-auto"}`}>
      {!videoURL ? (
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border-4 border-dashed border-blue-200 text-center">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">Importer une vidéo</h2>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
          />
        </div>
      ) : (
        <div className="w-full h-auto flex flex-row gap-4 px-4 pb-4">
          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-md p-4 flex flex-col justify-start">
            <video
              src={videoURL}
              controls
              ref={videoRef}
              onLoadedMetadata={() => setDuration(videoRef.current.duration)}
              className="w-full max-h-[65vh] object-contain rounded-lg shadow border border-gray-200"
            />
            <div className="video-controls flex justify-center space-x-4 mt-2 mb-2">
              <button onClick={() => skipTime(-5)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">-5s</button>
              <button onClick={handlePlayPause} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">⏯</button>
              <button onClick={() => skipTime(5)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">+5s</button>
            </div>
            <div className="grid grid-cols-2 gap-x-0 gap-y-2 mt-4 place-items-center">
              {/* Supprimer la vidéo */}
              <button
                onClick={handleChangeVideo}
                className="w-48 h-16 px-4 bg-red-500 text-white font-semibold rounded-lg shadow hover:bg-red-600 transition"
              >
                Supprimer la vidéo
              </button>

              {/* Exporter JSON */}
              <button
                onClick={() => {
                  const json = app.serialize();
                  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "annotations.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-48 h-16 px-4 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 transition"
              >
                Exporter JSON
              </button>

              {/* Exporter FR */}
              <div className="w-48 h-">
                <ExportButton app={app} />
              </div>

              {/* Importer JSON */}
              <label
                htmlFor="import-json"
                className="w-48 h-16 px-4 bg-yellow-500 text-white font-semibold rounded-lg shadow hover:bg-yellow-600 transition text-center cursor-pointer flex items-center justify-center"
              >
                Importer JSON
                <input
                  id="import-json"
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>


          </div>

          <div className="flex-1 min-w-0 bg-white rounded-xl shadow-md p-4 overflow-y-auto flex flex-col">
            <OverviewTimeline currentTime={currentTime} duration={duration} viewStart={viewStart} viewEnd={viewEnd} onSeek={(newTime) => videoRef.current && (videoRef.current.currentTime = newTime)} />
            <div className="flex items-center gap-3 mb-3 w-full max-w-sm">
              <label className="text-sm font-medium text-gray-700 w-16">Zoom</label>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-sm font-medium text-gray-800 w-12 text-right">
                {zoomLevel.toFixed(1)}%
              </span>
            </div>


            <div className="flex justify-between text-sm text-gray-600 mb-2 px-1 font-mono">
              <span>viewStart: {viewStart.toFixed(2)}s</span>
              <span>currentTime: {currentTime.toFixed(2)}s</span>
              <span>viewEnd: {viewEnd.toFixed(2)}s</span>
            </div>

            <>
              {continuous.map((annotation, index) => (
                <Timeline
                  key={`c-${index}`}
                  annotation={annotation}
                  annotationIndex={index}
                  currentTime={currentTime}
                  duration={duration}
                  viewStart={viewStart}
                  viewEnd={viewEnd}
                  onSeek={(newTime) => videoRef.current && (videoRef.current.currentTime = newTime)}
                  updateAnnotationStart={(ai, ti, offset) => updateAnnotationStart(ai, ti, offset, false)}
                  updateAnnotationEnd={(ai, ti, offset) => updateAnnotationEnd(ai, ti, offset, false)}
                  handleDeleteTime={(ai, ti) => handleDeleteTime(ai, ti, false)}
                  handleDuplicateTime={(ai, ti) => handleDuplicateTime(ai, ti, false)}
                  onSlideAnnotation={(ai, ti, offset) => slideAnnotation(ai, ti, offset, false)}
                />
              ))}

              {discrete.map((annotation, index) => (
                <Timeline
                  key={`d-${index}`}
                  annotation={annotation}
                  annotationIndex={index}
                  currentTime={currentTime}
                  duration={duration}
                  viewStart={viewStart}
                  viewEnd={viewEnd}
                  onSeek={(newTime) => videoRef.current && (videoRef.current.currentTime = newTime)}
                  updateAnnotationStart={(ai, ti, offset) => updateAnnotationStart(ai, ti, offset, true)}
                  updateAnnotationEnd={(ai, ti, offset) => updateAnnotationEnd(ai, ti, offset, true)}
                  handleDeleteTime={(ai, ti) => handleDeleteTime(ai, ti, true)}
                  handleDuplicateTime={(ai, ti) => handleDuplicateTime(ai, ti, true)}
                  onSlideAnnotation={(ai, ti, offset) => slideAnnotation(ai, ti, offset, true)}
                />
              ))}

              {categories.map((category, index) => (
                <CompositeTimeline
                  key={`cat-${index}`}
                  annotationCategory={category}
                  annotationCategoryIndex={index}
                  currentTime={currentTime}
                  duration={duration}
                  viewStart={viewStart}
                  viewEnd={viewEnd}
                  onSeek={(newTime) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = newTime;
                    }
                  }}
                  updateAnnotationStart={(categoryName, annotationName, timeIndex, newStart) =>
                    updateAnnotationStartInCategory(categoryName, annotationName, timeIndex, newStart)
                  }
                  updateAnnotationEnd={(categoryName, annotationName, timeIndex, newEnd) =>
                    updateAnnotationEndInCategory(categoryName, annotationName, timeIndex, newEnd)
                  }
                  handleDeleteTime={(categoryName, annotationName, timeIndex) =>
                    handleDeleteTimeInCategory(categoryName, annotationName, timeIndex)
                  }
                  handleDuplicateTime={(categoryName, annotationName, timeIndex) =>
                    handleDuplicateTimeInCategory(categoryName, annotationName, timeIndex)
                  }
                  onSlideAnnotation={(categoryName, annotationName, timeIndex, newStart) =>
                    slideAnnotationInCategory(categoryName, annotationName, timeIndex, newStart)
                  }
                />

              ))}
            </>


          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;


