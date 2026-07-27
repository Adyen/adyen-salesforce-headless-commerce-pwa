const logger = {
    fatal: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
};

module.exports = {
    __logger: logger,
    getLogger: jest.fn(() => logger),
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};
