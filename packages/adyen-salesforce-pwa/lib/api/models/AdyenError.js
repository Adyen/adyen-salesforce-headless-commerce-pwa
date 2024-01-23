export class AdyenError {
    constructor(errMessage, statusCode, cause) {
        this.errMessage = errMessage
        this.statusCode = statusCode
        this.cause = cause
    }
}
