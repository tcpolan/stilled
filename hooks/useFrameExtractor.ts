import { useState, useEffect, useRef } from 'react';
import * as VideoThumbnails from 'expo-video-thumbnails';

const THUMBNAIL_COUNT = 40;
const THUMBNAIL_HEIGHT = 60;

interface FrameData {
  uri: string;
  timestamp: number;
}

interface UseFrameExtractorResult {
  frames: FrameData[];
  loading: boolean;
  progress: number;
}

export function useFrameExtractor(videoUri: string, durationSeconds: number): UseFrameExtractorResult {
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    setFrames([]);
    setLoading(true);
    setProgress(0);

    const durationMs = durationSeconds * 1000;
    const count = Math.min(THUMBNAIL_COUNT, Math.max(20, Math.floor(durationSeconds * 10)));
    const interval = durationMs / count;

    async function extract() {
      if (!videoUri) {
        setLoading(false);
        return;
      }
      console.log('Frame extraction starting:', { videoUri, durationSeconds, count });
      const results: FrameData[] = [];

      // Extract a single preview frame immediately so the user sees something fast
      try {
        const preview = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 0,
          quality: 0.3,
        });
        if (!abortRef.current) {
          results.push({ uri: preview.uri, timestamp: 0 });
          setFrames([...results]);
        }
      } catch (err) {
        console.warn('Preview frame extraction failed:', err);
      }

      const batchSize = 5;

      for (let i = 0; i < count; i += batchSize) {
        if (abortRef.current) return;

        const batch = Array.from(
          { length: Math.min(batchSize, count - i) },
          (_, j) => {
            const timestamp = (i + j) * interval;
            return VideoThumbnails.getThumbnailAsync(videoUri, {
              time: Math.round(timestamp),
              quality: 0.3,
            }).then(result => ({
              uri: result.uri,
              timestamp,
            })).catch((err) => {
              console.warn('Thumbnail extraction failed at', timestamp, err);
              return null;
            });
          }
        );

        const batchResults = await Promise.all(batch);
        for (const r of batchResults) {
          if (r) results.push(r);
        }

        if (!abortRef.current) {
          setFrames([...results]);
          setProgress((i + batchSize) / count);
        }
      }

      if (!abortRef.current) {
        setLoading(false);
        setProgress(1);
      }
    }

    extract();

    return () => {
      abortRef.current = true;
    };
  }, [videoUri, durationSeconds]);

  return { frames, loading, progress };
}

export { THUMBNAIL_HEIGHT };
export type { FrameData };
