// @ts-check
import promisePlugin from 'eslint-plugin-promise';

/**
 * Promise 관련 ESLint 설정
 */
export default {
  plugins: {
    promise: promisePlugin,
  },
  rules: {
    // ================================
    // Promise 관련 규칙 (강화)
    // ================================
    'promise/catch-or-return': 'error', // warn → error
    'promise/no-nesting': 'error', // warn → error
    'promise/prefer-await-to-then': 'error', // warn → error
    'promise/prefer-await-to-callbacks': 'error', // warn → error
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/no-new-statics': 'error',
    'promise/no-return-in-finally': 'error',
    'promise/valid-params': 'error',
  },
};