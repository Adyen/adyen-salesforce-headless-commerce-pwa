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
    collectCoverageFrom: ['lib/**/*.{js,jsx,mjs,cjs}', '!**/node_modules/**', '!**/dist/**'],
    clearMocks: true,
    restoreMocks: true
}
