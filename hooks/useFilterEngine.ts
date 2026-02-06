import { useState, useCallback } from 'react';
import { AdjustmentValues, DEFAULT_ADJUSTMENTS, FilterPreset, FILTER_PRESETS } from '../utils/filters';

interface UseFilterEngineResult {
  selectedFilter: FilterPreset;
  adjustments: AdjustmentValues;
  selectFilter: (filter: FilterPreset) => void;
  setAdjustment: (key: keyof AdjustmentValues, value: number) => void;
  resetAdjustments: () => void;
  effectiveAdjustments: AdjustmentValues;
}

export function useFilterEngine(): UseFilterEngineResult {
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset>(FILTER_PRESETS[0]);
  const [adjustments, setAdjustments] = useState<AdjustmentValues>({ ...DEFAULT_ADJUSTMENTS });

  const selectFilter = useCallback((filter: FilterPreset) => {
    setSelectedFilter(filter);
  }, []);

  const setAdjustment = useCallback((key: keyof AdjustmentValues, value: number) => {
    setAdjustments(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetAdjustments = useCallback(() => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setSelectedFilter(FILTER_PRESETS[0]);
  }, []);

  // Combine filter preset adjustments with manual adjustments
  const effectiveAdjustments: AdjustmentValues = {
    brightness: clamp(selectedFilter.adjustments.brightness + adjustments.brightness, -1, 1),
    contrast: clamp(selectedFilter.adjustments.contrast + adjustments.contrast, -1, 1),
    saturation: clamp(selectedFilter.adjustments.saturation + adjustments.saturation, -1, 1),
  };

  return {
    selectedFilter,
    adjustments,
    selectFilter,
    setAdjustment,
    resetAdjustments,
    effectiveAdjustments,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
