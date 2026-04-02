import { useRef, useState, useCallback, useEffect } from 'react';
// @ts-ignore
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

export const useFaceTracking = () => {
  const [isFaceModelLoaded, setIsFaceModelLoaded] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);

  useEffect(() => {
    let isActive = true;

    const initModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("/wasm");
        
        const faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
        });

        if (isActive) {
          faceDetectorRef.current = faceDetector;
          setIsFaceModelLoaded(true);
        }
      } catch (err: any) {
        if (isActive) {
          setFaceError(err.message || 'Error initializing FaceDetector');
        }
      }
    };

    initModel();

    return () => {
      isActive = false;
      if (faceDetectorRef.current) {
        faceDetectorRef.current.close().catch(() => {});
      }
    };
  }, []);

  const detectFaces = useCallback((videoElement: HTMLVideoElement, timestamp: number): any => {
    if (!faceDetectorRef.current) return null;
    try {
      return faceDetectorRef.current.detectForVideo(videoElement, timestamp);
    } catch (e) {
      console.error("Error during face detection", e);
      return null;
    }
  }, []);

  return { 
    isFaceModelLoaded, 
    detectFaces,
    faceError
  };
};
