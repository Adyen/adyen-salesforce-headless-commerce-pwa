import {baseConfig} from '../helpers/baseConfig'
import {GiftCardService} from '../../services/giftCard'
import {executeCallbacks} from '../../utils/executeCallbacks'

export const giftcardConfig = (props) => {
    const giftCardService = new GiftCardService(
        props?.token,
        props?.customerId,
        props.basket?.basketId,
        props?.site
    )

    const onBalanceCheck = async (resolve, reject, data) => {
        try {
            const response = await giftCardService.balanceCheck(data)
            if (response && !!response.error) {
                throw new Error(response.errorMessage)
            } else {
                resolve(response)
            }
        } catch (err) {
            reject(err?.message)
        }
    }

    const onOrderRequest = async (resolve, reject, data) => {
        try {
            const response = await giftCardService.createOrder(data)
            if (response && !!response.error) {
                throw new Error(response.errorMessage)
            } else {
                resolve(response)
            }
        } catch (err) {
            reject(err?.message)
        }
    }

    const onOrderCancel = async (Order) => {
        const response = await giftCardService.cancelOrder(Order)
        if (response.isFinal && response.isSuccessful) {
            props?.setAdyenOrder(null)
        }
    }

    return {
        ...baseConfig(props),
        onBalanceCheck: executeCallbacks([onBalanceCheck], props),
        onOrderRequest: executeCallbacks([onOrderRequest], props),
        onOrderCancel: executeCallbacks([onOrderCancel], props)
    }
}
