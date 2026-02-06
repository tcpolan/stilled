import { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../constants/theme';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  type?: 'success' | 'error';
}

export function Toast({ message, visible, onHide, type = 'success' }: ToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      // Auto-hide after 2.5s
      opacity.value = withDelay(2500, withTiming(0, { duration: 300 }, () => {
        runOnJS(onHide)();
      }));
      translateY.value = withDelay(2500, withTiming(-20, { duration: 300 }));
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-20, { duration: 200 });
    }
  }, [visible, opacity, translateY, onHide]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible && opacity.value === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        type === 'error' ? styles.error : styles.success,
        animatedStyle,
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
  success: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
