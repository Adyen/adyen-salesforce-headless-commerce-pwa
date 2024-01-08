import { RESULT_CODES } from "./constants.mjs";

export function createCheckoutResponse(response, orderNumber) {
  if (
    [
      RESULT_CODES.AUTHORISED,
      RESULT_CODES.REFUSED,
      RESULT_CODES.ERROR,
      RESULT_CODES.CANCELLED,
      RESULT_CODES.RECEIVED,
    ].includes(response.resultCode)
  ) {
    return {
      isFinal: true,
      isSuccessful:
        response.resultCode === RESULT_CODES.AUTHORISED || response.resultCode === RESULT_CODES.RECEIVED,
      merchantReference: response.merchantReference || orderNumber,
    };
  }

  if (
    [
      RESULT_CODES.REDIRECTSHOPPER,
      RESULT_CODES.IDENTIFYSHOPPER,
      RESULT_CODES.CHALLENGESHOPPER,
      RESULT_CODES.PENDING,
      RESULT_CODES.PRESENTTOSHOPPER
    ].includes(response.resultCode)
  ) {
    return {
      isFinal: false,
      action: response.action,
      merchantReference: response.merchantReference || orderNumber,
    };
  }

  return {
    isFinal: true,
    isSuccessful: false,
  };
}
