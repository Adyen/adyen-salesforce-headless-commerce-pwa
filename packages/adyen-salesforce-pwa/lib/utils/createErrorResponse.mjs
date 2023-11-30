const DEFAULT_ERROR = 'Technical error!'

export function createErrorResponse(errorMessage = DEFAULT_ERROR) {
  return {
    error: true,
    errorMessage,
  }
}
