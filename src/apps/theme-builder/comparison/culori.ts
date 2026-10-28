import { converter, formatHex, modeLrgb, modeOklab, modeOklch, modeRgb, toGamut, useMode, wcagContrast } from "culori/fn";
import { ColorAdapter, inSrgbGamut } from "./recipe";

useMode(modeRgb);
useMode(modeLrgb);
useMode(modeOklab);
useMode(modeOklch);

const toOklch = converter("oklch");
const toRgb = converter("rgb");
const perceptual = toGamut("rgb", "oklch");
const strict = toGamut("rgb", "oklch", null);

export const culoriAdapter: ColorAdapter = {
  name: "Culori",
  toOklch: hex => {
    const color = toOklch(hex);
    if (!color) throw new Error(`Culori could not parse ${hex}.`);
    if (color.h === undefined && color.c >= 0.000001) throw new Error("Culori returned invalid OKLCH coordinates.");
    return { l: color.l, c: color.c, h: color.h ?? 0 };
  },
  toHex: (color, mapping) => {
    const mapped = (mapping === "strict" ? strict : perceptual)({ mode: "oklch", ...color });
    const hex = formatHex(mapped);
    if (!hex) throw new Error("Culori could not serialize a generated color.");
    return hex.toLowerCase();
  },
  inGamut: color => {
    const { r, g, b } = toRgb({ mode: "oklch", ...color });
    return inSrgbGamut([r, g, b]);
  },
  contrast: wcagContrast
};
