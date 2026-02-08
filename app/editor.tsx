import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { lightImpact, successNotification, errorNotification } from '../utils/haptics';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { useFrameExtractor } from '../hooks/useFrameExtractor';
import { FilmStrip } from '../components/FilmStrip';
import { CropOverlay, CropRect } from '../components/CropOverlay';
import { SaveCelebration } from '../components/SaveCelebration';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius } from '../constants/theme';

const ICLOUD_DELAY_MS = 1500;

export default function EditorScreen() {
  const { localUri, duration } = useLocalSearchParams<{ localUri: string; duration: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoUri = localUri ?? '';
  const durationSeconds = parseFloat(duration ?? '0');
  const durationMs = durationSeconds * 1000;

  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [flipH, setFlipH] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [previewLayout, setPreviewLayout] = useState({ width: 0, height: 0 });
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const downloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pinch-to-zoom shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
    };
  }, []);

  const handlePreviewLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPreviewLayout({ width, height });
  }, []);

  const { frames, loading: framesLoading, progress } = useFrameExtractor(videoUri, durationSeconds);

  const currentFrame = (() => {
    if (frames.length === 0) return null;
    const ratio = durationMs > 0 ? currentTimestamp / durationMs : 0;
    const index = Math.min(Math.floor(ratio * frames.length), frames.length - 1);
    return frames[index] ?? null;
  })();
  const currentPreviewUri = currentFrame?.uri ?? null;
  const displayedTimestamp = currentFrame?.timestamp ?? currentTimestamp;

  const handleBack = useCallback(async () => {
    setDownloadingVideo(false);
    downloadTimerRef.current = setTimeout(() => {
      setDownloadingVideo(true);
    }, ICLOUD_DELAY_MS);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
      });
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      setDownloadingVideo(false);

      if (result.canceled || result.assets.length === 0) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
        return;
      }
      const asset = result.assets[0];
      const dur = asset.duration ? asset.duration / 1000 : 0;
      router.replace({
        pathname: '/editor',
        params: { localUri: asset.uri, duration: String(dur) },
      });
    } catch {
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      setDownloadingVideo(false);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  }, [router]);

  const handleTimestampChange = useCallback((ts: number) => {
    setCurrentTimestamp(ts);
  }, []);

  const handleCropChange = useCallback((crop: CropRect) => {
    setCropRect(crop);
  }, []);

  const handleReset = useCallback(() => {
    setCropRect(null);
    setFlipH(false);
    setRotation(0);
    setCropMode(false);
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const handleFlip = useCallback(() => {
    setFlipH(prev => !prev);
    lightImpact();
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
    lightImpact();
  }, []);

  const toggleCropMode = useCallback(() => {
    setCropMode(prev => {
      if (!prev) {
        // Entering crop mode — reset zoom
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
      return !prev;
    });
    lightImpact();
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // --- Pinch-to-zoom gestures (disabled in crop mode) ---
  const pinchGesture = Gesture.Pinch()
    .enabled(!cropMode)
    .onStart(() => {
      'worklet';
    })
    .onUpdate((e) => {
      'worklet';
      const next = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(next, 1), 5);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(!cropMode)
    .minPointers(2)
    .onStart(() => {
      'worklet';
    })
    .onUpdate((e) => {
      'worklet';
      if (scale.value <= 1) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .enabled(!cropMode)
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
      scale.value = withTiming(1);
      savedScale.value = 1;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const zoomPan = Gesture.Simultaneous(pinchGesture, panGesture);
  const composedGesture = Gesture.Race(doubleTap, zoomPan);

  const animatedPreviewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Build flip/rotation transform for the image
  const imageTransform: ({ rotate: string } | { scaleX: number })[] = [];
  if (rotation !== 0) {
    imageTransform.push({ rotate: `${rotation}deg` });
  }
  if (flipH) {
    imageTransform.push({ scaleX: -1 });
  }

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setToast({ message: 'Photo library access is required to save', type: 'error' });
        setSaving(false);
        return;
      }

      const fullRes = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: Math.round(displayedTimestamp),
        quality: 1,
      });

      const actions: ImageManipulator.Action[] = [];

      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      if (flipH) {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }

      // Map zoom + crop to image-space crop
      const s = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;
      const hasCrop = cropRect && (cropRect.x > 0 || cropRect.y > 0 || cropRect.width < 1 || cropRect.height < 1);
      const hasZoom = s > 1;

      if (hasCrop || hasZoom) {
        const isRotated90or270 = rotation === 90 || rotation === 270;
        const imgW = isRotated90or270 ? fullRes.height : fullRes.width;
        const imgH = isRotated90or270 ? fullRes.width : fullRes.height;

        const cw = previewLayout.width;
        const ch = previewLayout.height;

        if (cw > 0 && ch > 0) {
          const coverScale = Math.max(cw / imgW, ch / imgH);
          const visibleW = cw / coverScale;
          const visibleH = ch / coverScale;

          // Start with the cover-fit visible area
          let cropX = (imgW - visibleW) / 2;
          let cropY = (imgH - visibleH) / 2;
          let cropW = visibleW;
          let cropH = visibleH;

          // Apply zoom: viewport shrinks by 1/s, shifts by translate
          if (hasZoom) {
            const zoomW = visibleW / s;
            const zoomH = visibleH / s;
            cropX = cropX + (visibleW - zoomW) / 2 - tx / (s * coverScale);
            cropY = cropY + (visibleH - zoomH) / 2 - ty / (s * coverScale);
            cropW = zoomW;
            cropH = zoomH;
          }

          // Apply manual crop rect within the (possibly zoomed) area
          if (hasCrop && cropRect) {
            const subX = cropRect.x * cropW;
            const subY = cropRect.y * cropH;
            cropW = cropRect.width * cropW;
            cropH = cropRect.height * cropH;
            cropX = cropX + subX;
            cropY = cropY + subY;
          }

          // Clamp to image bounds
          cropX = Math.max(0, cropX);
          cropY = Math.max(0, cropY);
          cropW = Math.min(cropW, imgW - cropX);
          cropH = Math.min(cropH, imgH - cropY);

          actions.push({
            crop: {
              originX: Math.round(cropX),
              originY: Math.round(cropY),
              width: Math.round(cropW),
              height: Math.round(cropH),
            },
          });
        }
      }

      const result = await ImageManipulator.manipulateAsync(
        fullRes.uri,
        actions,
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      await MediaLibrary.createAssetAsync(result.uri);
      successNotification();
      setShowCelebration(true);
    } catch (error) {
      console.error('Save failed:', error);
      errorNotification();
      setToast({ message: 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [saving, videoUri, displayedTimestamp, cropRect, flipH, rotation, previewLayout]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={!!toast}
          onHide={() => setToast(null)}
        />
      )}

      <SaveCelebration
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} hitSlop={16}>
          <Text style={styles.backButton}>{'‹ Videos'}</Text>
        </Pressable>
        <Pressable onPress={handleReset} hitSlop={16}>
          <Text style={styles.resetButton}>Reset</Text>
        </Pressable>
      </View>

      {/* Frame preview with zoom + flip/rotation */}
      <View style={[styles.previewContainer, cropMode && styles.previewContainerCrop]}>
        {downloadingVideo ? (
          <View style={styles.previewPlaceholder}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.downloadingText}>Downloading from iCloud...</Text>
          </View>
        ) : currentPreviewUri ? (
          <GestureDetector gesture={composedGesture}>
            <Animated.View
              style={[styles.previewWrapper, animatedPreviewStyle]}
              onLayout={handlePreviewLayout}
            >
              <Image
                source={{ uri: currentPreviewUri }}
                style={[
                  styles.previewImage,
                  imageTransform.length > 0 ? { transform: imageTransform } : undefined,
                ]}
                resizeMode="cover"
              />
              {cropMode && (
                <CropOverlay onCropChange={handleCropChange} />
              )}
            </Animated.View>
          </GestureDetector>
        ) : (
          <View style={styles.previewPlaceholder}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}
      </View>

      {!downloadingVideo && (
        <>
          {/* Filmstrip */}
          <View style={styles.filmStripContainer}>
            <FilmStrip
              frames={frames}
              loading={framesLoading}
              progress={progress}
              currentTimestamp={currentTimestamp}
              durationMs={durationMs}
              onTimestampChange={handleTimestampChange}
              interactive={!cropMode}
            />
          </View>

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <Pressable
              onPress={toggleCropMode}
              style={[styles.toolButton, cropMode && styles.toolButtonActive]}
            >
              <Ionicons
                name="crop-outline"
                size={24}
                color={cropMode ? colors.background : colors.textPrimary}
              />
            </Pressable>
            <Pressable onPress={handleFlip} style={styles.toolButton}>
              <Ionicons name="swap-horizontal-outline" size={24} color={colors.textPrimary} />
            </Pressable>
            <Pressable onPress={handleRotate} style={styles.toolButton}>
              <Ionicons name="refresh-outline" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={saving || frames.length === 0}
            style={[styles.saveButton, (saving || frames.length === 0) && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.saveButtonText}>Save to Photos</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 44,
  },
  backButton: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '500',
  },
  resetButton: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  previewContainerCrop: {
    padding: spacing.xl,
  },
  previewWrapper: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filmStripContainer: {
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: {
    backgroundColor: colors.accent,
  },
  saveButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
  downloadingText: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: spacing.md,
  },
});
