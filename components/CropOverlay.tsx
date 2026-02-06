import { useCallback } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../constants/theme';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropOverlayProps {
  onCropChange: (crop: CropRect) => void;
}

// Mode constants for worklet use
const MODE_NONE = 0;
const MODE_LEFT = 1;
const MODE_RIGHT = 2;
const MODE_TOP = 3;
const MODE_BOTTOM = 4;
const MODE_LEFT_TOP = 5;
const MODE_LEFT_BOTTOM = 6;
const MODE_RIGHT_TOP = 7;
const MODE_RIGHT_BOTTOM = 8;
const MODE_MOVE = 9;

export function CropOverlay({ onCropChange }: CropOverlayProps) {
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);

  // Crop edges as fractions 0..1
  const left = useSharedValue(0);
  const top = useSharedValue(0);
  const right = useSharedValue(1);
  const bottom = useSharedValue(1);

  // Gesture mode and start positions (all on UI thread)
  const mode = useSharedValue(MODE_NONE);
  const startLeft = useSharedValue(0);
  const startTop = useSharedValue(0);
  const startRight = useSharedValue(1);
  const startBottom = useSharedValue(1);

  const emitCrop = useCallback((l: number, t: number, r: number, b: number) => {
    onCropChange({
      x: l,
      y: t,
      width: r - l,
      height: b - t,
    });
  }, [onCropChange]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    containerWidth.value = e.nativeEvent.layout.width;
    containerHeight.value = e.nativeEvent.layout.height;
  }, [containerWidth, containerHeight]);

  const MIN_SIZE = 0.1; // Minimum 10% of image
  const EDGE_THRESHOLD = 0.08; // Distance from edge to count as "near edge"

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      'worklet';
      const nx = e.x / containerWidth.value;
      const ny = e.y / containerHeight.value;

      // Save start positions
      startLeft.value = left.value;
      startTop.value = top.value;
      startRight.value = right.value;
      startBottom.value = bottom.value;

      // Distances to each edge
      const dLeft = Math.abs(nx - left.value);
      const dRight = Math.abs(nx - right.value);
      const dTop = Math.abs(ny - top.value);
      const dBottom = Math.abs(ny - bottom.value);

      const nearLeft = dLeft < EDGE_THRESHOLD;
      const nearRight = dRight < EDGE_THRESHOLD;
      const nearTop = dTop < EDGE_THRESHOLD;
      const nearBottom = dBottom < EDGE_THRESHOLD;

      // Check if inside the crop area
      const insideH = nx > left.value + EDGE_THRESHOLD && nx < right.value - EDGE_THRESHOLD;
      const insideV = ny > top.value + EDGE_THRESHOLD && ny < bottom.value - EDGE_THRESHOLD;

      // Corner detection
      if (nearLeft && nearTop) {
        mode.value = MODE_LEFT_TOP;
      } else if (nearLeft && nearBottom) {
        mode.value = MODE_LEFT_BOTTOM;
      } else if (nearRight && nearTop) {
        mode.value = MODE_RIGHT_TOP;
      } else if (nearRight && nearBottom) {
        mode.value = MODE_RIGHT_BOTTOM;
      } else if (nearLeft) {
        mode.value = MODE_LEFT;
      } else if (nearRight) {
        mode.value = MODE_RIGHT;
      } else if (nearTop) {
        mode.value = MODE_TOP;
      } else if (nearBottom) {
        mode.value = MODE_BOTTOM;
      } else if (insideH && insideV) {
        // Inside crop area and far from edges → move mode
        mode.value = MODE_MOVE;
      } else {
        // Outside or ambiguous — fall back to closest edge
        const minH = Math.min(dLeft, dRight);
        const minV = Math.min(dTop, dBottom);
        if (minH < minV) {
          mode.value = dLeft < dRight ? MODE_LEFT : MODE_RIGHT;
        } else {
          mode.value = dTop < dBottom ? MODE_TOP : MODE_BOTTOM;
        }
      }
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.translationX / containerWidth.value;
      const dy = e.translationY / containerHeight.value;
      const m = mode.value;

      if (m === MODE_MOVE) {
        // Move entire crop box
        const cropW = startRight.value - startLeft.value;
        const cropH = startBottom.value - startTop.value;

        // Clamp translation so box stays in bounds
        const clampedDx = Math.max(-startLeft.value, Math.min(1 - startRight.value, dx));
        const clampedDy = Math.max(-startTop.value, Math.min(1 - startBottom.value, dy));

        left.value = startLeft.value + clampedDx;
        right.value = startRight.value + clampedDx;
        top.value = startTop.value + clampedDy;
        bottom.value = startBottom.value + clampedDy;
      } else {
        // Edge/corner modes: use translation from start positions
        if (m === MODE_LEFT || m === MODE_LEFT_TOP || m === MODE_LEFT_BOTTOM) {
          left.value = Math.max(0, Math.min(startLeft.value + dx, right.value - MIN_SIZE));
        }
        if (m === MODE_RIGHT || m === MODE_RIGHT_TOP || m === MODE_RIGHT_BOTTOM) {
          right.value = Math.min(1, Math.max(startRight.value + dx, left.value + MIN_SIZE));
        }
        if (m === MODE_TOP || m === MODE_LEFT_TOP || m === MODE_RIGHT_TOP) {
          top.value = Math.max(0, Math.min(startTop.value + dy, bottom.value - MIN_SIZE));
        }
        if (m === MODE_BOTTOM || m === MODE_LEFT_BOTTOM || m === MODE_RIGHT_BOTTOM) {
          bottom.value = Math.min(1, Math.max(startBottom.value + dy, top.value + MIN_SIZE));
        }
      }
    })
    .onEnd(() => {
      'worklet';
      runOnJS(emitCrop)(left.value, top.value, right.value, bottom.value);
      mode.value = MODE_NONE;
    })
    .minDistance(0);

  const topOverlay = useAnimatedStyle(() => ({
    height: `${top.value * 100}%`,
  }));

  const bottomOverlay = useAnimatedStyle(() => ({
    height: `${(1 - bottom.value) * 100}%`,
  }));

  const leftOverlay = useAnimatedStyle(() => ({
    top: `${top.value * 100}%`,
    height: `${(bottom.value - top.value) * 100}%`,
    width: `${left.value * 100}%`,
  }));

  const rightOverlay = useAnimatedStyle(() => ({
    top: `${top.value * 100}%`,
    height: `${(bottom.value - top.value) * 100}%`,
    width: `${(1 - right.value) * 100}%`,
  }));

  const cropBorder = useAnimatedStyle(() => ({
    left: `${left.value * 100}%`,
    top: `${top.value * 100}%`,
    width: `${(right.value - left.value) * 100}%`,
    height: `${(bottom.value - top.value) * 100}%`,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container} onLayout={onLayout}>
        {/* Dark overlays on cropped areas */}
        <Animated.View style={[styles.overlay, styles.topOverlay, topOverlay]} />
        <Animated.View style={[styles.overlay, styles.bottomOverlay, bottomOverlay]} />
        <Animated.View style={[styles.overlay, styles.leftOverlay, leftOverlay]} />
        <Animated.View style={[styles.overlay, styles.rightOverlay, rightOverlay]} />

        {/* Crop border */}
        <Animated.View style={[styles.cropBorder, cropBorder]}>
          {/* Corner handles */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const CORNER_SIZE = 20;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topOverlay: {
    top: 0,
    left: 0,
    right: 0,
  },
  bottomOverlay: {
    bottom: 0,
    left: 0,
    right: 0,
  },
  leftOverlay: {
    left: 0,
    position: 'absolute',
  },
  rightOverlay: {
    right: 0,
    position: 'absolute',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.textPrimary,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.textPrimary,
  },
  cornerTL: {
    top: -CORNER_THICKNESS,
    left: -CORNER_THICKNESS,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: -CORNER_THICKNESS,
    right: -CORNER_THICKNESS,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: -CORNER_THICKNESS,
    left: -CORNER_THICKNESS,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: -CORNER_THICKNESS,
    right: -CORNER_THICKNESS,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
});
