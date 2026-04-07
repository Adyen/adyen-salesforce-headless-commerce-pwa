import {BasketService} from '../basketService.js'
import {createShopperBasketsClient} from '../../helpers/basketHelper.js'
import {PAYMENT_METHODS} from '../../../utils/constants.mjs'

// Mock dependencies
jest.mock('../../helpers/basketHelper.js', () => {
    const actual = jest.requireActual('../../helpers/basketHelper.js')
    return {
        ...actual,
        createShopperBasketsClient: jest.fn()
    }
})
jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config.server', () => ({
    getConfig: jest.fn(() => ({
        app: {
            commerceAPI: {
                proxyPath: '/mobify/proxy/api',
                parameters: {
                    clientId: 'test-client-id',
                    organizationId: 'test-org-id',
                    shortCode: 'test-short-code',
                    siteId: 'test-site-id'
                }
            }
        }
    }))
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
            siteId: 'RefArch',
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
            deleteBasket: jest.fn(),
            createBasket: jest.fn(),
            updateBasket: jest.fn(),
            addItemToBasket: jest.fn(),
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
            expect(createShopperBasketsClient).toHaveBeenCalledWith('Bearer mockToken', 'RefArch')
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

    describe('addProductToBasket', () => {
        it('should add an item to the basket and update context when matching basketId', async () => {
            const updated = {
                basketId: 'mockBasketId',
                productItems: [{productId: 'SKU', quantity: 1}]
            }
            mockShopperBaskets.addItemToBasket.mockResolvedValue(updated)

            const result = await basketService.addProductToBasket('mockBasketId', {
                id: 'SKU',
                quantity: 1
            })

            expect(mockShopperBaskets.addItemToBasket).toHaveBeenCalledWith({
                parameters: {basketId: 'mockBasketId'},
                body: [
                    {
                        productId: 'SKU',
                        quantity: 1
                    }
                ]
            })
            expect(mockRes.locals.adyen.basket).toEqual(updated)
            expect(result).toEqual(updated)
        })

        it('should add item with optionItems as array', async () => {
            const updated = {basketId: 'mockBasketId', productItems: []}
            mockShopperBaskets.addItemToBasket.mockResolvedValue(updated)

            await basketService.addProductToBasket('mockBasketId', {
                id: 'SKU',
                quantity: 1,
                optionItems: [{optionId: 'opt1'}]
            })

            expect(mockShopperBaskets.addItemToBasket).toHaveBeenCalledWith({
                parameters: {basketId: 'mockBasketId'},
                body: [{productId: 'SKU', quantity: 1, optionItems: [{optionId: 'opt1'}]}]
            })
        })

        it('should wrap non-array optionItems in an array', async () => {
            const updated = {basketId: 'mockBasketId', productItems: []}
            mockShopperBaskets.addItemToBasket.mockResolvedValue(updated)

            await basketService.addProductToBasket('mockBasketId', {
                id: 'SKU',
                quantity: 1,
                optionItems: {optionId: 'opt1'}
            })

            expect(mockShopperBaskets.addItemToBasket).toHaveBeenCalledWith({
                parameters: {basketId: 'mockBasketId'},
                body: [{productId: 'SKU', quantity: 1, optionItems: [{optionId: 'opt1'}]}]
            })
        })

        it('should include inventoryId when provided', async () => {
            const updated = {basketId: 'mockBasketId', productItems: []}
            mockShopperBaskets.addItemToBasket.mockResolvedValue(updated)

            await basketService.addProductToBasket('mockBasketId', {
                id: 'SKU',
                quantity: 1,
                inventoryId: 'inv1'
            })

            expect(mockShopperBaskets.addItemToBasket).toHaveBeenCalledWith({
                parameters: {basketId: 'mockBasketId'},
                body: [{productId: 'SKU', quantity: 1, inventoryId: 'inv1'}]
            })
        })

        it('should not update context when basketId does not match', async () => {
            const updated = {basketId: 'otherBasketId', productItems: []}
            mockShopperBaskets.addItemToBasket.mockResolvedValue(updated)

            const result = await basketService.addProductToBasket('otherBasketId', {
                id: 'SKU',
                quantity: 1
            })

            expect(result).toEqual(updated)
            expect(mockRes.locals.adyen.basket).not.toEqual(updated)
        })

        it('should throw on missing params', async () => {
            await expect(
                basketService.addProductToBasket('', {id: 'SKU', quantity: 1})
            ).rejects.toBeInstanceOf(Error)
            await expect(
                basketService.addProductToBasket('id', {quantity: 1})
            ).rejects.toBeInstanceOf(Error)
            await expect(
                basketService.addProductToBasket('id', {id: 'SKU'})
            ).rejects.toBeInstanceOf(Error)
            expect(mockShopperBaskets.addItemToBasket).not.toHaveBeenCalled()
        })
    })

    describe('addPaymentInstrument', () => {
        it('should preserve existing basket fields when SFCC response omits them', async () => {
            // Simulate SFCC returning a partial response that omits c_orderNo, basketId, currency
            // (observed for co-branded Carte Bancaire cards)
            const basketWithOrderNo = {
                basketId: 'mockBasketId',
                currency: 'EUR',
                c_orderNo: 'order-123',
                paymentInstruments: []
            }
            basketService.adyenContext.basket = basketWithOrderNo
            mockRes.locals.adyen.basket = basketWithOrderNo

            const partialResponse = {paymentInstruments: [{paymentInstrumentId: 'pi_new'}]}
            mockShopperBaskets.addPaymentInstrumentToBasket.mockResolvedValue(partialResponse)

            await basketService.addPaymentInstrument(
                {value: 100, currency: 'EUR'},
                {type: 'scheme', brand: 'cartebancaire'}
            )

            expect(mockRes.locals.adyen.basket.c_orderNo).toBe('order-123')
            expect(mockRes.locals.adyen.basket.basketId).toBe('mockBasketId')
            expect(mockRes.locals.adyen.basket.currency).toBe('EUR')
            expect(mockRes.locals.adyen.basket.paymentInstruments).toEqual([
                {paymentInstrumentId: 'pi_new'}
            ])
        })

        it('should correctly add a card payment instrument', async () => {
            const customFields = [{field: 'c_pspReference', value: 'mockPspReference'}]
            const paymentMethod = {type: 'scheme', brand: 'visa'}
            const amount = {value: 100, currency: 'USD'}

            const mockUpdatedBasket = {basketId: 'mockBasketId', paymentInstruments: [{}]}
            mockShopperBaskets.addPaymentInstrumentToBasket.mockResolvedValue(mockUpdatedBasket)

            await basketService.addPaymentInstrument(amount, paymentMethod, customFields)

            expect(mockShopperBaskets.addPaymentInstrumentToBasket).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        paymentMethodId: PAYMENT_METHODS.CREDIT_CARD,
                        c_pspReference: 'mockPspReference',
                        paymentCard: {cardType: 'Visa'},
                        c_pspReference: 'mockPspReference',
                        c_paymentMethodType: 'scheme',
                        c_paymentMethodBrand: 'visa'
                    })
                })
            )
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
        })

        it('should throw when amount is missing', async () => {
            await expect(
                basketService.addPaymentInstrument(null, {type: 'scheme'}, [
                    {field: 'c_pspReference', value: 'psp123'}
                ])
            ).rejects.toThrow()
        })

        it('should throw when paymentMethod is missing', async () => {
            await expect(
                basketService.addPaymentInstrument({value: 100, currency: 'USD'}, null, [
                    {field: 'c_pspReference', value: 'psp123'}
                ])
            ).rejects.toThrow()
        })

        it('should correctly add a component payment instrument', async () => {
            const customFields = [{field: 'c_pspReference', value: 'mockPspReference'}]
            const paymentMethod = {type: 'ideal'}
            const amount = {value: 100, currency: 'EUR'}

            const mockUpdatedBasket = {basketId: 'mockBasketId', paymentInstruments: [{}]}
            mockShopperBaskets.addPaymentInstrumentToBasket.mockResolvedValue(mockUpdatedBasket)

            await basketService.addPaymentInstrument(amount, paymentMethod, customFields)

            expect(mockShopperBaskets.addPaymentInstrumentToBasket).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        paymentMethodId: PAYMENT_METHODS.ADYEN_COMPONENT,
                        c_pspReference: 'mockPspReference',
                        c_paymentMethodType: 'ideal'
                    })
                })
            )
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
        })

        it('should ignore empty optional custom fields', async () => {
            const paymentMethod = {type: 'ideal'}
            const amount = {value: 100, currency: 'EUR'}

            const mockUpdatedBasket = {basketId: 'mockBasketId', paymentInstruments: [{}]}
            mockShopperBaskets.addPaymentInstrumentToBasket.mockResolvedValue(mockUpdatedBasket)

            await basketService.addPaymentInstrument(amount, paymentMethod, [
                {field: 'c_pspReference', value: null},
                {field: '', value: 'ignored'}
            ])

            expect(mockShopperBaskets.addPaymentInstrumentToBasket).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.not.objectContaining({
                        c_pspReference: expect.anything()
                    })
                })
            )
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
            // Mock all three sequential calls to return the updated basket
            mockShopperBaskets.updateShippingAddressForShipment.mockResolvedValue(mockUpdatedBasket)
            mockShopperBaskets.updateBillingAddressForBasket.mockResolvedValue(mockUpdatedBasket)
            mockShopperBaskets.updateCustomerForBasket.mockResolvedValue(mockUpdatedBasket)

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
            mockShopperBaskets.removePaymentInstrumentFromBasket.mockResolvedValue(finalBasketState)

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
            mockShopperBaskets.updateShippingAddressForShipment.mockResolvedValue(mockUpdatedBasket)

            const result = await basketService.updateShippingAddress(shippingData)

            expect(mockShopperBaskets.updateShippingAddressForShipment).toHaveBeenCalledWith({
                body: expect.any(Object),
                parameters: {basketId: 'mockBasketId', shipmentId: 'me'}
            })
            expect(mockRes.locals.adyen.basket).toEqual(mockUpdatedBasket)
            expect(result).toEqual(mockUpdatedBasket)
        })
    })

    describe('removeShippingAddress', () => {
        it('should call updateShippingAddressForShipment with null values and update context', async () => {
            const mockUpdatedBasket = {basketId: 'mockBasketId', shipments: [{}]}
            mockShopperBaskets.updateShippingAddressForShipment.mockResolvedValue(mockUpdatedBasket)

            const result = await basketService.removeShippingAddress()

            expect(mockShopperBaskets.updateShippingAddressForShipment).toHaveBeenCalledWith({
                body: {
                    address1: null,
                    city: null,
                    countryCode: null,
                    postalCode: null,
                    stateCode: null,
                    firstName: null,
                    fullName: null,
                    lastName: null,
                    phone: null
                },
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
            mockShopperBaskets.updateShippingMethodForShipment.mockResolvedValue(mockUpdatedBasket)

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
