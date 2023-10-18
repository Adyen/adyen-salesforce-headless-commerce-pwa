import {klarnaConfig} from './klarna/config'

export const paymentMethodsConfiguration = (paymentMethods, ...props) => {
    const paymentMethodsConfig = {
        klarna: klarnaConfig(props),
        klarna_account: klarnaConfig(props),
        klarna_paynow: klarnaConfig(props)
    }

    return paymentMethods
        .map((paymentMethod) => paymentMethodsConfig[paymentMethod.type])
        .filter((config) => !!config)
}
