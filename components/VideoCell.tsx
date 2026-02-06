import { memo } from 'react';
import { View, Image, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { colors, borderRadius, spacing } from '../constants/theme';

const COLUMNS = 3;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;

interface VideoCellProps {
  asset: MediaLibrary.Asset;
  onPress: (asset: MediaLibrary.Asset) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function VideoCellComponent({ asset, onPress }: VideoCellProps) {
  return (
    <Pressable onPress={() => onPress(asset)} style={styles.container}>
      <Image source={{ uri: asset.uri }} style={styles.thumbnail} />
      <View style={styles.durationBadge}>
        <Text style={styles.durationText}>{formatDuration(asset.duration)}</Text>
      </View>
    </Pressable>
  );
}

export const VideoCell = memo(VideoCellComponent);
export { CELL_SIZE, GAP, COLUMNS };

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: colors.surface,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  durationText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
