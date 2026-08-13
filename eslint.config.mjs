import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next@15 still ships legacy (.eslintrc-style) configs, so we
// bridge them into ESLint 9's flat config via FlatCompat rather than
// spreading them directly.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
