import { useRef, useState, useCallback, useEffect } from 'react';
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export const useHandTracking = () => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let isActive = true;

    const initModel = async () => {
      try {
        console.log("Initializing MediaPipe Vision...");
        const vision = await FilesetResolver.forVisionTasks("/wasm");
        console.log("Vision initialized. Loading landmarker model...");
        
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2, // Supporting 2 hands
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isActive) {
          landmarkerRef.current = landmarker;
          setIsModelLoaded(true);
        }
      } catch (err: any) {
        if (isActive) {
          setError(err.message || 'Error initializing HandLandmarker');
        }
      }
    };

    initModel();

    return () => {
      isActive = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close().catch(() => {});
      }
    };
  }, []);

  const detectHands = useCallback((videoElement: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null => {
    if (!landmarkerRef.current) return null;
    try {
      return landmarkerRef.current.detectForVideo(videoElement, timestamp);
    } catch (e) {
      console.error("Error during hand detection", e);
      return null;
    }
  }, []);

  return { 
    isModelLoaded, 
    detectHands,
    error
  };
};
