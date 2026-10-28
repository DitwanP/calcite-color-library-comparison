export const createThemeCss = (tokens: Record<string, string>, mode: "light" | "dark"): string =>
  `:root {\n  color-scheme: ${mode};${Object.entries(tokens)
    .map(([token, value]) => `\n  ${token}: ${value};`)
    .join("")}\n}`;
