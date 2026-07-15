import {prepareApplePayContext, createApplePayContext} from '../apple-pay-context.js'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../../models/logger.js'

// Mock dependencies
jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs')
jest.mock('../../models/logger.js')

describe('prepareApplePayContext middleware', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
        req = {
            query: {
                siteId: 'RefArch'
            },
            headers: {
                authorization: 'Bearer test-token',
                customerid: 'customer123'
            }
        }
        res = {
            locals: {}
        }
        next = jest.fn()
    })

    test('should successfully prepare context with siteId and call next', async () => {
        const mockAdyenConfig = {merchantAccount: 'mockAccount'}
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        await prepareApplePayContext(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch', {})
        expect(res.locals.adyen).toBeDefined()
        expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
        expect(res.locals.adyen.siteId).toBe('RefArch')
        expect(res.locals.adyen.authorization).toBe('Bearer test-token')
        expect(res.locals.adyen.customerId).toBe('customer123')
        expect(Logger.info).toHaveBeenCalledWith('prepareApplePayContext', 'success')
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should successfully prepare context without siteId (global config fallback)', async () => {
        req.query = {} // No siteId
        const mockAdyenConfig = {merchantAccount: 'mockGlobalAccount'}
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        await prepareApplePayContext(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith(undefined, {})
        expect(res.locals.adyen).toBeDefined()
        expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
        expect(res.locals.adyen.siteId).toBeUndefined()
        expect(Logger.info).toHaveBeenCalledWith('prepareApplePayContext', 'success')
        expect(next).toHaveBeenCalledWith()
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should call next with an error if getAdyenConfigForCurrentSite fails', async () => {
        const mockError = new Error('Failed to get config')
        getAdyenConfigForCurrentSite.mockImplementation(() => {
            throw mockError
        })

        await prepareApplePayContext(req, res, next)

        expect(next).toHaveBeenCalledWith(mockError)
        expect(next).toHaveBeenCalledTimes(1)
    })

    test('should not include authorization or customerId if headers are absent', async () => {
        req.headers = {} // No authorization or customerid
        const mockAdyenConfig = {merchantAccount: 'mockAccount'}
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        await prepareApplePayContext(req, res, next)

        expect(res.locals.adyen).toBeDefined()
        expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
        expect(res.locals.adyen.authorization).toBeUndefined()
        expect(res.locals.adyen.customerId).toBeUndefined()
        expect(next).toHaveBeenCalledWith()
    })
})

describe('createApplePayContext factory', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
        req = {
            query: {siteId: 'RefArch'},
            headers: {authorization: 'Bearer test-token', customerid: 'customer123'}
        }
        res = {locals: {}}
        next = jest.fn()
    })

    test('should pass options to getAdyenConfigForCurrentSite', async () => {
        const options = {nativeThreeDS: 'disabled'}
        const mockAdyenConfig = {merchantAccount: 'mockAccount', nativeThreeDS: 'disabled'}
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        const middleware = createApplePayContext(options)
        await middleware(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch', options)
        expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
        expect(next).toHaveBeenCalledWith()
    })

    test('should use empty options by default (backward compatibility)', async () => {
        const mockAdyenConfig = {merchantAccount: 'mockAccount'}
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        const middleware = createApplePayContext()
        await middleware(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch', {})
        expect(next).toHaveBeenCalledWith()
    })

    test('should pass options through even when siteId is absent', async () => {
        req.query = {} // No siteId
        const options = {nativeThreeDS: 'disabled'}
        const mockAdyenConfig = {merchantAccount: 'mockGlobalAccount', nativeThreeDS: 'disabled'}
        getAdyenConfigForCurrentSite.mockReturnValue(mockAdyenConfig)

        const middleware = createApplePayContext(options)
        await middleware(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith(undefined, options)
        expect(res.locals.adyen.adyenConfig).toEqual(mockAdyenConfig)
        expect(res.locals.adyen.siteId).toBeUndefined()
        expect(next).toHaveBeenCalledWith()
    })
})
