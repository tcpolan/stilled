import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Toast } from '../components/Toast';
import { colors, spacing, borderRadius } from '../constants/theme';

const ICLOUD_DELAY_MS = 1500;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChooseVideo = async () => {
    if (loading) return;
    setLoading(true);
    setDownloading(false);

    timerRef.current = setTimeout(() => {
      setDownloading(true);
    }, ICLOUD_DELAY_MS);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
      });

      if (timerRef.current) clearTimeout(timerRef.current);

      if (result.canceled || result.assets.length === 0) {
        // Check if the user denied permission (picker returns canceled in that case too)
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status === 'denied') {
          setToast({
            message: 'Photo library access is needed to select videos. Tap here to open Settings.',
            type: 'error',
          });
          Linking.openSettings();
        }
        setLoading(false);
        setDownloading(false);
        return;
      }

      const asset = result.assets[0];
      const duration = asset.duration ? asset.duration / 1000 : 0;

      router.push({
        pathname: '/editor',
        params: { localUri: asset.uri, duration: String(duration) },
      });
    } catch (e) {
      console.warn('Image picker error:', e);
      const isICloud = String(e).includes('3164');
      setToast({
        message: isICloud
          ? 'Could not download video from iCloud. Please ensure it is downloaded first.'
          : 'Failed to load video',
        type: 'error',
      });
    } finally {
      if (timerRef.current) clearTimeout(timerRef.current);
      setLoading(false);
      setDownloading(false);
    }
  };

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
      <View style={styles.content}>
        <Text style={styles.title}>Stilled</Text>
        <Text style={styles.subtitle}>Capture the perfect still from your video</Text>
      </View>

      {downloading && (
        <View style={styles.downloadingContainer}>
          <ActivityIndicator color={colors.accent} size="small" />
          <Text style={styles.downloadingText}>Downloading from iCloud...</Text>
        </View>
      )}

      <Pressable
        onPress={handleChooseVideo}
        disabled={loading}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>Choose Video</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 48,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
  },
  downloadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  downloadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});
