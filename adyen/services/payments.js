import AdyenCheckout from '@adyen/adyen-web'

export class AdyenPaymentsService {
    order = null
    adyenSession = null
    adyenStateData = null

    constructor(order, adyenSession, adyenStateData) {
        this.order = order
        this.adyenSession = adyenSession
        this.adyenStateData = adyenStateData
    }

    async submitPayment() {
        const checkout = await AdyenCheckout({
            environment: this.adyenSession.ADYEN_ENVIRONMENT,
            clientKey: this.adyenSession.ADYEN_CLIENT_KEY,
            session: {
                id: this.adyenSession.id,
                sessionData: this.adyenSession.sessionData
            }
        })
        return await checkout.session.submitPayment({
            ...this.adyenStateData,
            reference: this.order.orderNo,
            amount: {
                value: this.order.orderTotal * 100,
                currency: this.order.currency
            }
        })
    }
}
