import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "public/**",
      "media/**",
      ".media-cache/**",
      "next-env.d.ts",
    ],
  },
  ...nextConfig,
  {
    // Explicit version: eslint-plugin-react's auto-detection uses an API removed in ESLint 10.
    settings: { react: { version: "19.3" } },
    rules: {
      // Full React Compiler-era hook rules stay on (purity, refs, immutability,
      // set-state-in-effect). Opt out per line with a justification comment.
      "react-hooks/exhaustive-deps": "error",
      "@next/next/no-img-element": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
];

export default config;
