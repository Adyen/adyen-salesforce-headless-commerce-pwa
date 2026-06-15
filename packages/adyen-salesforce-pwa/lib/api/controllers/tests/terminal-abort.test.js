import abortTerminalPayment from '../terminal-abort'
import AdyenClientProvider from '../../models/adyenClientProvider'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'
import * as terminalHelper from '../../helpers/terminalHelper'
import * as orderHelper from '../../helpers/orderHelper'

jest.mock('../../models/adyenClientProvider')
jest.mock('../../models/logger')
jest.mock('../../helpers/orderHelper')

describe('abortTerminalPayment controller', () => {
    let req, res, next
    let mockSync

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(terminalHelper, 'generateServiceId').mockReturnValue('9876543210')

        mockSync = jest.fn()

        AdyenClientProvider.mockImplementation(() => ({
            getTerminalClient: () => ({
                sync: mockSync
            })
        }))

        orderHelper.failOrderAndReopenBasket.mockResolvedValue('new-basket-456')

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
                    order: {orderNo: 'ORDER-001'},
                    siteId: 'RefArch',
                    authorization: 'Bearer token',
                    customerId: 'cust-001'
                }
            }
        }

        next = jest.fn()
    })

    it('should send abort and fail order successfully', async () => {
        mockSync.mockResolvedValue('ok')

        await abortTerminalPayment(req, res, next)

        expect(mockSync).toHaveBeenCalledWith(
            expect.objectContaining({
                SaleToPOIRequest: expect.objectContaining({
                    MessageHeader: expect.objectContaining({
                        MessageCategory: 'Abort',
                        ServiceID: '9876543210',
                        POIID: 'V400m-123456789'
                    }),
                    AbortRequest: expect.objectContaining({
                        AbortReason: 'MerchantAbort',
                        MessageReference: expect.objectContaining({
                            ServiceID: '1234567890',
                            MessageCategory: 'Payment'
                        })
                    })
                })
            })
        )
        expect(orderHelper.failOrderAndReopenBasket).toHaveBeenCalledWith(
            res.locals.adyen,
            'ORDER-001'
        )
        expect(res.locals.response).toEqual({
            success: true,
            response: 'ok',
            newBasketId: 'new-basket-456'
        })
        expect(next).toHaveBeenCalledWith()
    })

    it('should handle failOrderAndReopenBasket error gracefully', async () => {
        mockSync.mockResolvedValue('ok')
        orderHelper.failOrderAndReopenBasket.mockRejectedValue(new Error('order fail error'))

        await abortTerminalPayment(req, res, next)

        expect(res.locals.response).toEqual({success: true, response: 'ok', newBasketId: null})
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

    it('should handle sync API errors gracefully', async () => {
        const apiError = new Error('Terminal Cloud API error')
        mockSync.mockRejectedValue(apiError)

        await abortTerminalPayment(req, res, next)

        expect(next).toHaveBeenCalledWith(apiError)
    })
})
