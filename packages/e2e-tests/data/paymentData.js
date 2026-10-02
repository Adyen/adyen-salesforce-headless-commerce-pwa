export class PaymentData {
  PayPal = {
    username: process.env.E2E_PAYPAL_USERNAME ?? process.env.PAYPAL_USERNAME,
    password: process.env.E2E_PAYPAL_PASSWORD ?? process.env.PAYPAL_PASSWORD,
  };
}
