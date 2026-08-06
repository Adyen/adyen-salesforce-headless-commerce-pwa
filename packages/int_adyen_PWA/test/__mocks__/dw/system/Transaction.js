module.exports = {
    wrap: jest.fn((fn) => fn()),
    begin: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn()
};
