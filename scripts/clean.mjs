import { rm } from 'node:fs/promises';

await Promise.all([
  rm('dist', { force: true, recursive: true }),
  rm('p5.chart.js', { force: true })
]);
