import React, { useCallback, useState, useRef } from 'react';
import { View, Image, Text, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { lightImpact } from '../utils/haptics';
import { FrameData, THUMBNAIL_HEIGHT } from '../hooks/useFrameExtractor';
import { colors, spacing } from '../constants/theme';

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const FRAME_WIDTH = 44;
const FRAME_HEIGHT = THUMBNAIL_HEIGHT; // 60
const PLAYHEAD_WIDTH = 3;
const VISIBLE_BUFFER = 15; // render +-15 frames around center

interface FilmStripProps {
  frames: FrameData[];
  loading: boolean;
  progress: number;
  currentTimestamp: number;
  durationMs: number;
  onTimestampChange: (timestamp: number) => void;
  interactive?: boolean;
}

export const FilmStrip = React.memo(function FilmStrip({
  frames,
  loading,
  progress,
  currentTimestamp,
  durationMs,
  onTimestampChange,
  interactive = true,
}: FilmStripProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleCenter, setVisibleCenter] = useState(0);
  const lastFrameIndexRef = useRef(-1);
  const lastVisibleCenterRef = useRef(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const frameCount = frames.length;
  const totalContentWidth = frameCount * FRAME_WIDTH;
  const halfContainer = containerWidth / 2;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const triggerHaptic = useCallback(() => {
    lightImpact();
  }, []);

  // Called from scroll handler on JS thread — update timestamp + throttled visible range
  const onScrollJS = useCallback((offset: number) => {
    if (totalContentWidth <= 0 || durationMs <= 0) return;
    const ratio = Math.max(0, Math.min(offset / totalContentWidth, 1));
    const ts = ratio * durationMs;

    // Haptic on frame boundary crossing
    const frameIndex = Math.min(Math.floor(ratio * frameCount), frameCount - 1);
    if (frameIndex !== lastFrameIndexRef.current) {
      lastFrameIndexRef.current = frameIndex;
      triggerHaptic();
    }

    onTimestampChange(ts);

    // Throttle visible range updates: only update state when center shifts by 5+ frames
    const newCenter = Math.floor(offset / FRAME_WIDTH);
    if (Math.abs(newCenter - lastVisibleCenterRef.current) >= 5) {
      lastVisibleCenterRef.current = newCenter;
      setVisibleCenter(newCenter);
    }
  }, [totalContentWidth, durationMs, frameCount, triggerHaptic, onTimestampChange]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      runOnJS(onScrollJS)(event.contentOffset.x);
    },
  });

  // Compute visible window from internal scroll-based center
  const visibleStart = Math.max(0, visibleCenter - VISIBLE_BUFFER);
  const visibleEnd = Math.min(frameCount - 1, visibleCenter + VISIBLE_BUFFER);

  // Only create elements for the visible window
  const visibleFrames: React.ReactNode[] = [];
  for (let i = visibleStart; i <= visibleEnd && i < frameCount; i++) {
    const frame = frames[i];
    if (frame) {
      visibleFrames.push(
        <Image
          key={i}
          source={{ uri: frame.uri }}
          style={[styles.frame, { left: i * FRAME_WIDTH }]}
        />
      );
    } else {
      visibleFrames.push(
        <View
          key={i}
          style={[styles.framePlaceholder, { left: i * FRAME_WIDTH }]}
        />
      );
    }
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Text style={styles.timestamp}>
        {formatTime(currentTimestamp)} / {formatTime(durationMs)}
      </Text>
      {loading && frameCount === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={styles.stripWrapper}>
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            scrollEnabled={interactive}
            contentContainerStyle={{
              paddingHorizontal: halfContainer,
            }}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            <View style={[styles.framesRow, { width: totalContentWidth }]}>
              {visibleFrames}
            </View>
          </Animated.ScrollView>

          {/* Loading progress overlay */}
          {loading && (
            <View
              style={[
                styles.progressOverlay,
                { width: `${(1 - progress) * 100}%` },
              ]}
              pointerEvents="none"
            />
          )}

          {/* Centered playhead overlay */}
          <View style={[styles.playhead, { left: halfContainer - PLAYHEAD_WIDTH / 2 }]} pointerEvents="none" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    height: FRAME_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  stripWrapper: {
    height: FRAME_HEIGHT,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  framesRow: {
    height: FRAME_HEIGHT,
    position: 'relative',
  },
  frame: {
    position: 'absolute',
    top: 0,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    resizeMode: 'cover',
  },
  framePlaceholder: {
    position: 'absolute',
    top: 0,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    backgroundColor: colors.surface,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: PLAYHEAD_WIDTH,
    height: FRAME_HEIGHT,
    backgroundColor: colors.accent,
    borderRadius: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: FRAME_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
