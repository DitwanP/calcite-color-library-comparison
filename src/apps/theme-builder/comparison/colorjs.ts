import { ColorSpace, OKLCH, sRGB, contrastWCAG21, serialize, to, toGamut } from "colorjs.io/fn";
import { PlainColorObject } from "colorjs.io/fn";
import { ColorAdapter, OklchColor, inSrgbGamut } from "./recipe";

ColorSpace.register(sRGB);
ColorSpace.register(OKLCH);

const asColor = ({ l, c, h }: OklchColor): PlainColorObject => ({ space: OKLCH, coords: [l, c, h], alpha: 1 });
const asNumbers = (coords: (number | null)[]): number[] => {
  if (!coords.every((value): value is number => value !== null && Number.isFinite(value))) {
    throw new Error("Color.js returned invalid sRGB coordinates.");
  }
  return coords;
};

export const colorjsAdapter: ColorAdapter = {
  name: "Color.js",
  toOklch: hex => {
    const { coords } = to(hex, OKLCH);
    const [l, c, h] = coords;
    if (l === null || c === null || !Number.isFinite(l) || !Number.isFinite(c)) {
      throw new Error("Color.js returned invalid OKLCH coordinates.");
    }
    if (h === null && c >= 0.000001) throw new Error("Color.js returned invalid OKLCH coordinates.");
    return { l, c, h: h ?? 0 };
  },
  toHex: (color, mapping) => {
    // toGamut mutates its argument; each call receives a fresh object.
    const mapped = toGamut(asColor(color), {
      space: "srgb",
      method: mapping === "strict" ? "oklch.c" : "css",
      jnd: 0
    });
    return serialize(to(mapped, sRGB), { format: "hex", collapse: false, inGamut: false }).toLowerCase();
  },
  inGamut: color => inSrgbGamut(asNumbers(to(asColor(color), sRGB).coords)),
  contrast: contrastWCAG21
};
