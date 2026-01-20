import paymentDataReviewPage from '../payment-data-review-page'

const {getPaymentDataForReviewPage, setPaymentDataForReviewPage, validatePaymentData} =
    paymentDataReviewPage
import Logger from '../../models/logger'
import {AdyenError} from '../../models/AdyenError'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

jest.mock('../../models/logger')

describe('Payment Data Review Page Controller', () => {
    let req, res, next

    const validPaymentData = {
        details: {
            billingToken: null,
            facilitatorAccessToken: '1WP6839J5ZKOIZ57aMZ',
            payerID: '9DNS6DJFHS4NC',
            orderID: '9914810184130050',
            paymentID: '1WPF9J5ZKOIZH8MZ',
            paymentSource: 'paypal'
        },
        paymentData: 'ABC...'
    }

    beforeEach(() => {
        jest.clearAllMocks()
        req = {
            body: {
                paymentData: validPaymentData
            }
        }
        res = {
            locals: {
                adyen: {
                    basket: {
                        basketId: 'mockBasketId',
                        c_paymentDataForReviewPage: JSON.stringify(validPaymentData)
                    },
                    basketService: {
                        update: jest.fn()
                    }
                }
            }
        }
        next = jest.fn()
    })

    describe('validatePaymentData', () => {
        it('should return true for valid payment data', () => {
            expect(validatePaymentData(validPaymentData)).toBe(true)
        })

        it('should throw error if paymentData is null', () => {
            expect(() => validatePaymentData(null)).toThrow(AdyenError)
            expect(() => validatePaymentData(null)).toThrow(ERROR_MESSAGE.INVALID_PAYMENT_DATA)
        })

        it('should throw error if paymentData is not an object', () => {
            expect(() => validatePaymentData('string')).toThrow(AdyenError)
            expect(() => validatePaymentData(123)).toThrow(AdyenError)
        })

        it('should throw error if details is missing', () => {
            const invalidData = {paymentData: 'ABC...'}
            expect(() => validatePaymentData(invalidData)).toThrow(AdyenError)
        })

        it('should throw error if details is not an object', () => {
            const invalidData = {details: 'string', paymentData: 'ABC...'}
            expect(() => validatePaymentData(invalidData)).toThrow(AdyenError)
        })

        it('should throw error if required detail fields are missing', () => {
            const invalidData = {
                details: {payerID: '123'},
                paymentData: 'ABC...'
            }
            expect(() => validatePaymentData(invalidData)).toThrow(
                `${ERROR_MESSAGE.INVALID_PAYMENT_DATA}: missing orderID, paymentID, paymentSource`
            )
        })

        it('should throw error if paymentData string is missing', () => {
            const invalidData = {
                details: {
                    payerID: '123',
                    orderID: '456',
                    paymentID: '789',
                    paymentSource: 'paypal'
                }
            }
            expect(() => validatePaymentData(invalidData)).toThrow(AdyenError)
        })

        it('should throw error if paymentData string is not a string', () => {
            const invalidData = {
                details: {
                    payerID: '123',
                    orderID: '456',
                    paymentID: '789',
                    paymentSource: 'paypal'
                },
                paymentData: 123
            }
            expect(() => validatePaymentData(invalidData)).toThrow(AdyenError)
        })
    })

    describe('getPaymentDataForReviewPage', () => {
        it('should return parsed payment data from basket', async () => {
            await getPaymentDataForReviewPage(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('getPaymentDataForReviewPage', 'start')
            expect(Logger.info).toHaveBeenCalledWith('getPaymentDataForReviewPage', 'success')
            expect(res.locals.response).toEqual(validPaymentData)
            expect(next).toHaveBeenCalledWith()
            expect(next).toHaveBeenCalledTimes(1)
        })

        it('should return empty object if no payment data in basket', async () => {
            res.locals.adyen.basket.c_paymentDataForReviewPage = null

            await getPaymentDataForReviewPage(req, res, next)

            expect(res.locals.response).toEqual({})
            expect(next).toHaveBeenCalledWith()
        })

        it('should throw error if adyenContext is missing', async () => {
            res.locals.adyen = null

            await getPaymentDataForReviewPage(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'getPaymentDataForReviewPage',
                expect.any(String)
            )
            expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
            expect(next.mock.calls[0][0].statusCode).toBe(500)
        })

        it('should throw error if basket is missing', async () => {
            res.locals.adyen.basket = null

            await getPaymentDataForReviewPage(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'getPaymentDataForReviewPage',
                expect.any(String)
            )
            expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
            expect(next.mock.calls[0][0].statusCode).toBe(400)
        })

        it('should call next with error if JSON.parse fails', async () => {
            res.locals.adyen.basket.c_paymentDataForReviewPage = 'invalid-json'

            await getPaymentDataForReviewPage(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'getPaymentDataForReviewPage',
                expect.any(String)
            )
            expect(next).toHaveBeenCalledWith(expect.any(Error))
        })
    })

    describe('setPaymentDataForReviewPage', () => {
        it('should update basket with payment data and set response', async () => {
            const mockUpdatedBasket = {
                basketId: 'mockBasketId',
                c_paymentDataForReviewPage: JSON.stringify(validPaymentData)
            }
            res.locals.adyen.basketService.update.mockResolvedValue(mockUpdatedBasket)

            await setPaymentDataForReviewPage(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('setPaymentDataForReviewPage', 'start')
            expect(res.locals.adyen.basketService.update).toHaveBeenCalledWith({
                c_paymentDataForReviewPage: JSON.stringify(validPaymentData)
            })
            expect(Logger.info).toHaveBeenCalledWith('setPaymentDataForReviewPage', 'success')
            expect(res.locals.response).toEqual(mockUpdatedBasket)
            expect(next).toHaveBeenCalledWith()
            expect(next).toHaveBeenCalledTimes(1)
        })

        it('should throw error if adyenContext is missing', async () => {
            res.locals.adyen = null

            await setPaymentDataForReviewPage(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'setPaymentDataForReviewPage',
                expect.any(String)
            )
            expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
            expect(next.mock.calls[0][0].statusCode).toBe(500)
        })

        it('should throw error if payment data validation fails', async () => {
            req.body.paymentData = {invalid: 'data'}

            await setPaymentDataForReviewPage(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'setPaymentDataForReviewPage',
                expect.any(String)
            )
            expect(next).toHaveBeenCalledWith(expect.any(AdyenError))
            expect(next.mock.calls[0][0].statusCode).toBe(400)
        })

        it('should call next with error if basketService.update fails', async () => {
            const error = new Error('Update failed')
            res.locals.adyen.basketService.update.mockRejectedValue(error)

            await setPaymentDataForReviewPage(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('setPaymentDataForReviewPage', error.stack)
            expect(next).toHaveBeenCalledWith(error)
        })
    })
})
