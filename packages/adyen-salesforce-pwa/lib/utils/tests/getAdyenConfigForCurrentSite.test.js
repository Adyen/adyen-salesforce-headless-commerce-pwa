import {getAdyenConfigForCurrentSite} from '../getAdyenConfigForCurrentSite.mjs'

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
            environment: undefined,
            merchantAccount: undefined,
            systemIntegratorName: undefined,
            webhookHmacKey: undefined,
            webhookPassword: undefined,
            webhookUser: undefined,
            liveEndpointUrlPrefix: undefined,
            appleDomainAssociation: undefined,
            nativeThreeDS: undefined,
            giftCardExpirationTime: undefined,
            l23Enabled: undefined,
            l23CommodityCode: undefined
        }

        const result = getAdyenConfigForCurrentSite(siteId)
        expect(result).toEqual(expectedConfig)
    })

    it('returns undefined values when siteId is not provided', () => {
        const result = getAdyenConfigForCurrentSite()
        expect(result).toEqual({
            apiKey: undefined,
            clientKey: undefined,
            environment: undefined,
            merchantAccount: undefined,
            systemIntegratorName: undefined,
            webhookHmacKey: undefined,
            webhookPassword: undefined,
            webhookUser: undefined,
            liveEndpointUrlPrefix: undefined,
            appleDomainAssociation: undefined,
            nativeThreeDS: undefined,
            giftCardExpirationTime: undefined,
            l23Enabled: undefined,
            l23CommodityCode: undefined
        })
    })

    it('returns undefined nativeThreeDS when no options or env are provided', () => {
        const result = getAdyenConfigForCurrentSite('site1')
        expect(result.nativeThreeDS).toBeUndefined()
    })
})

describe('getAdyenConfigForCurrentSite with options', () => {
    it('sets nativeThreeDS from options using env variable name', () => {
        const result = getAdyenConfigForCurrentSite('site1', {ADYEN_NATIVE_3DS: 'disabled'})

        expect(result.nativeThreeDS).toBe('disabled')
    })

    it('sets nativeThreeDS to preferred when options specifies preferred', () => {
        const result = getAdyenConfigForCurrentSite('site1', {ADYEN_NATIVE_3DS: 'preferred'})

        expect(result.nativeThreeDS).toBe('preferred')
    })

    it('only maps known config keys from options', () => {
        const result = getAdyenConfigForCurrentSite(undefined, {
            UNKNOWN_KEY: 'value',
            ADYEN_NATIVE_3DS: 'disabled'
        })

        expect(result.nativeThreeDS).toBe('disabled')
        expect(result).not.toHaveProperty('UNKNOWN_KEY')
        expect(result).not.toHaveProperty('unknownKey')
    })

    it('returns undefined nativeThreeDS when options is empty', () => {
        const result = getAdyenConfigForCurrentSite('site1', {})

        expect(result.nativeThreeDS).toBeUndefined()
    })

    it('supports site-specific options override', () => {
        const result = getAdyenConfigForCurrentSite('site1', {
            ADYEN_NATIVE_3DS: 'disabled',
            site1_ADYEN_NATIVE_3DS: 'enabled'
        })

        expect(result.nativeThreeDS).toBe('enabled')
    })

    it('prioritizes options over env variables', () => {
        process.env.ADYEN_NATIVE_3DS = 'env-value'
        const result = getAdyenConfigForCurrentSite('site1', {
            ADYEN_NATIVE_3DS: 'option-value'
        })

        expect(result.nativeThreeDS).toBe('option-value')
    })
})
