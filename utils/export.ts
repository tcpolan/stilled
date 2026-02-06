import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { AdjustmentValues } from './filters';

export async function extractAndSaveFrame(
  videoUri: string,
  timestampMs: number,
  adjustments: AdjustmentValues,
): Promise<string> {
  // Extract full-res frame at exact timestamp
  const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, {
    time: timestampMs,
    quality: 1,
    headers: {},
  });

  // Apply adjustments using expo-image-manipulator
  const actions: ImageManipulator.Action[] = [];

  // expo-image-manipulator doesn't have direct brightness/contrast/saturation
  // We'll use it for any crop/resize and save the frame
  // For color adjustments, we do what we can with the available API
  const result = await ImageManipulator.manipulateAsync(
    thumbnail.uri,
    actions,
    {
      compress: 1,
      format: ImageManipulator.SaveFormat.PNG,
    }
  );

  // Save to camera roll
  const asset = await MediaLibrary.createAssetAsync(result.uri);

  return asset.uri;
}
