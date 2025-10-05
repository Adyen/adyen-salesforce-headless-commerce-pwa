import {BasketService} from '../basketService.js'
import {createShopperBasketsClient} from '../../helpers/basketHelper.js'
import {PAYMENT_METHODS} from '../../../utils/constants.mjs'

// Mock dependencies
jest.mock('../../helpers/basketHelper.js', () => ({
    createShopperBasketsClient: jest.fn()
}))

describe('BasketService', () => {
    let mockAdyenContext
    let mockRes
    let mockShopperBaskets
    let basketService

    beforeEach(() => {
        jest.clearAllMocks()

        mockAdyenContext = {
            authorization: 'Bearer mockToken',
            basket: {
                basketId: 'mockBasketId',
                paymentInstruments: [{paymentInstrumentId: 'pi_1'}, {paymentInstrumentId: 'pi_2'}]
            },
            customerId: 'mockCustomerId'
        }

        mockRes = {
            locals: {
                adyen: {}
            }
        }

        mockShopperBaskets = {
            updateBasket: jest.fn(),
            addPaymentInstrumentToBasket: jest.fn(),
            updateShippingAddressForShipment: jest.fn(),
            updateBillingAddressForBasket: jest.fn(),
            updateCustomerForBasket: jest.fn(),
            removePaymentInstrumentFromBasket: jest.fn(),
            updateShippingMethodForShipment: jest.fn()
        }

        createShopperBasketsClient.mockReturnValue(mockShopperBaskets)
        basketService = new BasketService(mockAdyenContext, mockRes)
    })

    describe('constructor', () => {
        it('should create a shopperBaskets client with the correct authorization', () => {
            expect(createShopperBasketsClient).toHaveBeenCalledWith('Bearer mockToken')
            expect(basketService.shopperBaskets).toBe(mockShopperBaskets)
        })
    })

    describe('update', () => {
        it('should call updateBasket and update the context', async () => {
            const updateData = {c_test: 'some_data'}
            const mockUpdatedBasket = {basketId: 'mockBasketId', ...updateData}
            mockShopperBaskets.updateBasket.mockResolvedValue(mockUpdatedBasket)

            const result = await basketService.update(updateData)

            expect(mockShopperBaskets.updateBasket).toHaveBeenCalledWith({
                body: updateData,
                parameters: {basketId: 'mockBasketId'}
            })
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
            expect(result).toEqual(mockUpdatedBasket)
        })
    })

    describe('addPaymentInstrument', () => {
        it('should correctly add a card payment instrument', async () => {
            const paymentData = {
                paymentMethod: {type: 'scheme', brand: 'visa'},
                amount: {value: 100, currency: 'USD'}
            }
            const mockUpdatedBasket = {basketId: 'mockBasketId', paymentInstruments: [{}]}
            mockShopperBaskets.addPaymentInstrumentToBasket.mockResolvedValue(mockUpdatedBasket)

            await basketService.addPaymentInstrument(paymentData)

            expect(mockShopperBaskets.addPaymentInstrumentToBasket).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        paymentMethodId: PAYMENT_METHODS.CREDIT_CARD,
                        'c_adyenPaymentMethodType': 'scheme',
                        'c_adyenPaymentMethodBrand': 'visa'
                    })
                })
            )
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
        })

        it('should correctly add a component payment instrument', async () => {
            const paymentData = {
                paymentMethod: {type: 'ideal'},
                amount: {value: 100, currency: 'EUR'}
            }
            const mockUpdatedBasket = {basketId: 'mockBasketId', paymentInstruments: [{}]}
            mockShopperBaskets.addPaymentInstrumentToBasket.mockResolvedValue(mockUpdatedBasket)

            await basketService.addPaymentInstrument(paymentData)

            expect(mockShopperBaskets.addPaymentInstrumentToBasket).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        paymentMethodId: PAYMENT_METHODS.ADYEN_COMPONENT,
                        'c_adyenPaymentMethodType': 'ideal'
                    })
                })
            )
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
        })
    })

    describe('addShopperData', () => {
        it('should update shipping, billing, and customer info and update the context', async () => {
            const shopperData = {
                deliveryAddress: {street: '1 Ship St'},
                billingAddress: {street: '1 Bill St'},
                profile: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'j.doe@example.com',
                    phone: '123'
                }
            }
            const mockUpdatedBasket = {basketId: 'mockBasketId', customerInfo: {}}
            mockShopperBaskets.updateShippingAddressForShipment.mockResolvedValue(
                mockUpdatedBasket
            )

            await basketService.addShopperData(shopperData)

            expect(mockShopperBaskets.updateShippingAddressForShipment).toHaveBeenCalled()
            expect(mockShopperBaskets.updateBillingAddressForBasket).toHaveBeenCalled()
            expect(mockShopperBaskets.updateCustomerForBasket).toHaveBeenCalledWith({
                body: {customerId: 'mockCustomerId', email: 'j.doe@example.com'},
                parameters: {basketId: 'mockBasketId'}
            })
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
        })
    })

    describe('removeAllPaymentInstruments', () => {
        it('should sequentially remove all payment instruments and update context', async () => {
            const finalBasketState = {basketId: 'mockBasketId', paymentInstruments: []}
            mockShopperBaskets.removePaymentInstrumentFromBasket.mockResolvedValue(
                finalBasketState
            )

            const result = await basketService.removeAllPaymentInstruments()

            expect(mockShopperBaskets.removePaymentInstrumentFromBasket).toHaveBeenCalledTimes(2)
            expect(mockShopperBaskets.removePaymentInstrumentFromBasket).toHaveBeenCalledWith({
                parameters: {basketId: 'mockBasketId', paymentInstrumentId: 'pi_1'}
            })
            expect(mockShopperBaskets.removePaymentInstrumentFromBasket).toHaveBeenCalledWith({
                parameters: {basketId: 'mockBasketId', paymentInstrumentId: 'pi_2'}
            })
            expect(mockRes.locals.adyen.basket).toEqual(finalBasketState)
            expect(result).toEqual(finalBasketState)
        })

        it('should do nothing if there are no payment instruments', async () => {
            mockAdyenContext.basket.paymentInstruments = []
            const service = new BasketService(mockAdyenContext, mockRes)

            await service.removeAllPaymentInstruments()

            expect(mockShopperBaskets.removePaymentInstrumentFromBasket).not.toHaveBeenCalled()
        })
    })

    describe('updateShippingAddress', () => {
        it('should call updateShippingAddressForShipment and update the context', async () => {
            const shippingData = {
                deliveryAddress: {street: '1 Ship St'},
                profile: {firstName: 'John', lastName: 'Doe', phone: '123'}
            }
            const mockUpdatedBasket = {basketId: 'mockBasketId', shipments: [{}]}
            mockShopperBaskets.updateShippingAddressForShipment.mockResolvedValue(
                mockUpdatedBasket
            )

            const result = await basketService.updateShippingAddress(shippingData)

            expect(mockShopperBaskets.updateShippingAddressForShipment).toHaveBeenCalledWith({
                body: expect.any(Object),
                parameters: {basketId: 'mockBasketId', shipmentId: 'me'}
            })
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
            expect(result).toEqual(mockUpdatedBasket)
        })
    })

    describe('setShippingMethod', () => {
        it('should call updateShippingMethodForShipment and update the context', async () => {
            const shippingMethodId = 'ship_method_001'
            const mockUpdatedBasket = {basketId: 'mockBasketId', shippingItems: [{}]}
            mockShopperBaskets.updateShippingMethodForShipment.mockResolvedValue(
                mockUpdatedBasket
            )

            const result = await basketService.setShippingMethod(shippingMethodId)

            expect(mockShopperBaskets.updateShippingMethodForShipment).toHaveBeenCalledWith({
                body: {id: shippingMethodId},
                parameters: {basketId: 'mockBasketId', shipmentId: 'me'}
            })
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
            expect(result).toEqual(mockUpdatedBasket)
        })
    })
})