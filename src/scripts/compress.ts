import { decodePhoto } from './card/photos';

// Shrinks a phone photo before upload: ~1440px on the long side, JPEG, usually 150–300 KB.
// Re-encoding through a canvas also throws away EXIF (GPS location, phone model, etc).

const MAX_SIDE = 1440;
const MAX_BYTES = 850 * 1024; // stays under the server's 900 KB limit

export interface Compressed {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

export async function compressPhoto(file: File): Promise<Compressed> {
  // decoded the right way up (EXIF rotation applied), with an older-Safari fallback
  const photo = await decodePhoto(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(photo.width, photo.height));
  const width = Math.round(photo.width * scale);
  const height = Math.round(photo.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(photo.source, 0, 0, width, height);
  photo.done();

  let blob: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.6, 0.5]) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob || blob.size > MAX_BYTES) throw new Error('ছবিটা ছোট করা গেল না — অন্য ছবি দিন।');

  return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
}
