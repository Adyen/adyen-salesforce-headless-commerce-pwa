import {baseConfig} from '../helpers/baseConfig'
import {GiftCardService} from '../../services/giftCard'

export const giftcardConfig = (props) => {
    const giftCardService = new GiftCardService(
        props?.token,
        props?.customerId,
        props.basket?.basketId,
        props?.site
    )
    return {
        ...baseConfig(props),
        onBalanceCheck: async (resolve, reject, data) => {
            const response = await giftCardService.balanceCheck(data)
            if (response && !!response.error) {
                reject(response.errorMessage)
            } else {
                resolve(response)
            }
        },
        onOrderRequest: async (resolve, reject, data) => {
            const response = await giftCardService.createOrder(data)
            if (response && !!response.error) {
                reject(response.errorMessage)
            } else {
                resolve(response)
            }
        },
        onOrderCancel: async (Order) => {
            const response = await giftCardService.cancelOrder(Order)
            if (response.isFinal && response.isSuccessful) {
                props?.setAdyenOrder(null)
            }
        }
    }
}
