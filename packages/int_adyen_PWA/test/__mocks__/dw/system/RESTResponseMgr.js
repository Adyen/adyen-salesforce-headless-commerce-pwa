const successResponse = {render: jest.fn()};
const errorResponse = {render: jest.fn()};

module.exports = {
    __successResponse: successResponse,
    __errorResponse: errorResponse,
    createSuccess: jest.fn(() => successResponse),
    createError: jest.fn(() => errorResponse)
};
