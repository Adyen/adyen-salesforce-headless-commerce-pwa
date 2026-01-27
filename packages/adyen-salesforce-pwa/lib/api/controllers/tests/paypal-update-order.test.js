import paypalUpdateOrder from '../paypal-update-order'
import Logger from '../../models/logger'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'
import AdyenClientProvider from '../../models/adyenClientProvider'
import {getCurrencyValueForApi} from '../../../utils/parsers.mjs'
import {createShopperBasketsClient} from '../../helpers/basketHelper.js'

jest.mock('../../models/logger')
jest.mock('../../models/adyenClientProvider')
jest.mock('../../../utils/parsers.mjs')
jest.mock('../../helpers/basketHelper.js')

describe('paypalUpdateOrder controller', () => {
    let req
    let res
    let next
    let mockUtilityApi
    let mockShopperBaskets
    let mockAdyenContext

    beforeEach(() => {
        mockUtilityApi = {
            updatesOrderForPaypalExpressCheckout: jest.fn()
        }

        mockShopperBaskets = {
            getShippingMethodsForShipment: jest.fn()
        }

        mockAdyenContext = {
            basket: {
                basketId: 'basket123',
                currency: 'USD',
                orderTotal: 150.5,
                taxTotal: 12.5,
                c_pspReference: 'PSP-REF-123',
                shipments: [
                    {
                        shippingMethod: {
                            id: 'standard'
                        }
                    }
                ]
            },
            authorization: 'Bearer test-token'
        }

        req = {
            body: {
                data: 'test-payment-data'
            }
        }

        res = {
            locals: {
                adyen: mockAdyenContext
            }
        }

        next = jest.fn()

        AdyenClientProvider.mockImplementation(() => ({
            getUtilityApi: () => mockUtilityApi
        }))

        createShopperBasketsClient.mockReturnValue(mockShopperBaskets)

        getCurrencyValueForApi.mockImplementation((amount) => Math.round(amount * 100))

        Logger.info = jest.fn()
        Logger.error = jest.fn()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('successful update', () => {
        it('should successfully update paypal order with all fields', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {
                        id: 'standard',
                        name: 'Standard Shipping',
                        description: 'Delivery in 5-7 days',
                        price: 9.99
                    },
                    {
                        id: 'express',
                        name: 'Express Shipping',
                        description: 'Delivery in 2-3 days',
                        price: 19.99
                    }
                ]
            }

            const mockResponse = {
                paymentData: 'updated-payment-data',
                status: 'success'
            }

            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue(mockShippingMethods)
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue(mockResponse)

            await paypalUpdateOrder(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('paypalUpdateOrder', 'start')
            expect(Logger.info).toHaveBeenCalledWith('paypalUpdateOrder', 'success')

            expect(createShopperBasketsClient).toHaveBeenCalledWith('Bearer test-token')

            expect(mockShopperBaskets.getShippingMethodsForShipment).toHaveBeenCalledWith({
                parameters: {
                    basketId: 'basket123',
                    shipmentId: 'me'
                }
            })

            expect(mockUtilityApi.updatesOrderForPaypalExpressCheckout).toHaveBeenCalledWith(
                {
                    amount: {
                        currency: 'USD',
                        value: 15050
                    },
                    paymentData: 'test-payment-data',
                    pspReference: 'PSP-REF-123',
                    deliveryMethods: [
                        {
                            amount: {
                                currency: 'USD',
                                value: 999
                            },
                            description: 'Standard Shipping - Delivery in 5-7 days',
                            reference: 'standard',
                            selected: true,
                            type: 'Standard Shipping'
                        },
                        {
                            amount: {
                                currency: 'USD',
                                value: 1999
                            },
                            description: 'Express Shipping - Delivery in 2-3 days',
                            reference: 'express',
                            selected: false,
                            type: 'Express Shipping'
                        }
                    ],
                    taxTotal: {
                        amount: {
                            currency: 'USD',
                            value: 1250
                        }
                    }
                },
                {
                    idempotencyKey:
                        '50a1a1fe65e0dea7238d52998dd77b7f903597f1587845ac02d782f9bf2aeaea'
                }
            )

            expect(res.locals.response).toEqual(mockResponse)
            expect(next).toHaveBeenCalledWith()
        })

        it('should handle shipping method without description', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {
                        id: 'standard',
                        name: 'Standard Shipping',
                        price: 9.99
                    }
                ]
            }

            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue(mockShippingMethods)
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.deliveryMethods[0].description).toBe('Standard Shipping')
        })

        it('should handle shipping method without name', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {
                        id: 'standard',
                        price: 9.99
                    }
                ]
            }

            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue(mockShippingMethods)
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.deliveryMethods[0].description).toBe('Shipping')
            expect(callArgs.deliveryMethods[0].type).toBe('Shipping')
        })

        it('should handle shipping method with zero price', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {
                        id: 'free',
                        name: 'Free Shipping',
                        price: 0
                    }
                ]
            }

            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue(mockShippingMethods)
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.deliveryMethods[0].amount.value).toBe(0)
        })

        it('should not include deliveryMethods when applicableShippingMethods is empty', async () => {
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue({
                applicableShippingMethods: []
            })
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.deliveryMethods).toBeUndefined()
        })

        it('should not include deliveryMethods when applicableShippingMethods is null', async () => {
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue({
                applicableShippingMethods: null
            })
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.deliveryMethods).toBeUndefined()
        })

        it('should not include taxTotal when taxTotal is null', async () => {
            mockAdyenContext.basket.taxTotal = null
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue({
                applicableShippingMethods: []
            })
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.taxTotal).toBeUndefined()
        })

        it('should not include taxTotal when taxTotal is undefined', async () => {
            delete mockAdyenContext.basket.taxTotal
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue({
                applicableShippingMethods: []
            })
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.taxTotal).toBeUndefined()
        })

        it('should include taxTotal when taxTotal is 0', async () => {
            mockAdyenContext.basket.taxTotal = 0
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue({
                applicableShippingMethods: []
            })
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.taxTotal).toEqual({
                amount: {
                    currency: 'USD',
                    value: 0
                }
            })
        })

        it('should mark correct shipping method as selected', async () => {
            const mockShippingMethods = {
                applicableShippingMethods: [
                    {id: 'standard', name: 'Standard', price: 5},
                    {id: 'express', name: 'Express', price: 10},
                    {id: 'overnight', name: 'Overnight', price: 20}
                ]
            }

            mockAdyenContext.basket.shipments[0].shippingMethod.id = 'express'
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue(mockShippingMethods)
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})

            await paypalUpdateOrder(req, res, next)

            const callArgs = mockUtilityApi.updatesOrderForPaypalExpressCheckout.mock.calls[0][0]
            expect(callArgs.deliveryMethods[0].selected).toBe(false)
            expect(callArgs.deliveryMethods[1].selected).toBe(true)
            expect(callArgs.deliveryMethods[2].selected).toBe(false)
        })
    })

    describe('error handling', () => {
        it('should throw error when adyenContext is not found', async () => {
            res.locals.adyen = null

            await paypalUpdateOrder(req, res, next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND,
                    statusCode: 500
                })
            )
            expect(Logger.error).toHaveBeenCalled()
        })

        it('should throw error when pspReference is not found in basket', async () => {
            mockAdyenContext.basket.c_pspReference = null

            await paypalUpdateOrder(req, res, next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'PSP reference not found in basket',
                    statusCode: 400
                })
            )
            expect(Logger.error).toHaveBeenCalled()
        })

        it('should throw error when pspReference is undefined', async () => {
            delete mockAdyenContext.basket.c_pspReference

            await paypalUpdateOrder(req, res, next)

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'PSP reference not found in basket'
                })
            )
        })

        it('should handle error from getShippingMethodsForShipment', async () => {
            const error = new Error('Failed to fetch shipping methods')
            mockShopperBaskets.getShippingMethodsForShipment.mockRejectedValue(error)

            await paypalUpdateOrder(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('paypalUpdateOrder', expect.any(String))
            expect(next).toHaveBeenCalledWith(error)
        })

        it('should handle error from updatesOrderForPaypalExpressCheckout', async () => {
            const error = new Error('Failed to update PayPal order')
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue({
                applicableShippingMethods: []
            })
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockRejectedValue(error)

            await paypalUpdateOrder(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith('paypalUpdateOrder', expect.any(String))
            expect(next).toHaveBeenCalledWith(error)
        })

        it('should log error stack trace', async () => {
            const error = new Error('Test error')
            error.stack = 'Error: Test error\n    at test.js:1:1'
            mockShopperBaskets.getShippingMethodsForShipment.mockRejectedValue(error)

            await paypalUpdateOrder(req, res, next)

            expect(Logger.error).toHaveBeenCalledWith(
                'paypalUpdateOrder',
                'Error: Test error\n    at test.js:1:1'
            )
        })
    })

    describe('logging', () => {
        beforeEach(() => {
            mockShopperBaskets.getShippingMethodsForShipment.mockResolvedValue({
                applicableShippingMethods: []
            })
            mockUtilityApi.updatesOrderForPaypalExpressCheckout.mockResolvedValue({})
        })

        it('should log start message', async () => {
            await paypalUpdateOrder(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('paypalUpdateOrder', 'start')
        })

        it('should log success message', async () => {
            await paypalUpdateOrder(req, res, next)

            expect(Logger.info).toHaveBeenCalledWith('paypalUpdateOrder', 'success')
        })
    })
})
