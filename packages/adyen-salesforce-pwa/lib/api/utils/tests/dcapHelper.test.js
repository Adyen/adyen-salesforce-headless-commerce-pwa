import {getMissingDcapFields, warnForMissingDcapFields} from '../dcapHelper'
import Logger from '../../models/logger'
import {PAYMENT_METHOD_TYPES, SHOPPER_INTERACTIONS} from '../../../utils/constants.mjs'

jest.mock('../../models/logger')

const getEligiblePaymentRequest = () => ({
    shopperInteraction: SHOPPER_INTERACTIONS.ECOMMERCE,
    paymentMethod: {type: PAYMENT_METHOD_TYPES.CREDIT_CARD},
    shopperIP: '192.0.2.1',
    shopperEmail: 'shopper@example.com',
    billingAddress: {
        city: 'New York',
        country: 'US',
        houseNumberOrName: '1',
        postalCode: '10001',
        stateOrProvince: 'NY',
        street: 'Main Street'
    },
    deviceFingerprint: 'merchant-device-fingerprint'
})

describe('dcapHelper', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns all missing DCAP fields for an eligible US card payment', () => {
        const paymentRequest = {
            shopperInteraction: SHOPPER_INTERACTIONS.ECOMMERCE,
            paymentMethod: {type: PAYMENT_METHOD_TYPES.CREDIT_CARD},
            billingAddress: {country: 'US'}
        }

        expect(getMissingDcapFields(paymentRequest)).toEqual([
            'shopperIP',
            'shopperEmail',
            'billingAddress.city',
            'billingAddress.houseNumberOrName',
            'billingAddress.postalCode',
            'billingAddress.stateOrProvince',
            'billingAddress.street',
            'deviceFingerprint'
        ])
    })

    it.each([
        ['non-US payment', {billingAddress: {country: 'CA'}}],
        ['non-card payment', {paymentMethod: {type: 'paypal'}}],
        ['continuous authorization', {shopperInteraction: SHOPPER_INTERACTIONS.CONT_AUTH}]
    ])('does not report missing fields for a %s', (_scenario, overrides) => {
        const paymentRequest = {...getEligiblePaymentRequest(), ...overrides}

        expect(getMissingDcapFields(paymentRequest)).toEqual([])
    })

    it('reports missing billing fields when US eligibility comes from countryCode', () => {
        const paymentRequest = getEligiblePaymentRequest()
        delete paymentRequest.billingAddress
        paymentRequest.countryCode = 'US'

        expect(getMissingDcapFields(paymentRequest)).toEqual([
            'billingAddress.city',
            'billingAddress.country',
            'billingAddress.houseNumberOrName',
            'billingAddress.postalCode',
            'billingAddress.stateOrProvince',
            'billingAddress.street'
        ])
    })

    it('accepts Adyen Web risk data as device fingerprint data', () => {
        const paymentRequest = getEligiblePaymentRequest()
        delete paymentRequest.deviceFingerprint
        paymentRequest.riskData = {clientData: 'adyen-risk-client-data'}

        expect(getMissingDcapFields(paymentRequest)).toEqual([])
    })

    it('accepts numeric billing address values', () => {
        const paymentRequest = getEligiblePaymentRequest()
        paymentRequest.billingAddress.houseNumberOrName = 1
        paymentRequest.billingAddress.postalCode = 10001

        expect(getMissingDcapFields(paymentRequest)).toEqual([])
    })

    it('reports empty and placeholder values by field name', () => {
        const paymentRequest = getEligiblePaymentRequest()
        paymentRequest.shopperIP = ''
        paymentRequest.shopperEmail = ' '
        paymentRequest.billingAddress.houseNumberOrName = 'N/A'
        paymentRequest.billingAddress.stateOrProvince = 'ZZ'
        paymentRequest.deviceFingerprint = null

        expect(getMissingDcapFields(paymentRequest)).toEqual([
            'shopperIP',
            'shopperEmail',
            'billingAddress.houseNumberOrName',
            'billingAddress.stateOrProvince',
            'deviceFingerprint'
        ])
    })

    it('logs only missing field names for incomplete eligible payments', () => {
        const paymentRequest = getEligiblePaymentRequest()
        paymentRequest.shopperIP = ''
        paymentRequest.deviceFingerprint = ''

        warnForMissingDcapFields(paymentRequest)

        expect(Logger.warn).toHaveBeenCalledWith(
            'warnForMissingDcapFields',
            'DCAP data missing for US card payment: shopperIP, deviceFingerprint'
        )
        expect(Logger.warn.mock.calls[0].join(' ')).not.toContain('shopper@example.com')
    })

    it('does not log complete eligible payments', () => {
        warnForMissingDcapFields(getEligiblePaymentRequest())

        expect(Logger.warn).not.toHaveBeenCalled()
    })
})
