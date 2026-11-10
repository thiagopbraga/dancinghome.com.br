// Câmera frontal em 640x480. A imagem nunca sai do aparelho.

export type CameraProblem = 'negada' | 'semCamera' | 'outro';

export class CameraError extends Error {
  constructor(
    readonly problem: CameraProblem,
    cause?: unknown,
  ) {
    super(`câmera: ${problem}`, { cause });
  }
}

export async function startCamera(video: HTMLVideoElement): Promise<number> {
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('semCamera');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    });
  } catch (err) {
    const name = (err as { name?: string }).name ?? '';
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('negada', err);
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new CameraError('semCamera', err);
    throw new CameraError('outro', err);
  }
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  if (!video.videoWidth) {
    await new Promise<void>((resolve) => {
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      setTimeout(resolve, 1500);
    });
  }
  return video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3;
}

export function stopCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject as MediaStream | null;
  stream?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
}
