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
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "next/link", message: "Use @/components/link: it tags navigations for the page crossfade." }] },
      ],
    },
  },
  {
    files: ["src/components/link.tsx"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
  {
    // Playwright fixtures call `use()`, which isn't React's hook.
    files: ["tests/e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];

export default config;
