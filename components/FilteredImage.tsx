import { View, Image, ImageStyle, StyleProp } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { AdjustmentValues } from '../utils/filters';

interface FilteredImageProps {
  uri: string;
  adjustments: AdjustmentValues;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  flipH?: boolean;
  rotation?: number; // 0, 90, 180, 270
}

/**
 * Build a React Native `filter` style from adjustment values.
 * RN filter values: brightness(1)=normal, contrast(1)=normal, saturate(1)=normal
 * Our values: -1 to 1 where 0 is neutral -> map to 0..2 where 1 is neutral
 */
export function buildFilterStyle(adj: AdjustmentValues): { filter: any[] } | undefined {
  const filters: any[] = [];

  filters.push({ brightness: adj.brightness + 1 });
  filters.push({ contrast: adj.contrast + 1 });
  filters.push({ saturate: adj.saturation + 1 });

  if (adj.saturation < 0) {
    filters.push({ grayscale: Math.abs(adj.saturation) });
  }

  if (adj.sepia && adj.sepia > 0) {
    filters.push({ sepia: adj.sepia });
  }

  if (adj.hueRotate && adj.hueRotate !== 0) {
    filters.push({ 'hue-rotate': `${adj.hueRotate}deg` });
  }

  return { filter: filters };
}

export function FilteredImage({
  uri,
  adjustments,
  style,
  resizeMode = 'cover',
  flipH = false,
  rotation = 0,
}: FilteredImageProps) {
  const filterStyle = buildFilterStyle(adjustments);
  const vignetteAmount = adjustments.vignette ?? 0;

  const transform: any[] = [];
  if (rotation !== 0) {
    transform.push({ rotate: `${rotation}deg` });
  }
  if (flipH) {
    transform.push({ scaleX: -1 });
  }

  return (
    <View style={[style as any, filterStyle as any, transform.length > 0 ? { transform } : undefined]}>
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={resizeMode}
      />
      {vignetteAmount > 0 && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="vignette" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0.4" stopColor="black" stopOpacity={0} />
                <Stop offset="1" stopColor="black" stopOpacity={vignetteAmount * 0.8} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#vignette)" />
          </Svg>
        </View>
      )}
    </View>
  );
}
