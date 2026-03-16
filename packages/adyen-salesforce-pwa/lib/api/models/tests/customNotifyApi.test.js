import {CustomNotifyApiClient} from '../customNotifyApi'
import {BaseApiClient} from '../baseApiClient'

jest.mock('../baseApiClient')

describe('CustomNotifyApiClient', () => {
    let client

    beforeEach(() => {
        jest.clearAllMocks()
        BaseApiClient.mockImplementation(function (baseUrl, siteId) {
            this.baseUrl = baseUrl
            this.siteId = siteId
            this._callAdminApi = jest.fn()
        })
        client = new CustomNotifyApiClient('RefArch')
    })

    describe('constructor', () => {
        it('should call BaseApiClient with the correct base URL', () => {
            expect(BaseApiClient).toHaveBeenCalledWith(
                `https://${process.env.COMMERCE_API_SHORT_CODE}.api.commercecloud.salesforce.com/custom/adyen-notify/v1/organizations/${process.env.COMMERCE_API_ORG_ID}`,
                'RefArch'
            )
        })
    })

    describe('notify', () => {
        it('should call _callAdminApi with correct parameters and return parsed JSON', async () => {
            const mockNotification = {eventCode: 'AUTHORISATION', success: true}
            const mockResponse = {json: jest.fn().mockResolvedValue({received: true})}
            client._callAdminApi.mockResolvedValue(mockResponse)

            const result = await client.notify(mockNotification)

            expect(client._callAdminApi).toHaveBeenCalledWith('POST', 'notify', {
                body: JSON.stringify({notificationData: mockNotification})
            })
            expect(result).toEqual({received: true})
        })

        it('should propagate errors from _callAdminApi', async () => {
            const mockError = new Error('API error')
            client._callAdminApi.mockRejectedValue(mockError)

            await expect(client.notify({eventCode: 'AUTHORISATION'})).rejects.toThrow('API error')
        })
    })
})
