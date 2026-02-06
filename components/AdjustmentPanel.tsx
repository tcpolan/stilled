import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Slider from './Slider';
import { AdjustmentValues } from '../utils/filters';
import { colors, spacing } from '../constants/theme';

interface AdjustmentPanelProps {
  adjustments: AdjustmentValues;
  onAdjustmentChange: (key: keyof AdjustmentValues, value: number) => void;
}

const SLIDERS: { key: keyof AdjustmentValues; label: string; min: number; max: number }[] = [
  { key: 'brightness', label: 'Brightness', min: -1, max: 1 },
  { key: 'contrast', label: 'Contrast', min: -1, max: 1 },
  { key: 'saturation', label: 'Saturation', min: -1, max: 1 },
  { key: 'exposure', label: 'Exposure', min: -1, max: 1 },
  { key: 'highlights', label: 'Highlights', min: -1, max: 1 },
  { key: 'shadows', label: 'Shadows', min: -1, max: 1 },
  { key: 'warmth', label: 'Warmth', min: -1, max: 1 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 1 },
];

export function AdjustmentPanel({ adjustments, onAdjustmentChange }: AdjustmentPanelProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {SLIDERS.map(({ key, label, min, max }) => (
        <AdjustmentRow
          key={key}
          label={label}
          value={adjustments[key] ?? 0}
          min={min}
          max={max}
          onChange={(v) => onAdjustmentChange(key, v)}
        />
      ))}
    </ScrollView>
  );
}

interface AdjustmentRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function AdjustmentRow({ label, value, min, max, onChange }: AdjustmentRowProps) {
  const displayValue = Math.round(value * 100);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.sliderContainer}>
        <Slider
          value={value}
          minimumValue={min}
          maximumValue={max}
          onValueChange={onChange}
        />
      </View>
      <Text style={styles.value}>{displayValue > 0 ? `+${displayValue}` : displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 200,
  },
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    width: 80,
  },
  sliderContainer: {
    flex: 1,
  },
  value: {
    color: colors.textSecondary,
    fontSize: 13,
    width: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
