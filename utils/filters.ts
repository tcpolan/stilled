export interface FilterPreset {
  id: string;
  name: string;
  adjustments: AdjustmentValues;
}

export interface AdjustmentValues {
  brightness: number;   // -1 to 1, default 0
  contrast: number;     // -1 to 1, default 0
  saturation: number;   // -1 to 1, default 0
  exposure?: number;    // -1 to 1, default 0
  highlights?: number;  // -1 to 1, default 0
  shadows?: number;     // -1 to 1, default 0
  warmth?: number;      // -1 to 1, default 0
  vignette?: number;    // 0 to 1, default 0
  sepia?: number;       // 0 to 1 (filter presets only)
  hueRotate?: number;   // degrees (filter presets only)
}

export const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  warmth: 0,
  vignette: 0,
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
    adjustments: { brightness: 0.15, contrast: 0.5, saturation: 0.8 },
  },
  {
    id: 'vivid-warm',
    name: 'Vivid Warm',
    adjustments: { brightness: 0.2, contrast: 0.5, saturation: 0.7, sepia: 0.35, hueRotate: 15 },
  },
  {
    id: 'vivid-cool',
    name: 'Vivid Cool',
    adjustments: { brightness: 0.1, contrast: 0.5, saturation: 0.8, hueRotate: -20 },
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    adjustments: { brightness: -0.15, contrast: 0.7, saturation: 0.2 },
  },
  {
    id: 'dramatic-warm',
    name: 'Dramatic Warm',
    adjustments: { brightness: -0.1, contrast: 0.7, saturation: 0.1, sepia: 0.4, hueRotate: 10 },
  },
  {
    id: 'dramatic-cool',
    name: 'Dramatic Cool',
    adjustments: { brightness: -0.2, contrast: 0.7, saturation: -0.2, hueRotate: -25 },
  },
  {
    id: 'mono',
    name: 'Mono',
    adjustments: { brightness: 0.05, contrast: 0.2, saturation: -1 },
  },
  {
    id: 'silvertone',
    name: 'Silvertone',
    adjustments: { brightness: 0.25, contrast: -0.1, saturation: -1 },
  },
  {
    id: 'noir',
    name: 'Noir',
    adjustments: { brightness: -0.2, contrast: 0.8, saturation: -1 },
  },
];
