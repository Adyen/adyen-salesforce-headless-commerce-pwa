import {fetchPaymentMethods, fetchEnvironment} from '../adyen-express-checkout-context'

let mockFetchPaymentMethods = jest.fn()
let mockFetchEnvironment = jest.fn()

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

describe('fetchPaymentMethods function', () => {
    let mockGetTokenWhenReady

    beforeEach(() => {
        mockGetTokenWhenReady = jest.fn().mockResolvedValue('mockToken')
        mockFetchEnvironment.mockImplementationOnce(() => ({
            ADYEN_ENVIRONMENT: 'test',
            ADYEN_CLIENT_KEY: 'testKey'
        }))
        mockFetchPaymentMethods.mockImplementationOnce(() => paymentMethodsResponse)
    })

    test('returns payment methods when fetch is successful', async () => {
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
})

describe('fetchEnvironment function', () => {
    let mockGetTokenWhenReady

    beforeEach(() => {
        mockGetTokenWhenReady = jest.fn().mockResolvedValue('mockToken')
        mockFetchPaymentMethods.mockImplementationOnce(() => paymentMethodsResponse)
    })

    test('returns payment methods when fetch is successful', async () => {
        const site = 'mockSite'

        const environment = await fetchEnvironment(site, mockGetTokenWhenReady)

        expect(environment).toEqual({
            ADYEN_ENVIRONMENT: 'test',
            ADYEN_CLIENT_KEY: 'testKey'
        })
        expect(mockGetTokenWhenReady).toHaveBeenCalledTimes(1)
    })
})
