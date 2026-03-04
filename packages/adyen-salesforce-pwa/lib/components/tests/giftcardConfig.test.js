import {giftcardConfig} from '../giftcard/config'
import {GiftCardService} from '../../services/giftCard'
import {executeCallbacks} from '../../utils/executeCallbacks'
import {baseConfig} from '../helpers/baseConfig'

jest.mock('../../services/giftCard')
jest.mock('../../utils/executeCallbacks')
jest.mock('../helpers/baseConfig')

describe('giftcardConfig', () => {
    let mockBalanceCheck
    let mockCreateOrder
    let mockCancelOrder
    let props

    beforeEach(() => {
        jest.clearAllMocks()

        mockBalanceCheck = jest.fn()
        mockCreateOrder = jest.fn()
        mockCancelOrder = jest.fn()

        GiftCardService.mockImplementation(() => ({
            balanceCheck: mockBalanceCheck,
            createOrder: mockCreateOrder,
            cancelOrder: mockCancelOrder
        }))

        baseConfig.mockReturnValue({amount: {value: 1000, currency: 'USD'}})

        executeCallbacks.mockImplementation((callbacks) => {
            return async (...args) => {
                for (const cb of callbacks) {
                    await cb(...args)
                }
            }
        })

        props = {
            token: 'test-token',
            customerId: 'customer-123',
            basket: {basketId: 'basket-456'},
            site: {id: 'RefArch'},
            setAdyenOrder: jest.fn()
        }
    })

    it('should create GiftCardService with correct parameters', () => {
        giftcardConfig(props)

        expect(GiftCardService).toHaveBeenCalledWith('test-token', 'customer-123', 'basket-456', {
            id: 'RefArch'
        })
    })

    it('should include base config in result', () => {
        const result = giftcardConfig(props)

        expect(baseConfig).toHaveBeenCalledWith(props)
        expect(result.amount).toEqual({value: 1000, currency: 'USD'})
    })

    it('should have onBalanceCheck, onOrderRequest, and onOrderCancel', () => {
        const result = giftcardConfig(props)

        expect(executeCallbacks).toHaveBeenCalledTimes(3)
        expect(result.onBalanceCheck).toBeDefined()
        expect(result.onOrderRequest).toBeDefined()
        expect(result.onOrderCancel).toBeDefined()
    })

    describe('onBalanceCheck callback', () => {
        it('should resolve with response on success', async () => {
            const mockResponse = {balance: {value: 5000}}
            mockBalanceCheck.mockResolvedValue(mockResponse)
            const resolve = jest.fn()
            const reject = jest.fn()

            const config = giftcardConfig(props)
            await config.onBalanceCheck(resolve, reject, {paymentMethod: {type: 'giftcard'}})

            expect(mockBalanceCheck).toHaveBeenCalledWith({paymentMethod: {type: 'giftcard'}})
            expect(resolve).toHaveBeenCalledWith(mockResponse)
            expect(reject).not.toHaveBeenCalled()
        })

        it('should reject when response has error', async () => {
            mockBalanceCheck.mockResolvedValue({error: true, errorMessage: 'Invalid card'})
            const resolve = jest.fn()
            const reject = jest.fn()

            const config = giftcardConfig(props)
            await config.onBalanceCheck(resolve, reject, {})

            expect(resolve).not.toHaveBeenCalled()
            expect(reject).toHaveBeenCalledWith('Invalid card')
        })

        it('should reject when balanceCheck throws', async () => {
            mockBalanceCheck.mockRejectedValue(new Error('Network error'))
            const resolve = jest.fn()
            const reject = jest.fn()

            const config = giftcardConfig(props)
            await config.onBalanceCheck(resolve, reject, {})

            expect(reject).toHaveBeenCalledWith('Network error')
        })
    })

    describe('onOrderRequest callback', () => {
        it('should resolve with response on success', async () => {
            const mockResponse = {orderData: 'order-data-123'}
            mockCreateOrder.mockResolvedValue(mockResponse)
            const resolve = jest.fn()
            const reject = jest.fn()

            const config = giftcardConfig(props)
            await config.onOrderRequest(resolve, reject, {paymentMethod: {type: 'giftcard'}})

            expect(mockCreateOrder).toHaveBeenCalledWith({paymentMethod: {type: 'giftcard'}})
            expect(resolve).toHaveBeenCalledWith(mockResponse)
        })

        it('should reject when response has error', async () => {
            mockCreateOrder.mockResolvedValue({error: true, errorMessage: 'Order failed'})
            const resolve = jest.fn()
            const reject = jest.fn()

            const config = giftcardConfig(props)
            await config.onOrderRequest(resolve, reject, {})

            expect(reject).toHaveBeenCalledWith('Order failed')
        })

        it('should reject when createOrder throws', async () => {
            mockCreateOrder.mockRejectedValue(new Error('Service unavailable'))
            const resolve = jest.fn()
            const reject = jest.fn()

            const config = giftcardConfig(props)
            await config.onOrderRequest(resolve, reject, {})

            expect(reject).toHaveBeenCalledWith('Service unavailable')
        })
    })

    describe('onOrderCancel callback', () => {
        it('should set adyen order to null when cancel is final and successful', async () => {
            mockCancelOrder.mockResolvedValue({isFinal: true, isSuccessful: true})

            const config = giftcardConfig(props)
            await config.onOrderCancel({orderData: 'abc'})

            expect(mockCancelOrder).toHaveBeenCalledWith({orderData: 'abc'})
            expect(props.setAdyenOrder).toHaveBeenCalledWith(null)
        })

        it('should throw when response has error', async () => {
            mockCancelOrder.mockResolvedValue({error: true, errorMessage: 'Cancel failed'})

            const config = giftcardConfig(props)
            await expect(config.onOrderCancel({})).rejects.toThrow('Cancel failed')
        })

        it('should throw default message when response has error but no message', async () => {
            mockCancelOrder.mockResolvedValue({error: true})

            const config = giftcardConfig(props)
            await expect(config.onOrderCancel({})).rejects.toThrow(
                'Gift card order cancellation failed'
            )
        })

        it('should throw when cancel is not successful', async () => {
            mockCancelOrder.mockResolvedValue({isFinal: true, isSuccessful: false})

            const config = giftcardConfig(props)
            await expect(config.onOrderCancel({})).rejects.toThrow(
                'Gift card order cancellation was not successful'
            )
        })

        it('should throw when cancelOrder rejects', async () => {
            mockCancelOrder.mockRejectedValue(new Error('Network error'))

            const config = giftcardConfig(props)
            await expect(config.onOrderCancel({})).rejects.toThrow('Network error')
        })
    })
})
