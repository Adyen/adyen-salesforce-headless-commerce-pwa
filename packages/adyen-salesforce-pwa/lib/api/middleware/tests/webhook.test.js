import {authenticate, parseNotification, sendNotification, validateHmac} from '../webhook'
import {AdyenError} from '../../models/AdyenError'
import Logger from '../../models/logger'

let mockValidateHMAC = jest.fn()

jest.mock('../../models/logger')

const mockNotify = jest.fn()
jest.mock('../../models/customNotifyApi', () => ({
    CustomNotifyApiClient: jest.fn().mockImplementation(() => ({
        notify: mockNotify
    }))
}))

jest.mock('@adyen/api-library/lib/src/utils/hmacValidator.js', () => {
    return jest.fn().mockImplementation(() => {
        return {
            validateHMAC: mockValidateHMAC
        }
    })
})
describe('WebhookHandler', () => {
    let req, res, next

    beforeEach(() => {
        req = {
            headers: {},
            body: {
                notificationItems: [
                    {
                        NotificationRequestItem: {}
                    }
                ]
            },
            query: {
                siteId: 'RefArch'
            }
        }
        res = {
            locals: {
                adyen: {
                    adyenConfig: {
                        webhookUser: 'test_user',
                        webhookPassword: 'test_password',
                        webhookHmacKey: '' // Default to no HMAC key
                    }
                }
            }
        }
        next = jest.fn()
        jest.clearAllMocks()
    })
    describe('authenticate', () => {
        it('when valid username and password is used', () => {
            const authorization = 'Basic ' + btoa('test_user:test_password')
            req.headers.authorization = authorization
            authenticate(req, res, next)
            expect(next).toHaveBeenCalled()
        })
        it('when no authorization is passed', () => {
            authenticate(req, res, next)
            expect(Logger.error).toHaveBeenCalledWith(
                'authenticate',
                expect.stringContaining('Access Denied!')
            )
            expect(next).toHaveBeenCalledWith(new AdyenError('Access Denied!', 401))
        })
        it('when invalid authorization is passed', () => {
            const authorization = 'Basic ' + btoa('mockUser' + ':' + 'mockPassword')
            req.headers.authorization = authorization
            authenticate(req, res, next)
            expect(Logger.error).toHaveBeenCalledWith(
                'authenticate',
                expect.stringContaining('Access Denied!')
            )
            expect(next).toHaveBeenCalledWith(new AdyenError('Access Denied!', 401))
        })
    })
    describe('validateHmac', () => {
        it('when no HMAC is present', () => {
            validateHmac(req, res, next)
            expect(next).toHaveBeenCalled()
        })
        it('when valid HMAC is present', () => {
            res.locals.adyen.adyenConfig.webhookHmacKey = 'test_hmac_key'
            mockValidateHMAC.mockImplementationOnce(() => {
                return true
            })
            validateHmac(req, res, next)
            expect(mockValidateHMAC).toHaveBeenCalled()
            expect(next).toHaveBeenCalled()
        })
        it('when invalid HMAC is present', () => {
            res.locals.adyen.adyenConfig.webhookHmacKey = 'test_hmac_key'
            mockValidateHMAC.mockImplementationOnce(() => {
                return false
            })
            validateHmac(req, res, next)
            expect(mockValidateHMAC).toHaveBeenCalled()
            expect(Logger.error).toHaveBeenCalledWith(
                'validateHmac',
                expect.stringContaining('Access Denied!')
            )
            expect(next).toHaveBeenCalledWith(new AdyenError('Access Denied!', 401))
        })
    })
    describe('parseNotification', () => {
        it('when valid notification is present', () => {
            parseNotification(req, res, next)
            expect(Logger.info).toHaveBeenCalledWith('AdyenNotification', 'parseNotification')
            expect(next).toHaveBeenCalled()
        })
        it('when notificationRequestItem is not present', () => {
            req.body.notificationItems = []
            parseNotification(req, res, next)
            expect(next).toHaveBeenCalledWith(
                new AdyenError(
                    'Handling of Adyen notification has failed. No input parameters were provided.',
                    400
                )
            )
        })
        it('when notificationItems is not present', () => {
            req.body = {}
            parseNotification(req, res, next)
            expect(next).toHaveBeenCalledWith(
                new AdyenError(
                    'Handling of Adyen notification has failed. No input parameters were provided.',
                    400
                )
            )
        })
    })

    describe('sendNotification', () => {
        it('should send notification and set response', async () => {
            mockNotify.mockResolvedValue({})
            res.locals.notification = {
                NotificationRequestItem: {eventCode: 'AUTHORISATION'},
                live: 'false'
            }

            await sendNotification(req, res, next)
            expect(res.locals.response).toBe('[accepted]')
            expect(next).toHaveBeenCalledWith()
        })

        it('should handle errors during sendNotification', async () => {
            const err = new Error('notify failed')
            mockNotify.mockRejectedValue(err)
            res.locals.notification = {
                NotificationRequestItem: {eventCode: 'AUTHORISATION'},
                live: 'false'
            }

            await sendNotification(req, res, next)
            expect(next).toHaveBeenCalledWith(err)
        })
    })
})
