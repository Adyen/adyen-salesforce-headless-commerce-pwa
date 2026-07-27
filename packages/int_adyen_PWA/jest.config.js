module.exports = {
    rootDir: __dirname,
    testEnvironment: 'node',
    testMatch: ['<rootDir>/cartridge/**/*.test.js'],
    moduleNameMapper: {
        '^dw/(.*)$': '<rootDir>/test/__mocks__/dw/$1.js',
        '^\\*/cartridge/(.*)$': '<rootDir>/cartridge/$1.js'
    },
    setupFilesAfterEnv: ['<rootDir>/test/setupGlobals.js'],
    clearMocks: true,
    restoreMocks: true,
    collectCoverageFrom: ['<rootDir>/cartridge/**/*.js', '!<rootDir>/cartridge/**/*.test.js'],
    coverageThreshold: {
        global: {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85
        }
    }
};
