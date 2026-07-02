import DonationsController from '../donations'
import AdyenClientProvider from '../../models/adyenClientProvider'
import Logger from '../../models/logger'
import {AdyenError} from '../../models/AdyenError'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'
import {updateOrderPaymentInstrument} from '../../helpers/orderHelper'

let mockDonationCampaigns = jest.fn()
let mockDonations = jest.fn()

jest.mock('../../models/logger')
jest.mock('../../models/adyenClientProvider')
jest.mock('../../helpers/orderHelper', () => ({
    updateOrderPaymentInstrument: jest.fn()
}))

describe('donations controller', () => {
    let req, res, next

    const mockOrder = {
        orderNo: '00001234',
        orderTotal: 100.0,
        currency: 'USD',
        c_donationToken: 'donationToken123',
        c_pspReference: 'pspReference123',
        paymentInstruments: [
            {
                paymentInstrumentId: 'pi123',
                c_paymentMethodType: 'scheme',
                c_pspReference: 'pspReference123',
                c_donationToken: 'donationToken123'
            }
        ]
    }

    const mockAdyenConfig = {
        merchantAccount: 'TestMerchant'
    }

    const mockAdyenContext = {
        order: mockOrder,
        adyenConfig: mockAdyenConfig,
        siteId: 'RefArch'
    }

    beforeEach(() => {
        req = {
            body: {}
        }
        res = {
            locals: {
                adyen: mockAdyenContext
            }
        }
        next = jest.fn()

        jest.clearAllMocks()
        updateOrderPaymentInstrument.mockResolvedValue({})

        // Mock AdyenClientProvider
        AdyenClientProvider.mockImplementation(() => ({
            getDonationsApi: () => ({
                donationCampaigns: mockDonationCampaigns,
                donations: mockDonations
            })
        }))
    })

    describe('donationCampaigns', () => {
        test('should successfully fetch donation campaigns and attach response', async () => {
            const mockCampaignsResponse = {
                campaigns: [
                    {
                        id: 'campaign1',
                        name: 'Test Campaign',
                        description: 'A test campaign'
                    }
                ]
            }
            mockDonationCampaigns.mockResolvedValue(mockCampaignsResponse)

            await DonationsController.donationCampaigns(req, res, next)

            expect(AdyenClientProvider).toHaveBeenCalledWith(mockAdyenContext)
            expect(mockDonationCampaigns).toHaveBeenCalledWith({
                merchantAccount: 'TestMerchant',
                currency: 'USD'
            })
            expect(res.locals.response).toEqual({
                ...mockCampaignsResponse,
                orderTotal: 10000
            })
            expect(Logger.info).toHaveBeenCalledWith('donationCampaigns', 'start')
            expect(Logger.info).toHaveBeenCalledWith('donationCampaigns', 'success')
            expect(next).toHaveBeenCalledWith()
        })

        test('should call next with error when adyenContext is missing', async () => {
            res.locals.adyen = null

            await DonationsController.donationCampaigns(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donationCampaigns', expectedError.message)
        })

        test('should call next with error when order is missing from context', async () => {
            res.locals.adyen = {adyenConfig: mockAdyenConfig}

            await DonationsController.donationCampaigns(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donationCampaigns', expectedError.message)
        })

        test('should call next with error when Adyen donationCampaigns API throws', async () => {
            const mockError = new Error('Adyen API error')
            mockDonationCampaigns.mockRejectedValue(mockError)

            await DonationsController.donationCampaigns(req, res, next)

            expect(next).toHaveBeenCalledWith(mockError)
            expect(Logger.error).toHaveBeenCalledWith('donationCampaigns', mockError.message)
        })
    })

    describe('donate', () => {
        const mockDonationData = {
            donationCampaignId: 'campaign1',
            donationAmount: {currency: 'USD', value: 1000}
        }

        const mockCampaignsForDonate = {
            donationCampaigns: [
                {
                    id: 'campaign1',
                    name: 'Test Campaign',
                    donation: {type: 'fixedAmounts', values: [500, 1000, 2000]}
                }
            ]
        }

        beforeEach(() => {
            req.body = {data: mockDonationData}
            mockDonationCampaigns.mockResolvedValue(mockCampaignsForDonate)
        })

        test('should successfully submit donation and attach response', async () => {
            const mockDonationResponse = {
                status: 'completed'
            }
            mockDonations.mockResolvedValue(mockDonationResponse)

            await DonationsController.donate(req, res, next)

            expect(AdyenClientProvider).toHaveBeenCalledWith(mockAdyenContext)
            expect(mockDonations).toHaveBeenCalledWith({
                merchantAccount: 'TestMerchant',
                donationCampaignId: 'campaign1',
                amount: {currency: 'USD', value: 1000},
                reference: 'TestMerchant-00001234',
                donationOriginalPspReference: 'pspReference123',
                donationToken: 'donationToken123'
            })
            expect(updateOrderPaymentInstrument).toHaveBeenCalledWith(
                '00001234',
                'RefArch',
                'pspReference123',
                {donationToken: null}
            )
            expect(res.locals.response).toEqual(mockDonationResponse)
            expect(Logger.info).toHaveBeenCalledWith('donate', 'start')
            expect(Logger.info).toHaveBeenCalledWith('donate', 'success')
            expect(next).toHaveBeenCalledWith()
        })

        test('should call next with error when adyenContext is missing', async () => {
            res.locals.adyen = null

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should call next with error when req.body.data is missing', async () => {
            req.body = {}

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.INVALID_PARAMS, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should call next with error when order is missing from context', async () => {
            res.locals.adyen = {adyenConfig: mockAdyenConfig}

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.ORDER_NOT_FOUND, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should still succeed when donationToken nullification fails', async () => {
            const mockDonationResponse = {
                status: 'completed'
            }
            mockDonations.mockResolvedValue(mockDonationResponse)
            updateOrderPaymentInstrument.mockRejectedValue(
                new Error('Failed to update payment instrument')
            )

            await DonationsController.donate(req, res, next)

            expect(res.locals.response).toEqual(mockDonationResponse)
            expect(next).toHaveBeenCalledWith()
            expect(Logger.error).toHaveBeenCalledWith(
                'donate',
                'Failed to clear donationToken after successful donation: Failed to update payment instrument'
            )
        })

        test('should call next with error when Adyen donations API throws', async () => {
            const mockError = new Error('Donation API error')
            mockDonations.mockRejectedValue(mockError)
            mockDonationCampaigns.mockResolvedValue(mockCampaignsForDonate)

            await DonationsController.donate(req, res, next)

            expect(next).toHaveBeenCalledWith(mockError)
            expect(Logger.error).toHaveBeenCalledWith('donate', mockError.message)
        })

        test('should call next with error when donation campaign is not found', async () => {
            req.body = {data: {...mockDonationData, donationCampaignId: 'nonexistent-campaign'}}

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.DONATION_CAMPAIGN_NOT_FOUND, 400)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should call next with error when order has only gift-card payment instruments', async () => {
            res.locals.adyen = {
                ...mockAdyenContext,
                order: {
                    ...mockOrder,
                    paymentInstruments: [
                        {paymentInstrumentId: 'gi123', c_paymentMethodType: 'giftcard'}
                    ]
                }
            }

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.PAYMENT_INSTRUMENT_NOT_FOUND, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.info).toHaveBeenCalledWith(
                'donate',
                'no non-gift-card payment instrument found on order \u2014 skipping'
            )
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should call next with error when non-gift-card instrument has no paymentInstrumentId', async () => {
            res.locals.adyen = {
                ...mockAdyenContext,
                order: {
                    ...mockOrder,
                    paymentInstruments: [{c_paymentMethodType: 'scheme'}]
                }
            }

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.PAYMENT_INSTRUMENT_NOT_FOUND, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should process roundup donation successfully when amount matches', async () => {
            const roundupCampaign = {
                donationCampaigns: [
                    {
                        id: 'campaign1',
                        donation: {type: 'roundup', maxRoundupAmount: 100}
                    }
                ]
            }
            mockDonationCampaigns.mockResolvedValue(roundupCampaign)
            mockDonations.mockResolvedValue({status: 'completed'})

            // orderTotal = 99.5 USD → 9950 minor units
            // roundUpAmount = 100 - (9950 % 100) = 100 - 50 = 50
            res.locals.adyen = {
                ...mockAdyenContext,
                order: {...mockOrder, orderTotal: 99.5}
            }
            req.body = {data: {...mockDonationData, donationAmount: {currency: 'USD', value: 50}}}

            await DonationsController.donate(req, res, next)

            expect(next).toHaveBeenCalledWith()
            expect(res.locals.response).toEqual({status: 'completed'})
        })

        test('should call next with error for roundup type when amount does not match', async () => {
            const roundupCampaign = {
                donationCampaigns: [
                    {
                        id: 'campaign1',
                        donation: {type: 'roundup', maxRoundupAmount: 100}
                    }
                ]
            }
            mockDonationCampaigns.mockResolvedValue(roundupCampaign)

            // orderTotal = 99.5 USD → 9950 minor units; roundUpAmount = 50, but sending 75
            res.locals.adyen = {
                ...mockAdyenContext,
                order: {...mockOrder, orderTotal: 99.5}
            }
            req.body = {data: {...mockDonationData, donationAmount: {currency: 'USD', value: 75}}}

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.DONATION_AMOUNT_MISMATCH, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should call next with error for fixedAmounts type when value is not in allowed list', async () => {
            req.body = {
                data: {...mockDonationData, donationAmount: {currency: 'USD', value: 750}}
            }

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.DONATION_AMOUNT_MISMATCH, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })

        test('should call next with error when donation status is not completed', async () => {
            mockDonations.mockResolvedValue({status: 'failed'})

            await DonationsController.donate(req, res, next)

            const expectedError = new AdyenError(ERROR_MESSAGE.DONATION_NOT_COMPLETED, 500)
            expect(next).toHaveBeenCalledWith(expectedError)
            expect(Logger.error).toHaveBeenCalledWith('donate', expectedError.message)
        })
    })
})
