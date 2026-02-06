import { useEffect, useState, memo } from 'react';
import { View, Image, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { FilterPreset, FILTER_PRESETS } from '../utils/filters';
import { buildFilterStyle } from './FilteredImage';
import { colors, spacing, borderRadius } from '../constants/theme';

const FILTER_THUMB_SIZE = 64;

interface FilterBarProps {
  videoUri: string;
  currentTimestamp: number;
  selectedFilterId: string;
  onSelectFilter: (filter: FilterPreset) => void;
}

function FilterBarComponent({ videoUri, currentTimestamp, selectedFilterId, onSelectFilter }: FilterBarProps) {
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    VideoThumbnails.getThumbnailAsync(videoUri, {
      time: Math.round(currentTimestamp),
      quality: 0.4,
    }).then(result => {
      if (!cancelled) setThumbUri(result.uri);
    }).catch((err) => {
      console.warn('FilterBar thumbnail failed:', err);
    });

    return () => { cancelled = true; };
  }, [videoUri, Math.floor(currentTimestamp / 500) * 500]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {FILTER_PRESETS.map((filter) => {
        const isSelected = filter.id === selectedFilterId;
        const filterViewStyle = buildFilterStyle(filter.adjustments);

        return (
          <Pressable
            key={filter.id}
            onPress={() => onSelectFilter(filter)}
            style={styles.filterItem}
          >
            <View style={[styles.thumbContainer, isSelected && styles.thumbSelected]}>
              {thumbUri ? (
                <View style={[styles.thumb, filterViewStyle as any]}>
                  <Image
                    source={{ uri: thumbUri }}
                    style={styles.thumbImage}
                  />
                </View>
              ) : (
                <View style={styles.thumbPlaceholder} />
              )}
            </View>
            <Text style={[styles.filterName, isSelected && styles.filterNameSelected]}>
              {filter.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const FilterBar = memo(FilterBarComponent);

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterItem: {
    alignItems: 'center',
    width: FILTER_THUMB_SIZE + 8,
  },
  thumbContainer: {
    width: FILTER_THUMB_SIZE,
    height: FILTER_THUMB_SIZE,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbSelected: {
    borderColor: colors.accent,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  filterName: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  filterNameSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
});
