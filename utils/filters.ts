export interface FilterPreset {
  id: string;
  name: string;
  adjustments: AdjustmentValues;
}

export interface AdjustmentValues {
  brightness: number;   // -1 to 1, default 0
  contrast: number;     // -1 to 1, default 0
  saturation: number;   // -1 to 1, default 0
}

export const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'none',
    name: 'Original',
    adjustments: { brightness: 0, contrast: 0, saturation: 0 },
  },
  {
    id: 'vivid',
    name: 'Vivid',
    adjustments: { brightness: 0.05, contrast: 0.2, saturation: 0.4 },
  },
  {
    id: 'mono',
    name: 'Mono',
    adjustments: { brightness: 0.05, contrast: 0.1, saturation: -1 },
  },
  {
    id: 'warm',
    name: 'Warm',
    adjustments: { brightness: 0.08, contrast: 0.05, saturation: 0.15 },
  },
  {
    id: 'cool',
    name: 'Cool',
    adjustments: { brightness: 0, contrast: 0.1, saturation: -0.2 },
  },
  {
    id: 'fade',
    name: 'Fade',
    adjustments: { brightness: 0.15, contrast: -0.2, saturation: -0.15 },
  },
  {
    id: 'noir',
    name: 'Noir',
    adjustments: { brightness: -0.05, contrast: 0.35, saturation: -1 },
  },
];
