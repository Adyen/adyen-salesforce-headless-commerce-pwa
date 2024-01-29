import {getAdyenConfigForCurrentSite} from '../getAdyenConfigForCurrentSite.mjs' // Replace with the actual path

import * as ssrConfigUtils from '@salesforce/pwa-kit-runtime/utils/ssr-config'

describe('getAdyenConfigForCurrentSite', () => {
    it('should return correct Adyen configuration for the current site', () => {
        const mockConfig = {
            app: {
                commerceAPI: {
                    parameters: {
                        siteId: 'currentSiteId'
                    }
                },
                sites: [
                    {
                        id: 'currentSiteId',
                        adyen: {
                            clientKey: 'mockClientKey',
                            environment: 'mockEnvironment',
                            merchantAccount: 'mockMerchantAccount'
                        }
                    }
                ]
            }
        }

        jest.spyOn(ssrConfigUtils, 'getConfig').mockReturnValue(mockConfig)

        const adyenConfig = getAdyenConfigForCurrentSite('RefArch')

        expect(adyenConfig).toEqual({
            clientKey: 'mockClientKey',
            environment: 'mockEnvironment',
            merchantAccount: 'mockMerchantAccount'
        })
    })
})
