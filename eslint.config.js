import globals from 'globals';

export default [
    {
        files: ['src/**/*.js', 'test/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {...globals.browser, __VERSION__: 'readonly'},
        },
        rules: {
            'no-unused-vars': ['warn', {args: 'none'}],
            'no-undef': 'error',
            'prefer-const': 'warn',
            'eqeqeq': ['error', 'smart'],
        },
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {globals: {...globals.node}},
    },
];
