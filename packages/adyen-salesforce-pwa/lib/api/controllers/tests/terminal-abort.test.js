import abortTerminalPayment from '../terminal-abort'
import AdyenClientProvider from '../../models/adyenClientProvider'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

jest.mock('../../models/adyenClientProvider')
jest.mock('../../models/logger')

describe('abortTerminalPayment controller', () => {
    let req, res, next
    let mockSync

    beforeEach(() => {
        jest.clearAllMocks()

        mockSync = jest.fn()

        AdyenClientProvider.mockImplementation(() => ({
            getTerminalClient: () => ({
                sync: mockSync
            })
        }))

        req = {
            body: {
                serviceId: '1234567890',
                terminalId: 'V400m-123456789'
            }
        }

        res = {
            locals: {
                adyen: {
                    adyenConfig: {
                        merchantAccount: 'TestMerchant'
                    },
                    siteId: 'RefArch',
                    authorization: 'Bearer token',
                    customerId: 'cust-001'
                }
            }
        }

        next = jest.fn()
    })

    it('should send abort request successfully', async () => {
        mockSync.mockResolvedValue('ok')

        await abortTerminalPayment(req, res, next)

        expect(mockSync).toHaveBeenCalledWith(
            expect.objectContaining({
                SaleToPOIRequest: expect.objectContaining({
                    MessageHeader: expect.objectContaining({
                        MessageCategory: 'Abort',
                        POIID: 'V400m-123456789',
                        SaleID: 'SalesforceCommerceCloud'
                    }),
                    AbortRequest: expect.objectContaining({
                        AbortReason: 'MerchantAbort',
                        MessageReference: expect.objectContaining({
                            ServiceID: '1234567890',
                            MessageCategory: 'Payment',
                            SaleID: 'SalesforceCommerceCloud',
                            POIID: 'V400m-123456789'
                        })
                    })
                })
            })
        )
        expect(res.locals.response).toEqual({
            success: true,
            response: 'ok'
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('should handle sync error gracefully', async () => {
        mockSync.mockRejectedValue(new Error('Terminal Cloud API error'))

        await abortTerminalPayment(req, res, next)

        expect(res.locals.response).toEqual({
            success: true,
            response: undefined
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('should call next with error when serviceId is missing', async () => {
        req.body.serviceId = undefined

        await abortTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.INVALID_PARAMS})
        )
        expect(mockSync).not.toHaveBeenCalled()
    })

    it('should call next with error when terminalId is missing', async () => {
        req.body.terminalId = undefined

        await abortTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.INVALID_PARAMS})
        )
    })

    it('should call next with error when adyen context is missing', async () => {
        res.locals = {}

        await abortTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND})
        )
    })
})
