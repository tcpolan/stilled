import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { useFrameExtractor } from '../hooks/useFrameExtractor';
import { useFilterEngine } from '../hooks/useFilterEngine';
import { FilteredImage } from '../components/FilteredImage';
import { FilmStrip } from '../components/FilmStrip';
import { FilterBar } from '../components/FilterBar';
import { AdjustmentPanel } from '../components/AdjustmentPanel';
import { CropOverlay, CropRect } from '../components/CropOverlay';
import { SaveCelebration } from '../components/SaveCelebration';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius } from '../constants/theme';

type EditorTab = 'filters' | 'adjust' | 'crop';

export default function EditorScreen() {
  const { localUri, duration } = useLocalSearchParams<{ localUri: string; duration: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoUri = localUri ?? '';
  const durationSeconds = parseFloat(duration ?? '0');
  const durationMs = durationSeconds * 1000;

  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [activeTab, setActiveTab] = useState<EditorTab>('filters');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [flipH, setFlipH] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [previewLayout, setPreviewLayout] = useState({ width: 0, height: 0 });

  const handlePreviewLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPreviewLayout({ width, height });
  }, []);

  const { frames, loading: framesLoading, progress } = useFrameExtractor(videoUri, durationSeconds);
  const {
    selectedFilter,
    adjustments,
    selectFilter,
    setAdjustment,
    resetAdjustments,
    effectiveAdjustments,
  } = useFilterEngine();

  const currentFrame = (() => {
    if (frames.length === 0) return null;
    const ratio = durationMs > 0 ? currentTimestamp / durationMs : 0;
    const index = Math.min(Math.floor(ratio * frames.length), frames.length - 1);
    return frames[index] ?? null;
  })();
  const currentPreviewUri = currentFrame?.uri ?? null;
  const displayedTimestamp = currentFrame?.timestamp ?? currentTimestamp;

  const handleBack = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
      });
      if (result.canceled || result.assets.length === 0) {
        router.back();
        return;
      }
      const asset = result.assets[0];
      const dur = asset.duration ? asset.duration / 1000 : 0;
      router.replace({
        pathname: '/editor',
        params: { localUri: asset.uri, duration: String(dur) },
      });
    } catch {
      router.back();
    }
  }, [router]);

  const handleTimestampChange = useCallback((ts: number) => {
    setCurrentTimestamp(ts);
  }, []);

  const handleCropChange = useCallback((crop: CropRect) => {
    setCropRect(crop);
  }, []);

  const handleReset = useCallback(() => {
    resetAdjustments();
    setCropRect(null);
    setFlipH(false);
    setRotation(0);
  }, [resetAdjustments]);

  const handleFlip = useCallback(() => {
    setFlipH(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 0. Ensure media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setToast({ message: 'Photo library access is required to save', type: 'error' });
        setSaving(false);
        return;
      }

      // 1. Extract full-res frame at the same timestamp shown in preview
      const fullRes = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: Math.round(displayedTimestamp),
        quality: 1,
      });

      // 2. Build manipulation actions
      const actions: ImageManipulator.Action[] = [];

      // Apply rotation first
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Apply horizontal flip
      if (flipH) {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }

      // Apply crop — map from container space to image space (accounting for resizeMode="cover")
      if (cropRect && (cropRect.x > 0 || cropRect.y > 0 || cropRect.width < 1 || cropRect.height < 1)) {
        const isRotated90or270 = rotation === 90 || rotation === 270;
        const imgW = isRotated90or270 ? fullRes.height : fullRes.width;
        const imgH = isRotated90or270 ? fullRes.width : fullRes.height;

        const cw = previewLayout.width;
        const ch = previewLayout.height;

        if (cw > 0 && ch > 0) {
          // cover: image is scaled so the smaller axis fills the container
          const scale = Math.max(cw / imgW, ch / imgH);
          // Visible portion of the image in image-pixel coordinates
          const visibleW = cw / scale;
          const visibleH = ch / scale;
          // Offset: the hidden part on each side
          const offsetX = (imgW - visibleW) / 2;
          const offsetY = (imgH - visibleH) / 2;

          actions.push({
            crop: {
              originX: Math.round(offsetX + cropRect.x * visibleW),
              originY: Math.round(offsetY + cropRect.y * visibleH),
              width: Math.round(cropRect.width * visibleW),
              height: Math.round(cropRect.height * visibleH),
            },
          });
        }
      }

      // 3. Apply via image manipulator
      const result = await ImageManipulator.manipulateAsync(
        fullRes.uri,
        actions,
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      // 4. Save to camera roll
      await MediaLibrary.createAssetAsync(result.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCelebration(true);
    } catch (error) {
      console.error('Save failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

      {/* Frame preview with filter applied */}
      <View style={styles.previewContainer}>
        {currentPreviewUri ? (
          <View style={styles.previewWrapper} onLayout={handlePreviewLayout}>
            <FilteredImage
              uri={currentPreviewUri}
              adjustments={effectiveAdjustments}
              style={styles.previewImage}
              resizeMode="cover"
              flipH={flipH}
              rotation={rotation}
            />
            {activeTab === 'crop' && (
              <CropOverlay onCropChange={handleCropChange} />
            )}
          </View>
        ) : (
          <View style={styles.previewPlaceholder}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}
      </View>

      {/* Filmstrip */}
      <View style={styles.filmStripContainer}>
        <FilmStrip
          frames={frames}
          loading={framesLoading}
          progress={progress}
          currentTimestamp={currentTimestamp}
          durationMs={durationMs}
          onTimestampChange={handleTimestampChange}
          interactive={activeTab !== 'crop'}
        />
      </View>

      {/* Tab buttons */}
      <View style={styles.tabBar}>
        {(['filters', 'adjust', 'crop'] as EditorTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Controls area */}
      <View style={styles.controlsArea}>
        {activeTab === 'filters' && (
          <FilterBar
            videoUri={videoUri}
            currentTimestamp={currentTimestamp}
            selectedFilterId={selectedFilter.id}
            onSelectFilter={selectFilter}
          />
        )}
        {activeTab === 'adjust' && (
          <AdjustmentPanel
            adjustments={adjustments}
            onAdjustmentChange={setAdjustment}
          />
        )}
        {activeTab === 'crop' && (
          <View style={styles.cropControls}>
            <Pressable onPress={handleFlip} style={styles.cropButton}>
              <Text style={styles.cropButtonText}>↔ Flip</Text>
            </Pressable>
            <Pressable onPress={handleRotate} style={styles.cropButton}>
              <Text style={styles.cropButtonText}>↻ Rotate</Text>
            </Pressable>
          </View>
        )}
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
    paddingHorizontal: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  controlsArea: {
    minHeight: 100,
    paddingVertical: spacing.sm,
  },
  cropControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  cropButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  cropButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
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
});
