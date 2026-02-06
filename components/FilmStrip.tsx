import { useCallback, useMemo } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FrameData, THUMBNAIL_HEIGHT } from '../hooks/useFrameExtractor';
import { colors, borderRadius } from '../constants/theme';

const INDICATOR_WIDTH = 3;
const FRAME_WIDTH = 2;

interface FilmStripProps {
  frames: FrameData[];
  loading: boolean;
  progress: number;
  currentTimestamp: number;
  durationMs: number;
  onTimestampChange: (timestamp: number) => void;
}

export function FilmStrip({
  frames,
  loading,
  progress,
  currentTimestamp,
  durationMs,
  onTimestampChange,
}: FilmStripProps) {
  const stripWidth = useSharedValue(0);
  const indicatorX = useSharedValue(0);
  const lastFrameIndex = useSharedValue(-1);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    stripWidth.value = e.nativeEvent.layout.width;
  }, [stripWidth]);

  const frameWidth = useMemo(() => {
    if (frames.length === 0) return FRAME_WIDTH;
    // We'll calculate this on layout
    return FRAME_WIDTH;
  }, [frames.length]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateTimestamp = useCallback((ts: number) => {
    onTimestampChange(ts);
  }, [onTimestampChange]);

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      const x = Math.max(0, Math.min(e.x, stripWidth.value));
      indicatorX.value = x;
      const ratio = x / stripWidth.value;
      const ts = ratio * durationMs;
      const frameIndex = Math.floor(ratio * frames.length);
      if (frameIndex !== lastFrameIndex.value) {
        lastFrameIndex.value = frameIndex;
        runOnJS(triggerHaptic)();
      }
      runOnJS(updateTimestamp)(ts);
    })
    .onUpdate((e) => {
      const x = Math.max(0, Math.min(e.x, stripWidth.value));
      indicatorX.value = x;
      const ratio = x / stripWidth.value;
      const ts = ratio * durationMs;
      const frameIndex = Math.floor(ratio * frames.length);
      if (frameIndex !== lastFrameIndex.value) {
        lastFrameIndex.value = frameIndex;
        runOnJS(triggerHaptic)();
      }
      runOnJS(updateTimestamp)(ts);
    })
    .minDistance(0);

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const x = Math.max(0, Math.min(e.x, stripWidth.value));
      indicatorX.value = withSpring(x, { damping: 20, stiffness: 300 });
      const ratio = x / stripWidth.value;
      const ts = ratio * durationMs;
      runOnJS(triggerHaptic)();
      runOnJS(updateTimestamp)(ts);
    });

  const composed = Gesture.Race(panGesture, tapGesture);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value - INDICATOR_WIDTH / 2 }],
  }));

  // Sync indicator position from external timestamp changes
  const currentRatio = durationMs > 0 ? currentTimestamp / durationMs : 0;

  return (
    <View style={styles.container}>
      {loading && frames.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <GestureDetector gesture={composed}>
          <Animated.View style={styles.strip} onLayout={onLayout}>
            <View style={styles.framesRow}>
              {frames.map((frame, index) => (
                <Image
                  key={index}
                  source={{ uri: frame.uri }}
                  style={[
                    styles.frame,
                    {
                      width: `${100 / frames.length}%`,
                      height: THUMBNAIL_HEIGHT,
                    },
                  ]}
                />
              ))}
            </View>
            <Animated.View style={[styles.indicator, indicatorStyle]} />
            {loading && (
              <View style={[styles.progressOverlay, { width: `${(1 - progress) * 100}%` }]} />
            )}
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMBNAIL_HEIGHT + 16,
    justifyContent: 'center',
  },
  loadingContainer: {
    height: THUMBNAIL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  strip: {
    height: THUMBNAIL_HEIGHT,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  framesRow: {
    flexDirection: 'row',
    height: THUMBNAIL_HEIGHT,
  },
  frame: {
    resizeMode: 'cover',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: INDICATOR_WIDTH,
    height: THUMBNAIL_HEIGHT,
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
    height: THUMBNAIL_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
