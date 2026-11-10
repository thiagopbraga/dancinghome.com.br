// Fonte de pose pela câmera: MediaPipe Pose Landmarker, com GPU e recuo para CPU.
// A pose simulada (SimulatedPoseSource) fica em simPose.ts e só entra no servidor de desenvolvimento.
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { startCamera, stopCamera } from './camera';
import type { Landmark, PoseFrame, PoseSource } from './types';

export type { PoseSource } from './types';

export interface MediaPipeOptions {
  model: 'lite' | 'full';
  numPoses: number;
}

export class MediaPipePoseSource implements PoseSource {
  aspect = 4 / 3;
  delegate: 'GPU' | 'CPU' = 'GPU';
  private landmarker: PoseLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;
  private lastStamp = 0;

  constructor(private readonly opts: MediaPipeOptions) {}

  async start(video?: HTMLVideoElement): Promise<void> {
    if (!video) throw new Error('MediaPipePoseSource precisa do elemento de vídeo');
    this.video = video;
    this.aspect = await startCamera(video);
    const vision = await import('@mediapipe/tasks-vision');
    const base = import.meta.env.BASE_URL;
    const fileset = await vision.FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
    const create = (delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> =>
      vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: `${base}mediapipe/pose_landmarker_${this.opts.model}.task`,
          delegate,
        },
        runningMode: 'VIDEO',
        numPoses: this.opts.numPoses,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    try {
      this.landmarker = await create('GPU');
      this.delegate = 'GPU';
    } catch (err) {
      console.warn('MediaPipe sem GPU, usando CPU', err);
      this.landmarker = await create('CPU');
      this.delegate = 'CPU';
    }
  }

  next(t: number): PoseFrame | null {
    const video = this.video;
    if (!this.landmarker || !video || video.readyState < 2) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;
    // O MediaPipe exige carimbos de tempo sempre crescentes.
    const stamp = Math.max(performance.now(), this.lastStamp + 1);
    this.lastStamp = stamp;
    const result = this.landmarker.detectForVideo(video, stamp);
    const people: Landmark[][] = result.landmarks.map((person) =>
      person.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 })),
    );
    return { t, people };
  }

  stop(): void {
    this.landmarker?.close();
    this.landmarker = null;
    if (this.video) stopCamera(this.video);
    this.video = null;
  }
}
