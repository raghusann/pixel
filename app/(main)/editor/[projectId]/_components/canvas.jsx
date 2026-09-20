import { useCanvas } from "@/context/context";
import { api } from "@/convex/_generated/api";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { Canvas, FabricImage } from "fabric";
import React, { useEffect, useRef, useState } from "react";

function CanvasEditor({ project }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const disposePromiseRef = useRef(null);
  const containerRef = useRef(null);

  const { canvasEditor, setCanvasEditor, activeTool, onToolChange } =
    useCanvas();

  const [isLoading, setIsLoading] = useState(true);

  const { mutate: updateProject } = useConvexMutation(
    api.projects.updateProject,
  );

  const calculateViewportScale = () => {
    if (!containerRef.current || !project) return 1;

    const container = containerRef.current;

    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;

    const scaleX = containerWidth / project.width;
    const scaleY = containerHeight / project.height;

    return Math.min(scaleX, scaleY, 1);
  };

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !project) return;

    let cancelled = false;
    let canvas = null;

    const initializeCanvas = async () => {
      setIsLoading(true);

      /*
       * Wait until the previous Fabric canvas has completely
       * finished disposing.
       */
      if (disposePromiseRef.current) {
        try {
          await disposePromiseRef.current;
        } catch (error) {
          console.error("Error disposing previous canvas:", error);
        }

        disposePromiseRef.current = null;
      }

      /*
       * The effect may have been cleaned up while we were waiting.
       */
      if (cancelled || !canvasRef.current) return;

      /*
       * Don't initialize the same HTML canvas twice.
       */
      if (fabricCanvasRef.current) {
        return;
      }

      const viewportScale = calculateViewportScale();

      canvas = new Canvas(canvasRef.current, {
        width: project.width,
        height: project.height,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
        controlsAboveOverlay: true,
        selection: true,
        hoverCursor: "move",
        moveCursor: "move",
        defaultCursor: "default",
        allowTouchScrolling: false,
        renderOnAddRemove: true,
        skipTargetFind: false,
      });

      fabricCanvasRef.current = canvas;

      /*
       * Scale the visible canvas according to the editor container.
       */
      canvas.setDimensions(
        {
          width: project.width * viewportScale,
          height: project.height * viewportScale,
        },
        { backstoreOnly: false },
      );

      canvas.setZoom(viewportScale);

      /*
       * Load project image.
       */
      if (project.currentImageUrl || project.originalImageUrl) {
        try {
          const imageUrl = project.currentImageUrl || project.originalImageUrl;

          const fabricImage = await FabricImage.fromURL(imageUrl, {
            crossOrigin: "anonymous",
          });

          /*
           * Stop if this effect has already been cleaned up.
           */
          if (cancelled) {
            fabricImage.dispose?.();
            return;
          }

          const imgAspectRatio = fabricImage.width / fabricImage.height;

          const canvasAspectRatio = project.width / project.height;

          let scaleX;
          let scaleY;

          if (imgAspectRatio > canvasAspectRatio) {
            scaleX = project.width / fabricImage.width;
            scaleY = scaleX;
          } else {
            scaleY = project.height / fabricImage.height;
            scaleX = scaleY;
          }

          fabricImage.set({
            left: project.width / 2,
            top: project.height / 2,
            originX: "center",
            originY: "center",
            scaleX,
            scaleY,
            selectable: true,
            evented: true,
          });

          canvas.add(fabricImage);
          canvas.centerObject(fabricImage);
        } catch (error) {
          if (!cancelled) {
            console.error("Error loading project image:", error);
          }
        }
      }

      /*
       * Load saved canvas state.
       */
      if (project.canvasState && !cancelled) {
        try {
          await canvas.loadFromJSON(project.canvasState);

          if (!cancelled) {
            canvas.requestRenderAll();
          }
        } catch (error) {
          if (!cancelled) {
            console.error("Error loading canvas state:", error);
          }
        }
      }

      /*
       * Don't update React state if this initialization
       * has already been cancelled.
       */
      if (cancelled) return;

      canvas.calcOffset();
      canvas.requestRenderAll();

      setCanvasEditor(canvas);
      setIsLoading(false);

      /*
       * Workaround for initial resize issues.
       */
      setTimeout(() => {
        if (!cancelled) {
          window.dispatchEvent(new Event("resize"));
        }
      }, 500);
    };

    initializeCanvas();

    /*
     * Cleanup.
     */
    return () => {
      cancelled = true;

      if (canvas) {
        const canvasToDispose = canvas;

        /*
         * Fabric's dispose can be asynchronous.
         * Store the promise so the next initialization waits
         * for it to finish.
         */
        disposePromiseRef.current = Promise.resolve(
          canvasToDispose.dispose(),
        ).catch((error) => {
          console.error("Error disposing canvas:", error);
        });

        canvas = null;

        /*
         * Only clear the ref if this is still the active canvas.
         */
        if (fabricCanvasRef.current === canvasToDispose) {
          fabricCanvasRef.current = null;
          setCanvasEditor(null);
        }
      }
    };
  }, [project]);

  /*
   * Save canvas state.
   */
  const saveCanvasState = async () => {
    if (!canvasEditor || !project) return;

    try {
      const canvasJSON = canvasEditor.toJSON();

      await updateProject({
        projectId: project._id,
        canvasState: canvasJSON,
      });
    } catch (error) {
      console.error("Error saving canvas state:", error);
    }
  };

  /*
   * Automatically save canvas changes.
   */
  useEffect(() => {
    if (!canvasEditor) return;

    let saveTimeout;

    const handleCanvasChange = () => {
      clearTimeout(saveTimeout);

      saveTimeout = setTimeout(() => {
        saveCanvasState();
      }, 2000);
    };

    canvasEditor.on("object:modified", handleCanvasChange);
    canvasEditor.on("object:added", handleCanvasChange);
    canvasEditor.on("object:removed", handleCanvasChange);

    return () => {
      clearTimeout(saveTimeout);

      canvasEditor.off("object:modified", handleCanvasChange);
      canvasEditor.off("object:added", handleCanvasChange);
      canvasEditor.off("object:removed", handleCanvasChange);
    };
  }, [canvasEditor]);

  /*
   * Change cursor depending on the active tool.
   */
  useEffect(() => {
    if (!canvasEditor) return;

    switch (activeTool) {
      case "crop":
        canvasEditor.defaultCursor = "crosshair";
        canvasEditor.hoverCursor = "crosshair";
        break;

      default:
        canvasEditor.defaultCursor = "default";
        canvasEditor.hoverCursor = "move";
    }
  }, [canvasEditor, activeTool]);

  /*
   * Handle window resizing.
   */
  useEffect(() => {
    const handleResize = () => {
      if (!canvasEditor || !project) return;

      const newScale = calculateViewportScale();

      canvasEditor.setDimensions(
        {
          width: project.width * newScale,
          height: project.height * newScale,
        },
        { backstoreOnly: false },
      );

      canvasEditor.setZoom(newScale);
      canvasEditor.calcOffset();
      canvasEditor.requestRenderAll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [canvasEditor, project]);

  /*
   * Automatically switch to text tool when text is selected.
   */
  useEffect(() => {
    if (!canvasEditor || !onToolChange) return;

    const handleSelection = (e) => {
      const selectedObject = e.selected?.[0];

      if (selectedObject && selectedObject.type === "i-text") {
        onToolChange("text");
      }
    };

    canvasEditor.on("selection:created", handleSelection);
    canvasEditor.on("selection:updated", handleSelection);

    return () => {
      canvasEditor.off("selection:created", handleSelection);
      canvasEditor.off("selection:updated", handleSelection);
    };
  }, [canvasEditor, onToolChange]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center bg-secondary w-full h-full overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #64748b 25%, transparent 25%),
            linear-gradient(-45deg, #64748b 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #64748b 75%),
            linear-gradient(-45deg, transparent 75%, #64748b 75%)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>

            <p className="text-white/70 text-sm">Loading canvas...</p>
          </div>
        </div>
      )}

      <div className="px-5">
        <canvas id="canvas" className="border" ref={canvasRef} />
      </div>
    </div>
  );
}

export default CanvasEditor;
