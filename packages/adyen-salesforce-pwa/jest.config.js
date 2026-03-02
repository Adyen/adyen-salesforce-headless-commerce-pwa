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
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85
        },
        './lib/**/*.{js,jsx,mjs,cjs}': {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
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
    verbose: true,
    transformIgnorePatterns: ['/node_modules/@adyen/adyen-web']
}
