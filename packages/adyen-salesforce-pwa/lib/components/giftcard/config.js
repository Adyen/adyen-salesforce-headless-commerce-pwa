import {baseConfig} from '../helpers/baseConfig'
import {GiftCardService} from '../../services/giftCard'

export const giftcardConfig = (props) => {
    const giftCardService = new GiftCardService(props?.token, props?.site)
    return {
        ...baseConfig(props),
        onBalanceCheck: async (resolve, reject, data) => {
            const response = await giftCardService.balanceCheck(data, props?.customerId)
            if (response && !!response.error) {
                reject(response.errorMessage);
            } else {
                resolve(response);
            }
        },
        onOrderRequest: async (resolve, reject, data) => {
            const response = await giftCardService.createOrder(data, props?.customerId)
            if (response && !!response.error) {
                reject(response.errorMessage);
            } else {
                resolve(response);
            }
        },
        onOrderCancel: async (Order) => {
            await giftCardService.cancelOrder(Order, props?.customerId)
        }
    }
}