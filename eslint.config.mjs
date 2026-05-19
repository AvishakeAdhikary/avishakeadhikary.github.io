import nextConfig from "eslint-config-next";

export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...nextConfig,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
];
