import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { api, getAccessToken } from '@/api/client';
import type { Me, Scan, Upload } from '@/api/types';

/** Longest side sent to the vision model; larger images cost more without helping accuracy. */
const MAX_SIDE = 1568;

/** Profile photos are only ever shown small. */
const AVATAR_SIDE = 512;

type Photo = { uri: string; width: number; height: number };

/** Downscales a photo to JPEG so uploads are small and within the 5 MB limit. */
async function prepare({ uri, width, height }: Photo, maxSide: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > maxSide) {
    context.resize(width >= height ? { width: maxSide, height: null } : { width: null, height: maxSide });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return result.uri;
}

/** Uploads a prepared JPEG to a fresh storage key and returns that key. */
async function uploadJpeg(uri: string, kind: 'scans' | 'avatars'): Promise<string> {
  const upload = await api<Upload>('/api/uploads/presign', {
    method: 'POST',
    body: { contentType: 'image/jpeg', kind },
  });

  const token = getAccessToken();
  const result = await new File(uri).upload(upload.url, {
    httpMethod: upload.method,
    headers: {
      ...upload.headers,
      ...(upload.requiresAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    mimeType: 'image/jpeg',
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Photo upload failed (${result.status})`);
  }
  return upload.key;
}

/**
 * Resizes, uploads and starts analysis of a meal photo. Returns the new scan
 * id; the scan screen polls it until the result is ready.
 */
export async function startScan(photo: Photo): Promise<number> {
  const key = await uploadJpeg(await prepare(photo, MAX_SIDE), 'scans');
  const scan = await api<Scan>('/api/scans', { method: 'POST', body: { imageKey: key } });
  return scan.id;
}

/** Resizes and uploads a (square-cropped) photo, then makes it the profile photo. */
export async function uploadAvatar(photo: Photo): Promise<Me> {
  const key = await uploadJpeg(await prepare(photo, AVATAR_SIDE), 'avatars');
  return api<Me>('/api/me/avatar', { method: 'PUT', body: { imageKey: key } });
}
