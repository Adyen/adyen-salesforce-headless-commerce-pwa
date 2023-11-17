export function createErrorResponse(statusCode, errorMessage) {
  return {
    error: true,
    errorMessage,
    statusCode,
  }
}