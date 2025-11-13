export class AdyenError extends Error {
    constructor(message, statusCode, cause) {
        // Pass the message to the native Error class
        super(message)

        // Set the error name for easy identification (e.g., in a catch block)
        this.name = 'AdyenError'

        // Keep the custom properties
        this.statusCode = statusCode
        this.cause = cause

        // This ensures the constructor is excluded from the stack trace, making it cleaner.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AdyenError)
        }
    }
}
