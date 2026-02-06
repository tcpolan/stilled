import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFrameExtractor } from '../hooks/useFrameExtractor';
import { useFilterEngine } from '../hooks/useFilterEngine';
import { extractAndSaveFrame } from '../utils/export';
import { FilmStrip } from '../components/FilmStrip';
import { FilterBar } from '../components/FilterBar';
import { AdjustmentPanel } from '../components/AdjustmentPanel';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius } from '../constants/theme';

type EditorTab = 'filters' | 'adjust';

export default function EditorScreen() {
  const { uri, duration } = useLocalSearchParams<{ uri: string; duration: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const videoUri = uri ?? '';
  const durationSeconds = parseFloat(duration ?? '0');
  const durationMs = durationSeconds * 1000;

  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('filters');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { frames, loading: framesLoading, progress } = useFrameExtractor(videoUri, durationSeconds);
  const {
    selectedFilter,
    adjustments,
    selectFilter,
    setAdjustment,
    resetAdjustments,
    effectiveAdjustments,
  } = useFilterEngine();

  // Use the nearest frame thumbnail as preview
  const currentPreviewUri = (() => {
    if (frames.length === 0) return null;
    const ratio = durationMs > 0 ? currentTimestamp / durationMs : 0;
    const index = Math.min(Math.floor(ratio * frames.length), frames.length - 1);
    return frames[index]?.uri ?? null;
  })();

  const handleTimestampChange = useCallback((ts: number) => {
    setCurrentTimestamp(ts);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await extractAndSaveFrame(videoUri, currentTimestamp, effectiveAdjustments);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToast({ message: 'Saved to Photos', type: 'success' });
    } catch (error) {
      console.error('Save failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setToast({ message: 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [videoUri, currentTimestamp, effectiveAdjustments, saving]);

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

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.backButton}>{'‹ Back'}</Text>
        </Pressable>
        <Pressable onPress={resetAdjustments} hitSlop={16}>
          <Text style={styles.resetButton}>Reset</Text>
        </Pressable>
      </View>

      {/* Frame preview */}
      <View style={styles.previewContainer}>
        {currentPreviewUri ? (
          <Image
            source={{ uri: currentPreviewUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
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
        />
      </View>

      {/* Tab buttons */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('filters')}
          style={[styles.tab, activeTab === 'filters' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'filters' && styles.tabTextActive]}>
            Filters
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('adjust')}
          style={[styles.tab, activeTab === 'adjust' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'adjust' && styles.tabTextActive]}>
            Adjust
          </Text>
        </Pressable>
      </View>

      {/* Controls area */}
      <View style={styles.controlsArea}>
        {activeTab === 'filters' ? (
          <FilterBar
            videoUri={videoUri}
            currentTimestamp={currentTimestamp}
            selectedFilterId={selectedFilter.id}
            onSelectFilter={selectFilter}
          />
        ) : (
          <AdjustmentPanel
            adjustments={adjustments}
            onAdjustmentChange={setAdjustment}
          />
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
