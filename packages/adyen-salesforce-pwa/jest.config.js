module.exports = {
    transform: {
        '\\.[jt]sx?$': 'babel-jest',
        '\\.[cm]js?$': 'babel-jest'
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
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/mocks/**'
    ],
    clearMocks: true,
    restoreMocks: true,
    resetModules: true,
    setupFilesAfterEnv: ['jest-extended/all'],
    setupFiles: ['./__mocks__/mockEnv.js']
}
