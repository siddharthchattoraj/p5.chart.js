import terser from '@rollup/plugin-terser';

const banner = `/* p5.chart.js | MIT License | https://github.com/siddharthchattoraj/p5.chart.js */`;

export default {
  input: 'src/p5.chart.js',
  output: [
    {
      file: 'p5.chart.js',
      format: 'umd',
      name: 'p5Chart',
      exports: 'named',
      banner
    },
    {
      file: 'dist/p5.chart.js',
      format: 'umd',
      name: 'p5Chart',
      exports: 'named',
      banner
    },
    {
      file: 'dist/p5.chart.min.js',
      format: 'umd',
      name: 'p5Chart',
      exports: 'named',
      banner,
      plugins: [terser({
        format: {
          comments: /^!|@license|MIT License/i
        }
      })]
    },
    {
      file: 'dist/p5.chart.esm.mjs',
      format: 'es',
      banner
    }
  ]
};
