export class AdyenError {
    constructor(message, statusCode, cause) {
        this.message = message
        this.statusCode = statusCode
        this.cause = cause
    }
}
