import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleChooseVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const duration = asset.duration ? asset.duration / 1000 : 0;

      router.push({
        pathname: '/editor',
        params: { localUri: asset.uri, duration: String(duration) },
      });
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Still</Text>
        <Text style={styles.subtitle}>Extract beautiful stills from your videos</Text>
      </View>
      <Pressable onPress={handleChooseVideo} style={styles.button}>
        <Text style={styles.buttonText}>Choose Video</Text>
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
  button: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});
