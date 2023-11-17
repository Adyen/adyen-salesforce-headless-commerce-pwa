import { RESULT_CODES } from "./constants.mjs";

export function createCheckoutResponse(response) {
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
      merchantReference: response.merchantReference,
    };
  }

  if (
    [
      RESULT_CODES.REDIRECTSHOPPER,
      RESULT_CODES.IDENTIFYSHOPPER,
      RESULT_CODES.CHALLENGESHOPPER,
      RESULT_CODES.PRESENTTOSHOPPER,
      RESULT_CODES.PENDING,
    ].includes(response.resultCode)
  ) {
    return {
      isFinal: false,
      action: response.action,
    };
  }

  return {
    isFinal: true,
    isSuccessful: false,
  };
}
