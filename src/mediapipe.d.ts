declare module '@mediapipe/tasks-vision' {
  export class FilesetResolver {
    static forVisionTasks(url: string): Promise<any>;
  }
  export class HandLandmarker {
    static HAND_CONNECTIONS: any;
    static createFromOptions(vision: any, options: any): Promise<HandLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestamp: number): any;
    close(): Promise<void>;
  }
  export interface HandLandmarkerResult {
    landmarks: any[];
  }
  export class DrawingUtils {
    constructor(ctx: CanvasRenderingContext2D);
    drawConnectors(landmarks: any, connections: any, options: any): void;
    drawLandmarks(landmarks: any, options: any): void;
  }
}
