import { useCallback, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../constants/theme';

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;
const HIT_SLOP = 12;

interface SliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  onValueChange: (value: number) => void;
}

export default function Slider({ value, minimumValue, maximumValue, onValueChange }: SliderProps) {
  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);

  const range = maximumValue - minimumValue;

  // Sync thumb position when value changes externally
  useEffect(() => {
    if (trackWidth.value > 0) {
      const normalized = (value - minimumValue) / range;
      thumbX.value = normalized * trackWidth.value;
    }
  }, [value, minimumValue, range, trackWidth, thumbX]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    trackWidth.value = width;
    const normalized = (value - minimumValue) / range;
    thumbX.value = normalized * width;
  }, [value, minimumValue, range, trackWidth, thumbX]);

  const emitValue = useCallback((x: number, width: number) => {
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / width));
    const val = minimumValue + ratio * range;
    onValueChange(Math.round(val * 100) / 100);
  }, [minimumValue, range, onValueChange]);

  const gesture = Gesture.Pan()
    .hitSlop({ top: HIT_SLOP, bottom: HIT_SLOP, left: 0, right: 0 })
    .onStart((e) => {
      'worklet';
      const x = Math.max(0, Math.min(e.x, trackWidth.value));
      thumbX.value = x;
      runOnJS(emitValue)(x, trackWidth.value);
    })
    .onUpdate((e) => {
      'worklet';
      const x = Math.max(0, Math.min(e.x, trackWidth.value));
      thumbX.value = x;
      runOnJS(emitValue)(x, trackWidth.value);
    })
    .minDistance(0)
    .activeOffsetX([-5, 5])
    .failOffsetY([-20, 20]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  // Center marker position for bipolar sliders
  const centerX = minimumValue < 0 ? ((0 - minimumValue) / range) * 100 : -1;

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container} onLayout={onLayout}>
        <View style={styles.track}>
          {centerX >= 0 && (
            <View style={[styles.centerMark, { left: `${centerX}%` }]} />
          )}
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE + HIT_SLOP * 2,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.surfaceLight,
    borderRadius: TRACK_HEIGHT / 2,
  },
  fill: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.accent,
    borderRadius: TRACK_HEIGHT / 2,
  },
  centerMark: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: TRACK_HEIGHT + 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
    marginLeft: -1,
  },
  thumb: {
    position: 'absolute',
    top: HIT_SLOP,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
