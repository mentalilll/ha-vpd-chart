import {readFileSync} from 'node:fs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const production = !process.env.ROLLUP_WATCH;

// import css from './x.css?raw' -> string export (same syntax vitest/vite understands)
const rawCss = () => ({
    name: 'raw-css',
    resolveId(source, importer) {
        if (source.endsWith('.css?raw') && importer) {
            return new URL(source.replace('?raw', ''), `file://${importer}`).pathname + '?raw';
        }
        return null;
    },
    load(id) {
        if (!id.endsWith('.css?raw')) return null;
        const css = readFileSync(id.replace('?raw', ''), 'utf8');
        return `export default ${JSON.stringify(css)};`;
    },
});

export default {
    input: 'src/ha-vpd-chart.js',
    output: {
        file: 'dist/ha-vpd-chart.js',
        format: 'es',
        sourcemap: false,
        inlineDynamicImports: true,
    },
    plugins: [
        rawCss(),
        replace({preventAssignment: true, values: {__VERSION__: JSON.stringify(pkg.version)}}),
        json(),
        production && terser({format: {comments: false}}),
    ],
};
