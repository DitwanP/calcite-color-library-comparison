const { build } = require("esbuild");
const { gzipSync } = require("zlib");
const path = require("path");

async function compareBundles() {
  const results = [];
  for (const library of ["culori", "colorjs"]) {
    const result = await build({
      entryPoints: [path.join(__dirname, `../src/apps/theme-builder/comparison/${library}.ts`)],
      bundle: true,
      write: false,
      minify: true,
      platform: "browser",
      format: "esm",
      target: "es2020"
    });
    const bytes = result.outputFiles[0].contents;
    results.push({ library, minifiedBytes: bytes.length, gzipBytes: gzipSync(bytes).length });
  }
  console.log("Matched adapter bundles, including conversion, sRGB mapping, HEX serialization, and WCAG contrast.");
  console.log("Functional imports, esbuild " + require("esbuild").version + ", browser ESM, ES2020; not page-chunk sizes.");
  console.table(results);
}

compareBundles().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
