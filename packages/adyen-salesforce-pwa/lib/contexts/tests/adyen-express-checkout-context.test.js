import {
    fetchPaymentMethods,
    fetchEnvironment,
    fetchShippingMethods
} from '../adyen-express-checkout-context'

let mockFetchPaymentMethods = jest.fn()
let mockFetchEnvironment = jest.fn()
let mockFetchShippingMethods = jest.fn()

jest.mock('../../services/payment-methods', () => ({
    AdyenPaymentMethodsService: jest.fn().mockImplementation(() => ({
        fetchPaymentMethods: mockFetchPaymentMethods
    }))
}))

jest.mock('../../services/environment', () => ({
    AdyenEnvironmentService: jest.fn().mockImplementation(() => ({
        fetchEnvironment: mockFetchEnvironment
    }))
}))

jest.mock('../../services/shipping-methods', () => ({
    AdyenShippingMethodsService: jest.fn().mockImplementation(() => ({
        getShippingMethods: mockFetchShippingMethods
    }))
}))

const paymentMethodsResponse = {
    paymentMethods: [
        {
            details: [
                {
                    key: 'encryptedCardNumber',
                    type: 'cardToken'
                },
                {
                    key: 'encryptedSecurityCode',
                    type: 'cardToken'
                },
                {
                    key: 'encryptedExpiryMonth',
                    type: 'cardToken'
                },
                {
                    key: 'encryptedExpiryYear',
                    type: 'cardToken'
                },
                {
                    key: 'holderName',
                    optional: true,
                    type: 'text'
                }
            ],
            name: 'Cards',
            type: 'scheme'
        },
        {
            name: 'Amazon Pay',
            type: 'amazonpay'
        }
    ]
}

const shippingMethodsResponse = [
    {
        id: '001',
        name: 'global'
    }
]

describe('fetchPaymentMethods function', () => {
    let mockGetTokenWhenReady

    beforeEach(() => {
        mockGetTokenWhenReady = jest.fn().mockResolvedValue('mockToken')
    })

    it('returns payment methods when fetch is successful', async () => {
        mockFetchPaymentMethods.mockImplementationOnce(() => paymentMethodsResponse)
        const customerId = 'mockCustomerId'
        const site = 'mockSite'
        const locale = 'en-US'

        const paymentMethods = await fetchPaymentMethods(
            customerId,
            site,
            locale,
            mockGetTokenWhenReady
        )

        expect(paymentMethods).toEqual(paymentMethodsResponse)
        expect(mockGetTokenWhenReady).toHaveBeenCalledTimes(1)
    })

    it('returns null when fetch fails', async () => {
        mockFetchPaymentMethods.mockRejectedValue(() => new Error('Failed to payment methods'))
        const customerId = 'mockCustomerId'
        const site = 'mockSite'
        const locale = 'en-US'

        const paymentMethods = await fetchPaymentMethods(
            customerId,
            site,
            locale,
            mockGetTokenWhenReady
        )

        expect(paymentMethods).toBeNull()
        expect(mockGetTokenWhenReady).toHaveBeenCalledTimes(1)
    })
})

describe('fetchEnvironment function', () => {
    let mockGetTokenWhenReady

    beforeEach(() => {
        mockGetTokenWhenReady = jest.fn().mockResolvedValue('mockToken')
    })

    it('returns environment when fetch is successful', async () => {
        mockFetchEnvironment.mockImplementationOnce(() => ({
            ADYEN_ENVIRONMENT: 'test',
            ADYEN_CLIENT_KEY: 'testKey'
        }))
        const site = 'mockSite'

        const environment = await fetchEnvironment(site, mockGetTokenWhenReady)

        expect(environment).toEqual({
            ADYEN_ENVIRONMENT: 'test',
            ADYEN_CLIENT_KEY: 'testKey'
        })
        expect(mockGetTokenWhenReady).toHaveBeenCalledTimes(1)
    })

    it('returns null when fetch fails', async () => {
        mockFetchEnvironment.mockRejectedValue(() => new Error('Failed to fetch environment'))
        const site = 'mockSite'

        const environmentData = await fetchEnvironment(site, mockGetTokenWhenReady)

        expect(environmentData).toBeNull()
        expect(mockGetTokenWhenReady).toHaveBeenCalledTimes(1)
    })
})

describe('fetchShippingMethods function', () => {
    let mockGetTokenWhenReady

    beforeEach(() => {
        mockGetTokenWhenReady = jest.fn().mockResolvedValue('mockToken')
    })

    it('returns shipping methods when fetch is successful', async () => {
        mockFetchShippingMethods.mockImplementationOnce(() => shippingMethodsResponse)

        const basketId = 'basket-id'
        const site = 'mockSite'

        const shippingMethods = await fetchShippingMethods(basketId, site, mockGetTokenWhenReady)

        expect(shippingMethods).toEqual(shippingMethodsResponse)
        expect(mockGetTokenWhenReady).toHaveBeenCalledTimes(1)
    })

    it('returns null when fetch fails', async () => {
        mockFetchShippingMethods.mockRejectedValue(
            () => new Error('Failed to fetch shipping methods')
        )
        const basketId = 'basket-id'
        const site = 'mockSite'

        const shippingMethods = await fetchShippingMethods(basketId, site, mockGetTokenWhenReady)

        expect(shippingMethods).toBeNull()
        expect(mockGetTokenWhenReady).toHaveBeenCalledTimes(1)
    })
})
