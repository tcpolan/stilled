import { useState, useEffect, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { requestMediaLibraryPermission } from '../utils/permissions';

const PAGE_SIZE = 30;

interface UseVideoLibraryResult {
  videos: MediaLibrary.Asset[];
  loading: boolean;
  hasMore: boolean;
  permissionDenied: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useVideoLibrary(): UseVideoLibraryResult {
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);

  const fetchVideos = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const granted = await requestMediaLibraryPermission();
      if (!granted) {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.video,
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: PAGE_SIZE,
        after: cursor,
      });

      setVideos(prev => cursor ? [...prev, ...result.assets] : result.assets);
      setEndCursor(result.endCursor);
      setHasMore(result.hasNextPage);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && endCursor) {
      fetchVideos(endCursor);
    }
  }, [loading, hasMore, endCursor, fetchVideos]);

  const refresh = useCallback(() => {
    setVideos([]);
    setEndCursor(undefined);
    setHasMore(true);
    fetchVideos();
  }, [fetchVideos]);

  return { videos, loading, hasMore, permissionDenied, loadMore, refresh };
}
