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
  const fa = selectedFilter.adjustments;
  const ma = adjustments;

  // exposure maps to additive brightness (×0.5)
  const exposureBrightness = (ma.exposure ?? 0) * 0.5;
  // highlights maps to additive brightness (×0.2)
  const highlightsBrightness = (ma.highlights ?? 0) * 0.2;
  // shadows maps to additive contrast (×0.3)
  const shadowsContrast = (ma.shadows ?? 0) * 0.3;

  // warmth: positive → sepia + positive hue rotation; negative → negative hue rotation (cool)
  const warmthVal = ma.warmth ?? 0;
  const warmthSepia = warmthVal > 0 ? warmthVal * 0.5 : 0;
  const warmthHueRotate = warmthVal * 30; // ±30° at full

  const effectiveAdjustments: AdjustmentValues = {
    brightness: clamp(
      (fa.brightness ?? 0) + ma.brightness + exposureBrightness + highlightsBrightness,
      -1, 1,
    ),
    contrast: clamp(
      (fa.contrast ?? 0) + ma.contrast + shadowsContrast,
      -1, 1,
    ),
    saturation: clamp(
      (fa.saturation ?? 0) + ma.saturation,
      -1, 1,
    ),
    sepia: clamp((fa.sepia ?? 0) + warmthSepia, 0, 1),
    hueRotate: (fa.hueRotate ?? 0) + warmthHueRotate,
    vignette: clamp(ma.vignette ?? 0, 0, 1),
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
