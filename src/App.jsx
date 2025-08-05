import React, { useState, useRef } from "react";
import Navbar from "./components/Navbar";
import AnnotationPanel from "./components/AnnotationPanel";
import VideoUploader from "./components/VideoUploader";
import SidebarAnnotation from "./components/SidebarAnnotation";

import "./styles/App.css";
import Application from "../module_enregistrement/model/Application.js";

function App() {
  const [annotations, setAnnotations] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Création unique de l’instance Application
  const appRef = useRef(null);
  if (!appRef.current) {
    appRef.current = new Application();
  }

  const app = appRef.current;

  const [version, setVersion] = useState(0);

  const actualiser = () => {
    setVersion(v => v + 1);
  };

  const handleUndo = () => {
    if (app.canUndo()) {
      app.undo();
      setVersion(v => v + 1);
    }
  };

  const handleRedo = () => {
    if (app.canRedo()) {
      app.redo();
      setVersion(v => v + 1);
    }
  };

  return (
    <>
      <SidebarAnnotation
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      >
        <AnnotationPanel app = {app} handleRedo = {handleRedo} handleUndo = {handleUndo} setAnnotations={setAnnotations} annotations={annotations} />
      </SidebarAnnotation>

      <div className="flex flex-col flex-grow w-full">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="w-full flex flex-row gap-4 px-4 items-start">
          <VideoUploader annotations={annotations} app={app} handleRedo = {handleRedo} handleUndo = {handleUndo} actualiser = {actualiser}/>
        </main>
      </div>
    </>
  );
}

export default App;
