import next from 'eslint-config-next';

/** Flat config — `eslint-config-next` (Next 16) exports a native flat array. */
const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'db/**'] },
  ...next,
];

export default eslintConfig;
