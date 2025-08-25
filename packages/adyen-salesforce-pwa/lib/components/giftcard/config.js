import {baseConfig} from '../helpers/baseConfig'
import {GiftCardService} from '../../services/giftCard'

export const giftcardConfig = (props) => {
    const giftCardService = new GiftCardService(props?.token, props?.site)
    return {
        ...baseConfig(props),
        onBalanceCheck: async (resolve, reject, data) => {
            const BalanceResponse = await giftCardService.balanceCheck(data, props?.customerId)
            resolve(BalanceResponse);
        },
        onOrderRequest: async (resolve, reject, data) => {
            const OrderResponse = await giftCardService.createOrder(data, props?.customerId)
            resolve(OrderResponse);
        },
        onOrderCancel: async (Order) => {
            await giftCardService.cancelOrder(Order, props?.customerId)
        }
    }
}