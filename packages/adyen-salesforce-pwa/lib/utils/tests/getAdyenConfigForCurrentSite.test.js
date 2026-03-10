import {getAdyenConfigForCurrentSite, setProperty} from '../getAdyenConfigForCurrentSite.mjs'

describe('getAdyenConfigForCurrentSite', () => {
    it('returns the correct Adyen configuration for a given site', () => {
        process.env = {
            site1_ADYEN_API_KEY: 'site1_api_key',
            site1_ADYEN_CLIENT_KEY: 'site1_client_key'
        }

        const siteId = 'site1'
        const expectedConfig = {
            apiKey: 'site1_api_key',
            clientKey: 'site1_client_key',
            environment: '',
            merchantAccount: '',
            systemIntegratorName: '',
            webhookHmacKey: '',
            webhookPassword: '',
            webhookUser: '',
            liveEndpointUrlPrefix: '',
            appleDomainAssociation: '',
            giftCardExpirationTime: '',
            l23Enabled: '',
            l23CommodityCode: ''
        }

        const result = getAdyenConfigForCurrentSite(siteId)
        expect(result).toEqual(expectedConfig)
    })

    it('returns an empty values when siteId is not provided', () => {
        const result = getAdyenConfigForCurrentSite()
        expect(result).toEqual({
            apiKey: '',
            clientKey: '',
            environment: '',
            merchantAccount: '',
            systemIntegratorName: '',
            webhookHmacKey: '',
            webhookPassword: '',
            webhookUser: '',
            liveEndpointUrlPrefix: '',
            appleDomainAssociation: '',
            giftCardExpirationTime: '',
            l23Enabled: '',
            l23CommodityCode: ''
        })
    })

    it('does not include nativeThreeDS when no options are provided', () => {
        const result = getAdyenConfigForCurrentSite('site1')
        expect(result).not.toHaveProperty('nativeThreeDS')
    })
})

describe('getAdyenConfigForCurrentSite with options', () => {
    it('sets nativeThreeDS from options (sourced from default.js adyenAPI config)', () => {
        const result = getAdyenConfigForCurrentSite('site1', {nativeThreeDS: 'disabled'})

        expect(result.nativeThreeDS).toBe('disabled')
    })

    it('sets nativeThreeDS to preferred when options specifies preferred', () => {
        const result = getAdyenConfigForCurrentSite('site1', {nativeThreeDS: 'preferred'})

        expect(result.nativeThreeDS).toBe('preferred')
    })

    it('ignores unknown option keys (only allows ALLOWED_OPTIONS)', () => {
        const result = getAdyenConfigForCurrentSite(undefined, {
            unknownKey: 'value',
            nativeThreeDS: 'disabled'
        })

        expect(result.nativeThreeDS).toBe('disabled')
        expect(result).not.toHaveProperty('unknownKey')
    })

    it('does not set nativeThreeDS when options is empty', () => {
        const result = getAdyenConfigForCurrentSite('site1', {})

        expect(result).not.toHaveProperty('nativeThreeDS')
    })
})

describe('setProperty', () => {
    it('returns the correct property value from process.env when available', () => {
        process.env = {
            site1_A_PROPERTY: 'property_value'
        }

        const siteId = 'site1'
        const property = 'A_PROPERTY'
        const result = setProperty(siteId, property)

        expect(result).toBe('property_value')
    })

    it('returns an empty string when property is not found in process.env', () => {
        process.env = {}
        const siteId = 'site1'
        const property = 'NON_EXISTENT_PROPERTY'
        const result = setProperty(siteId, property)

        expect(result).toBe('')
    })
})
