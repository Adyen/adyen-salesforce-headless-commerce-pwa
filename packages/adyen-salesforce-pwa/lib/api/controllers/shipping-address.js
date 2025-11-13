import Logger from '../models/logger'

async function updateShippingAddress(req, res, next) {
    Logger.info('updateShippingAddress', 'start')

    try {
        const {adyen: adyenContext} = res.locals
        const {data} = req.body

        const updatedBasket = await adyenContext.basketService.updateShippingAddress(data)

        Logger.info('updateShippingAddress', 'success')
        res.locals.response = updatedBasket
        next()
    } catch (err) {
        Logger.error('updateShippingAddress', err.stack)
        next(err)
    }
}

export default updateShippingAddress
