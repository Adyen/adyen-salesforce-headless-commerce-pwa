import {baseConfig} from './helpers/baseConfig'
import {klarnaConfig} from './klarna/config'
import {cardConfig} from './card/config'
import {paypalConfig} from './paypal/config'
import {applePayConfig} from './applepay/config'
import {amazonPayConfig} from './amazonpay/config'

export const paymentMethodsConfiguration = ({
    paymentMethods = [],
    additionalPaymentMethodsConfiguration,
    ...props
}) => {
    const defaultConfig = baseConfig(props)
    if (!paymentMethods || !paymentMethods.length) {
        return defaultConfig
    }

    const paymentMethodsConfig = {
        card: cardConfig(props),
        klarna: klarnaConfig(props),
        klarna_account: klarnaConfig(props),
        klarna_paynow: klarnaConfig(props),
        paypal: paypalConfig(props),
        applepay: applePayConfig(props),
        amazonpay: amazonPayConfig(props)
    }

    return Object.fromEntries(
        paymentMethods.map((paymentMethod) => {
            const type = paymentMethod.type === 'scheme' ? 'card' : paymentMethod.type
            const basePaymentMethodConfig = Object.hasOwn(paymentMethodsConfig, type)
                ? paymentMethodsConfig[type]
                : defaultConfig
            return additionalPaymentMethodsConfiguration?.[type]
                ? [
                      type,
                      {...basePaymentMethodConfig, ...additionalPaymentMethodsConfiguration[type]}
                  ]
                : [type, basePaymentMethodConfig]
        })
    )
}
