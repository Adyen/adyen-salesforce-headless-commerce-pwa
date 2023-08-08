import AdyenCheckout from '@adyen/adyen-web'
import { formatAddressInAdyenFormat } from "../utils/formatAddress";
import { getCurrencyValueForApi } from "../utils/parsers";

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
        const {orderTotal, currency} = this.order
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
            billingAddress: formatAddressInAdyenFormat(this.order.billingAddress),
            deliveryAddress: formatAddressInAdyenFormat(this.order.shipments[0].shippingAddress),
            reference: this.order.orderNo,
            amount: {
                value: getCurrencyValueForApi(orderTotal, currency),
                currency
            }
        })
    }
}
