import { View, Text, StyleSheet } from 'react-native';
import Slider from './Slider';
import { AdjustmentValues } from '../utils/filters';
import { colors, spacing } from '../constants/theme';

interface AdjustmentPanelProps {
  adjustments: AdjustmentValues;
  onAdjustmentChange: (key: keyof AdjustmentValues, value: number) => void;
}

export function AdjustmentPanel({ adjustments, onAdjustmentChange }: AdjustmentPanelProps) {
  return (
    <View style={styles.container}>
      <AdjustmentRow
        label="Brightness"
        value={adjustments.brightness}
        onChange={(v) => onAdjustmentChange('brightness', v)}
      />
      <AdjustmentRow
        label="Contrast"
        value={adjustments.contrast}
        onChange={(v) => onAdjustmentChange('contrast', v)}
      />
      <AdjustmentRow
        label="Saturation"
        value={adjustments.saturation}
        onChange={(v) => onAdjustmentChange('saturation', v)}
      />
    </View>
  );
}

interface AdjustmentRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function AdjustmentRow({ label, value, onChange }: AdjustmentRowProps) {
  const displayValue = Math.round(value * 100);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.sliderContainer}>
        <Slider
          value={value}
          minimumValue={-1}
          maximumValue={1}
          onValueChange={onChange}
        />
      </View>
      <Text style={styles.value}>{displayValue > 0 ? `+${displayValue}` : displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
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
