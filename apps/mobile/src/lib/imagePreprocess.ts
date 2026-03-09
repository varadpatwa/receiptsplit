/**
 * Preprocess receipt images before upload:
 * - Resize to max 1536px on longest side (good for GPT-4o Vision, keeps detail)
 * - Compress to JPEG at 0.7 quality
 * - Returns local file URI ready for upload
 */

import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1536;
const COMPRESS_QUALITY = 0.7;

export interface PreprocessResult {
  uri: string;
  width: number;
  height: number;
}

export async function preprocessReceiptImage(uri: string): Promise<PreprocessResult> {
  // First pass: get dimensions by doing a no-op manipulation
  const probe = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });

  const { width, height } = probe;
  const actions: ImageManipulator.Action[] = [];

  // Resize if either dimension exceeds MAX_DIMENSION
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      actions.push({ resize: { width: MAX_DIMENSION } });
    } else {
      actions.push({ resize: { height: MAX_DIMENSION } });
    }
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    format: ImageManipulator.SaveFormat.JPEG,
    compress: COMPRESS_QUALITY,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}
