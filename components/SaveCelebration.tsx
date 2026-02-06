import { useEffect } from 'react';
import { Pressable, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 18;
const CONFETTI_COLORS = [colors.accent, '#FFFFFF', '#B0B0B0', '#FF6B35', '#FFD700'];

interface SaveCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function ConfettiPiece({ index }: { index: number }) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const startX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;
  const endX = startX + (Math.random() - 0.5) * 100;
  const size = 6 + Math.random() * 6;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const delay = 200 + Math.random() * 400;
  const duration = 1500 + Math.random() * 1000;
  const isCircle = index % 3 === 0;

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(SCREEN_HEIGHT * 0.7, {
      duration,
      easing: Easing.in(Easing.quad),
    }));
    translateX.value = withDelay(delay, withTiming(endX - startX, {
      duration,
      easing: Easing.inOut(Easing.sin),
    }));
    rotate.value = withDelay(delay, withTiming(360 * (1 + Math.random() * 2), {
      duration,
      easing: Easing.linear,
    }));
    opacity.value = withDelay(delay + duration * 0.7, withTiming(0, { duration: duration * 0.3 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.15,
          left: SCREEN_WIDTH / 2 + startX,
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: isCircle ? size / 2 : 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export function SaveCelebration({ visible, onDismiss }: SaveCelebrationProps) {
  const overlayOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const checkStroke = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      checkScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 200 }));
      checkStroke.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
      textOpacity.value = withDelay(700, withTiming(1, { duration: 300 }));
      textScale.value = withDelay(700, withSpring(1, { damping: 10, stiffness: 200 }));

      // Auto-dismiss after 2.5s
      const timer = setTimeout(() => {
        dismiss();
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      overlayOpacity.value = 0;
      checkScale.value = 0;
      checkStroke.value = 0;
      textOpacity.value = 0;
      textScale.value = 0.5;
    }
  }, [visible]);

  const dismiss = () => {
    overlayOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)();
    });
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const checkContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Pressable style={styles.pressable} onPress={dismiss}>
        {/* Confetti */}
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}

        {/* Checkmark circle */}
        <Animated.View style={[styles.checkContainer, checkContainerStyle]}>
          <Svg width={80} height={80} viewBox="0 0 80 80">
            <Path
              d="M 20 42 L 34 56 L 60 28"
              stroke={colors.accent}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* "Saved!" text */}
        <Animated.Text style={[styles.savedText, textStyle]}>
          Saved!
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 2000,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  savedText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
  },
});
