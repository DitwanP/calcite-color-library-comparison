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

const rgbaFromHex = (hex: string, alpha: number): string => {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  return `rgba(${channels.join(", ")}, ${alpha})`;
};

const contrastPairs: [string, string, number][] = [
  ["text-1", "surface-2", 4.5],
  ["text-1", "surface-3", 4.5],
  ["text-inverse", "brand", 4.5],
  ["text-inverse", "brand-hover", 4.5],
  ["text-inverse", "brand-press", 4.5],
  ["text-link", "surface-1", 4.5],
  ["border-input", "surface-3", 3],
  ["status-danger", "surface-3", 3]
];

export const measureContrastChecks = (adapter: ColorAdapter, tokens: Record<string, string>) =>
  contrastPairs.map(([foreground, background, target]) => {
    const ratio = adapter.contrast(tokens[`--calcite-color-${foreground}`], tokens[`--calcite-color-${background}`]);
    if (!Number.isFinite(ratio)) throw new Error(`${adapter.name} returned an invalid contrast ratio.`);
    return { foreground, background, target, ratio, passes: ratio >= target };
  });

export const findOutOfGamutTokens = (adapter: ColorAdapter, tokens: Record<string, string>) =>
  Object.entries(tokens)
    .filter(([, value]) => !adapter.inGamut(adapter.toOklch(value)))
    .map(([token]) => token);

export const generateComparison = (adapter: ColorAdapter, input: string, mode: ComparisonMode, mapping: MappingMethod) => {
  const seed = normalizeSeed(input);
  const source = normalizeOklch(adapter.toOklch(seed));
  const dark = mode === "dark";
  const brand = (offset: number): OklchColor => ({ ...source, l: clampLightness(source.l + offset) });
  const neutral = (l: number): OklchColor => ({ l, c: Math.min(source.c * 0.08, 0.02), h: source.h });
  const statusColor = (hue: number, offset: number): OklchColor => ({ l: (dark ? 0.62 : 0.56) + offset, c: 0.16, h: hue });
  const accentSurface: OklchColor = { l: dark ? 0.3 : 0.9, c: Math.min(source.c, 0.06), h: source.h };
  const colors: Record<string, OklchColor | string> = {
    "--calcite-color-background-none": "rgba(255, 255, 255, 0)",
    "--calcite-color-border-1": neutral(dark ? 0.42 : 0.8),
    "--calcite-color-border-2": neutral(dark ? 0.36 : 0.84),
    "--calcite-color-border-3": neutral(dark ? 0.3 : 0.88),
    "--calcite-color-border-ghost": "rgba(0, 0, 0, 0.3)",
    "--calcite-color-border-input": neutral(dark ? 0.65 : 0.6),
    "--calcite-color-border-white": neutral(1),
    "--calcite-color-brand": brand(0),
    "--calcite-color-brand-hover": brand(dark ? 0.08 : -0.08),
    "--calcite-color-brand-press": brand(dark ? 0.16 : -0.16),
    "--calcite-color-brand-underline": rgbaFromHex(adapter.toHex(brand(0), mapping), 0.4),
    "--calcite-color-inverse": neutral(dark ? 0.94 : 0.22),
    "--calcite-color-inverse-hover": neutral(dark ? 0.98 : 0.16),
    "--calcite-color-inverse-press": neutral(dark ? 1 : 0.1),
    "--calcite-color-status-danger": statusColor(25, 0),
    "--calcite-color-status-danger-hover": statusColor(25, dark ? 0.08 : -0.06),
    "--calcite-color-status-danger-press": statusColor(25, dark ? 0.14 : -0.12),
    "--calcite-color-status-info": statusColor(240, 0),
    "--calcite-color-status-info-hover": statusColor(240, dark ? 0.08 : -0.06),
    "--calcite-color-status-info-press": statusColor(240, dark ? 0.14 : -0.12),
    "--calcite-color-status-success": statusColor(145, 0),
    "--calcite-color-status-success-hover": statusColor(145, dark ? 0.08 : -0.06),
    "--calcite-color-status-success-press": statusColor(145, dark ? 0.14 : -0.12),
    "--calcite-color-status-warning": statusColor(80, 0),
    "--calcite-color-status-warning-hover": statusColor(80, dark ? 0.08 : -0.06),
    "--calcite-color-status-warning-press": statusColor(80, dark ? 0.14 : -0.12),
    "--calcite-color-surface-1": neutral(dark ? 0.1 : 0.97),
    "--calcite-color-surface-2": neutral(dark ? 0.16 : 0.98),
    "--calcite-color-surface-3": neutral(dark ? 0.22 : 0.95),
    "--calcite-color-surface-4": neutral(dark ? 0.28 : 0.91),
    "--calcite-color-surface-highlight": accentSurface,
    "--calcite-color-text-1": neutral(dark ? 0.94 : 0.2),
    "--calcite-color-text-2": neutral(dark ? 0.78 : 0.34),
    "--calcite-color-text-3": neutral(dark ? 0.64 : 0.5),
    "--calcite-color-text-highlight": brand(dark ? 0.2 : -0.2),
    "--calcite-color-text-inverse": neutral(dark ? 0.04 : 0.98),
    "--calcite-color-text-link": brand(dark ? 0.08 : -0.08),
    "--calcite-color-transparent": "rgba(0, 0, 0, 0)",
    "--calcite-color-transparent-hover": "rgba(0, 0, 0, 0.04)",
    "--calcite-color-transparent-inverse-hover": "rgba(255, 255, 255, 0.12)",
    "--calcite-color-transparent-inverse-press": "rgba(255, 255, 255, 0.16)",
    "--calcite-color-transparent-press": "rgba(0, 0, 0, 0.08)",
    "--calcite-color-transparent-scrim": "rgba(255, 255, 255, 0.85)",
    "--calcite-color-transparent-tint": "rgba(255, 255, 255, 0.8)"
  };
  const tokens = Object.fromEntries(
    Object.entries(colors).map(([token, color]) => [
      token,
      token === "--calcite-color-brand" ? seed : typeof color === "string" ? color : adapter.toHex(color, mapping)
    ])
  );
  const contrastChecks = measureContrastChecks(adapter, tokens);
  return {
    seed,
    source,
    tokens,
    contrastChecks,
    mappedTokens: Object.entries(colors)
      .filter(([, color]) => typeof color !== "string" && !adapter.inGamut(color))
      .map(([token]) => token),
    css: createThemeCss(tokens, mode)
  };
};

export type ComparisonResult = ReturnType<typeof generateComparison>;
