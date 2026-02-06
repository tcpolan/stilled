import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useVideoLibrary } from '../hooks/useVideoLibrary';
import { VideoCell, GAP, COLUMNS } from '../components/VideoCell';
import { colors, spacing } from '../constants/theme';

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { videos, loading, hasMore, permissionDenied, loadMore, refresh } = useVideoLibrary();

  const handleVideoPress = (asset: MediaLibrary.Asset) => {
    router.push({ pathname: '/editor', params: { uri: asset.uri, duration: asset.duration } });
  };

  if (permissionDenied) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Photo Library Access Required</Text>
        <Text style={styles.subtitle}>
          Still needs access to your photo library to browse videos. Please grant permission in Settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Still</Text>
      </View>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <VideoCell asset={item} onPress={handleVideoPress} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={loading && videos.length === 0}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.subtitle}>No videos found</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && videos.length > 0 ? (
            <ActivityIndicator color={colors.accent} style={styles.footer} />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '700',
  },
  row: {
    gap: GAP,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: spacing.md,
  },
});
