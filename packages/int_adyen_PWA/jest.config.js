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
    restoreMocks: true
};
