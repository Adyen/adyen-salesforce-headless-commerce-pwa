import {ERROR_MESSAGE} from '../../utils/constants.mjs'
import AdyenClientProvider from '../models/adyenClientProvider'
import Logger from '../models/logger'
import {AdyenError} from '../models/AdyenError'

/**
 * Express middleware that retrieves a list of connected terminals for a given store.
 * Uses the Adyen Management API (TerminalsTerminalLevelApi) to list terminals
 * filtered by storeId and merchantAccount.
 * Returns terminals in the format: [{poiId, name, storeId}]
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
async function getTerminals(req, res, next) {
    try {
        Logger.info('getTerminals', 'start')
        const {adyen: adyenContext} = res.locals

        if (!adyenContext) {
            throw new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
        }

        const {storeId} = req.query
        const {adyenConfig} = adyenContext

        if (!storeId) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
        }

        const activeStoreIds = adyenConfig.posActiveStoreIds
            ? adyenConfig.posActiveStoreIds.split(',').map((id) => id.trim())
            : []

        if (!activeStoreIds.includes(storeId)) {
            throw new AdyenError(ERROR_MESSAGE.INVALID_STORE_ID, 403)
        }

        const managementApi = new AdyenClientProvider(adyenContext).getManagementApi()
        const response = await managementApi.TerminalsTerminalLevelApi.listTerminals(
            undefined, // searchQuery
            undefined, // otpQuery
            undefined, // countries
            adyenConfig.merchantAccount, // merchantIds
            storeId // storeIds
        )

        const terminals = (response?.data || []).map((terminal) => ({
            poiId: terminal.id,
            name: terminal.assignment?.companyId
                ? `${terminal.model} - ${terminal.serialNumber}`
                : terminal.id,
            storeId: terminal.assignment?.storeId || storeId
        }))

        Logger.info('getTerminals', `found ${terminals.length} terminals`)
        res.locals.response = terminals
        next()
    } catch (err) {
        Logger.error('getTerminals', err.message)
        next(err)
    }
}

export default getTerminals
