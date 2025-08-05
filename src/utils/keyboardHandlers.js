// src/utils/keyboardHandlers.js

export function registerKeyHandler(app, videoRef, annotationsMap) {
  const handler = (event) => {
    const key = event.key.toLowerCase();
    const annotation = annotationsMap.get(key);

    if (!annotation) return;

    const currentTime = videoRef.current?.currentTime;
    if (currentTime == null) return;

    if (annotation.type === "discrète") {
      app.addAnnotationInstantanée(annotation.name, currentTime);
    } else {
      // ici, tu pourras gérer le début de l'annotation continue plus tard
      console.warn("Annotations continues non encore gérées");
    }
  };

  window.addEventListener("keydown", handler);

  return () => {
    window.removeEventListener("keydown", handler);
  };
}
