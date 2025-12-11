import Logger from '../models/logger'

/**
 * Updates shopper details in the basket.
 * This controller handles the addition of shopper-specific data to the current basket,
 * such as contact information, preferences, or other shopper-related details.
 *
 * @async
 * @function updateShopperDetails
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} Resolves when the shopper details are successfully updated.
 * @throws {Error} If the basket service fails to add shopper data.
 */
async function updateShopperDetails(req, res, next) {
    Logger.info('updateShopperDetails', 'start')

    try {
        const {adyen: adyenContext} = res.locals
        const {data} = req.body

        const updatedBasket = await adyenContext.basketService.addShopperData(data)

        Logger.info('updateShopperDetails', 'success')
        res.locals.response = updatedBasket
        next()
    } catch (err) {
        Logger.error('updateShopperDetails', err.stack)
        next(err)
    }
}

export default updateShopperDetails
