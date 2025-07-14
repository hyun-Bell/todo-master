module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@types': './src/types',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@assets': './src/assets',
            '@constants': './src/constants',
            '@navigation': './src/navigation',
            '@store': './src/store'
          }
        }
      ]
    ]
  };
};