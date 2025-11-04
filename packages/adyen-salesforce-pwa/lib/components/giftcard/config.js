import {baseConfig} from '../helpers/baseConfig'
import {GiftCardService} from '../../services/giftCard'
import {executeCallbacks, executeErrorCallbacks} from '../../utils/executeCallbacks'

export const giftcardConfig = (props) => {
    const giftCardService = new GiftCardService(
        props?.token,
        props?.customerId,
        props.basket?.basketId,
        props?.site
    )

    const onBalanceCheck = async (resolve, reject, data) => {
        const response = await giftCardService.balanceCheck(data)
        if (response && !!response.error) {
            reject(response.errorMessage)
        } else {
            resolve(response)
        }
    }

    const onOrderRequest = async (resolve, reject, data) => {
        const response = await giftCardService.createOrder(data)
        if (response && !!response.error) {
            reject(response.errorMessage)
        } else {
            resolve(response)
        }
    }
    const onOrderCancel = async (Order) => {
        const response = await giftCardService.cancelOrder(Order)
        if (response.isFinal && response.isSuccessful) {
            props?.setAdyenOrder(null)
        }
    }

    const onErrorCallback = executeErrorCallbacks(props.onError || [])
    return {
        ...baseConfig(props),
        onBalanceCheck: executeCallbacks([onBalanceCheck], props, onErrorCallback),
        onOrderRequest: executeCallbacks([onOrderRequest], props, onErrorCallback),
        onOrderCancel: executeCallbacks([onOrderCancel], props, onErrorCallback)
    }
}
