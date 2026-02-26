export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/?(*.)+(spec|test).js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/__tests__/**',
        '!src/index.js',
        '!src/app.js'
    ],
    coverageDirectory: 'coverage',
    verbose: true
};
