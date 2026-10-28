module.exports = {
  rootDir: "../../../..",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/apps/theme-builder/comparison/**/*.test.ts"],
  moduleNameMapper: {
    "^culori/fn$": "<rootDir>/node_modules/culori/src/index-fn.js",
    "^colorjs.io/fn$": "<rootDir>/node_modules/colorjs.io/dist/color-fn.cjs"
  },
  transform: {
    "^.+\\.[jt]s$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        presets: [["@babel/preset-env", { targets: { node: "current" } }], "@babel/preset-typescript"]
      }
    ]
  },
  transformIgnorePatterns: ["node_modules/(?!culori/)"]
};
