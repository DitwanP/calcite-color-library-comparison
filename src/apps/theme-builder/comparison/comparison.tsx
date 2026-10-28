import React, { CSSProperties, FormEvent, useMemo, useState } from "react";
import "@esri/calcite-components/dist/components/calcite-button";
import { CalciteButton } from "@esri/calcite-components-react";
import { culoriAdapter } from "./culori";
import { colorjsAdapter } from "./colorjs";
import { ComparisonMode, ComparisonResult, MappingMethod, SAMPLE_SEEDS, generateComparison, normalizeSeed } from "./recipe";
import "./comparison.scss";

const adapters = [culoriAdapter, colorjsAdapter];
type TokenStyles = CSSProperties & Record<string, string>;

const LibraryResult = ({ name, result, mode }: { name: string; result: ComparisonResult; mode: ComparisonMode }) => (
  <section className="color-comparison-result" aria-label={`${name} results`}>
    <h2>{name}</h2>
    <p>
      Seed OKLCH: {result.source.l.toFixed(5)} / {result.source.c.toFixed(5)} / {result.source.h.toFixed(2)} degrees
      <br />
      {result.mappedTokens.length} of {Object.keys(result.tokens).length} candidates outside sRGB before mapping.
    </p>
    <div className="color-comparison-preview" style={{ ...result.tokens, colorScheme: mode } as TokenStyles}>
      <h3>Shared recipe preview</h3>
      <p>Primary text on a seed-tinted surface.</p>
      <div className="color-comparison-states">
        {["brand", "brand-hover", "brand-press"].map(token => (
          <span key={token} style={{ backgroundColor: result.tokens[`--calcite-color-${token}`] }}>
            {token.replace("brand", "Brand")}
          </span>
        ))}
      </div>
      <p className="color-comparison-link">Sample link color</p>
      <div className="color-comparison-highlight">Surface highlight</div>
    </div>
    <h3>Final sRGB colors</h3>
    <ul className="color-comparison-swatches">
      {Object.entries(result.tokens).map(([token, value]) => (
        <li key={token}>
          <span aria-hidden="true" style={{ backgroundColor: value }} />
          <code>{token}</code>
          <code>{value}</code>
          {result.mappedTokens.includes(token) && <small>Gamut mapped</small>}
        </li>
      ))}
    </ul>
    <h3>Contrast checks</h3>
    <p>Measured after HEX rounding. Passing these checks is not a full accessibility assessment.</p>
    <div className="color-comparison-table">
      <table>
        <caption>{name}: foreground / background</caption>
        <thead>
          <tr>
            <th scope="col">Pair</th>
            <th scope="col">Ratio</th>
            <th scope="col">Target</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {result.contrastChecks.map(check => (
            <tr key={`${check.foreground}-${check.background}`}>
              <th scope="row">
                {check.foreground} / {check.background}
              </th>
              <td title={String(check.ratio)}>{check.ratio.toFixed(2)}:1</td>
              <td>{check.target}:1</td>
              <td>{check.passes ? "Pass" : "Fail"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <details>
      <summary>Generated CSS</summary>
      <pre>
        <code>{result.css}</code>
      </pre>
    </details>
  </section>
);

export const ColorLibraryComparison = () => {
  const [input, setInput] = useState("#007ac2");
  const [seed, setSeed] = useState("#007ac2");
  const [mode, setMode] = useState<ComparisonMode>("light");
  const [mapping, setMapping] = useState<MappingMethod>("perceptual");
  const [error, setError] = useState("");
  const results = useMemo(() => adapters.map(adapter => generateComparison(adapter, seed, mode, mapping)), [seed, mode, mapping]);
  const differingTokens = Object.keys(results[0].tokens).filter(token => results[0].tokens[token] !== results[1].tokens[token]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const nextSeed = normalizeSeed(input);
      setInput(nextSeed);
      setSeed(nextSeed);
      setError("");
    } catch (validationError) {
      if (!(validationError instanceof Error)) throw validationError;
      setError(validationError.message);
    }
  };

  return (
    <main className="color-library-comparison">
      <h1>Color library comparison</h1>
      <p>
        Culori and Color.js run the same experimental 11-token OKLCH recipe. This is a library evaluation, not the finished theme generator:
        contrast failures are reported, not automatically corrected. No changes are applied to the theme builder.
      </p>
      <form className="color-comparison-controls" onSubmit={submit}>
        <label htmlFor="comparison-seed">
          Palette color (HEX)
          <input
            id="comparison-seed"
            value={input}
            onChange={event => setInput(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "comparison-error" : undefined}
          />
        </label>
        <button type="submit">Compare color</button>
        <label htmlFor="comparison-mode">
          Mode
          <select id="comparison-mode" value={mode} onChange={event => setMode(event.target.value === "dark" ? "dark" : "light")}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label htmlFor="comparison-mapping">
          Gamut mapping
          <select
            id="comparison-mapping"
            value={mapping}
            onChange={event => setMapping(event.target.value === "strict" ? "strict" : "perceptual")}
          >
            <option value="perceptual">Perceptual (CSS-style)</option>
            <option value="strict">Strict chroma reduction</option>
          </select>
        </label>
      </form>
      {error && (
        <p id="comparison-error" role="alert">
          {error} The results below still use {seed}.
        </p>
      )}
      <div className="color-comparison-samples" aria-label="Example palette colors">
        {SAMPLE_SEEDS.map(sample => (
          <CalciteButton
            key={sample.value}
            appearance="outline"
            scale="s"
            onClick={() => {
              setInput(sample.value);
              setSeed(sample.value);
              setError("");
            }}
          >
            {sample.label}
          </CalciteButton>
        ))}
      </div>
      <p>
        Perceptual mapping uses each library&apos;s CSS-style implementation; these are not guaranteed to be identical. Strict mapping
        reduces OKLCH chroma with no intentional perceptual clipping allowance.
      </p>
      <p>
        Both adapters use an sRGB boundary tolerance of 0.0000001 to ignore conversion roundoff. The libraries use slightly different
        luminance coefficients, so their unrounded contrast ratios can differ even for identical HEX pairs. Pass/fail uses each
        library&apos;s unrounded result.
      </p>
      <p role="status">
        {seed}, {mode} mode: {differingTokens.length} of 11 exported HEX values differ between libraries.
      </p>
      <div className="color-comparison-columns">
        {adapters.map((adapter, index) => (
          <LibraryResult key={adapter.name} name={adapter.name} result={results[index]} mode={mode} />
        ))}
      </div>
    </main>
  );
};
