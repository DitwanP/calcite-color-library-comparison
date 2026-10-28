import { createThemeCss } from "../helpers/theme-css";

export type ComparisonMode = "light" | "dark";
export type MappingMethod = "perceptual" | "strict";

export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

export interface ColorAdapter {
  name: string;
  toOklch: (hex: string) => OklchColor;
  toHex: (color: OklchColor, mapping: MappingMethod) => string;
  inGamut: (color: OklchColor) => boolean;
  contrast: (foreground: string, background: string) => number;
}

export const inSrgbGamut = (channels: number[]): boolean => {
  if (channels.length !== 3 || !channels.every(Number.isFinite)) {
    throw new Error("The color library returned invalid sRGB coordinates.");
  }
  // Ignore conversion roundoff at gamut edges, including across JS runtimes.
  return channels.every(channel => channel >= -0.0000001 && channel <= 1.0000001);
};

export const SAMPLE_SEEDS = [
  { label: "Calcite blue", value: "#007ac2" },
  { label: "Purple", value: "#6633cc" },
  { label: "Yellow", value: "#ffff00" },
  { label: "Cyan", value: "#00ffff" },
  { label: "Red", value: "#ff0000" },
  { label: "Gray", value: "#808080" },
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" }
];

export const normalizeSeed = (value: string): string => {
  const hex = value.trim().toLowerCase();
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(hex)) {
    throw new Error("Enter an opaque HEX color such as #007ac2 or #abc.");
  }
  return hex.length === 4
    ? `#${hex
        .slice(1)
        .split("")
        .map(channel => channel + channel)
        .join("")}`
    : hex;
};

export const normalizeOklch = ({ l, c, h }: OklchColor): OklchColor => {
  if (!Number.isFinite(l) || !Number.isFinite(c) || (c >= 0.000001 && !Number.isFinite(h))) {
    throw new Error("The color library returned invalid OKLCH coordinates.");
  }
  // Achromatic seeds have no meaningful hue; suppress conversion roundoff.
  return c < 0.000001 ? { l, c: 0, h: 0 } : { l, c, h };
};

const clampLightness = (lightness: number): number => Math.max(0, Math.min(1, lightness));

export const generateComparison = (adapter: ColorAdapter, input: string, mode: ComparisonMode, mapping: MappingMethod) => {
  const seed = normalizeSeed(input);
  const source = normalizeOklch(adapter.toOklch(seed));
  const dark = mode === "dark";
  const brand = (offset: number): OklchColor => ({ ...source, l: clampLightness(source.l + offset) });
  const neutral = (l: number): OklchColor => ({ l, c: Math.min(source.c * 0.08, 0.02), h: source.h });
  const candidates: Record<string, OklchColor> = {
    "--calcite-color-brand": brand(0),
    "--calcite-color-brand-hover": brand(dark ? 0.08 : -0.08),
    "--calcite-color-brand-press": brand(dark ? 0.16 : -0.16),
    "--calcite-color-surface-1": neutral(dark ? 0.16 : 0.98),
    "--calcite-color-surface-2": neutral(dark ? 0.22 : 0.95),
    "--calcite-color-surface-highlight": { l: dark ? 0.3 : 0.9, c: Math.min(source.c, 0.06), h: source.h },
    "--calcite-color-text-1": neutral(dark ? 0.94 : 0.2),
    "--calcite-color-text-inverse": { l: dark ? 0 : 1, c: 0, h: 0 },
    "--calcite-color-text-link": brand(dark ? 0.08 : -0.08),
    "--calcite-color-border-input": neutral(dark ? 0.65 : 0.6),
    "--calcite-color-focus": brand(0)
  };
  const tokens = Object.fromEntries(Object.entries(candidates).map(([token, color]) => [token, adapter.toHex(color, mapping)]));
  const pairs: [string, string, number][] = [
    ["text-1", "surface-1", 4.5],
    ["text-1", "surface-2", 4.5],
    ["text-inverse", "brand", 4.5],
    ["text-inverse", "brand-hover", 4.5],
    ["text-inverse", "brand-press", 4.5],
    ["text-link", "surface-1", 4.5],
    ["border-input", "surface-2", 3],
    ["focus", "surface-2", 3]
  ];
  const contrastChecks = pairs.map(([foreground, background, target]) => {
    const ratio = adapter.contrast(tokens[`--calcite-color-${foreground}`], tokens[`--calcite-color-${background}`]);
    if (!Number.isFinite(ratio)) throw new Error(`${adapter.name} returned an invalid contrast ratio.`);
    return { foreground, background, target, ratio, passes: ratio >= target };
  });
  return {
    seed,
    source,
    tokens,
    contrastChecks,
    mappedTokens: Object.keys(candidates).filter(token => !adapter.inGamut(candidates[token])),
    css: createThemeCss(tokens, mode)
  };
};

export type ComparisonResult = ReturnType<typeof generateComparison>;
