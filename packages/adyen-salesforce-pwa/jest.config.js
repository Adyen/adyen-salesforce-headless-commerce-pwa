module.exports = {
    transform: {
        '\\.[jt]sx?$': 'babel-jest',
        '\\.[cm]js?$': 'babel-jest'
    },
    moduleNameMapper: {
        '\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js'
    },
    testPathIgnorePatterns: ['/dist/', '/node_modules/'],
    moduleFileExtensions: ['js', 'jsx', 'mjs', 'cjs'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    collectCoverageFrom: [
        'lib/**/*.{js,jsx,mjs,cjs}',
        '!lib/scripts/**/*{js,jsx,mjs,cjs}',
        '!lib/pages/**/*',
        '!lib/index.js',
        '!lib/api/index.js',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/mocks/**'
    ],
    clearMocks: true,
    restoreMocks: true,
    resetModules: true,
    setupFilesAfterEnv: ['jest-extended/all', '@testing-library/jest-dom'],
    setupFiles: ['./__mocks__/mockEnv.js'],
    testMatch: ['**/adyen-checkout-context.test.js'],
    verbose: true,
    transformIgnorePatterns: ['/node_modules/@adyen/adyen-web']
}
