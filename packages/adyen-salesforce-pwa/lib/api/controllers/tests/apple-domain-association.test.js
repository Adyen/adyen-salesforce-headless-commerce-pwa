import {appleDomainAssociation} from '../apple-domain-association'
import Logger from '../../models/logger'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {AdyenError} from '../../models/AdyenError'

jest.mock('../../models/AdyenError')

jest.mock('../../models/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}))

describe('appleDomainAssociation Controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
        req = {}
        res = {
            send: jest.fn(),
            setHeader: jest.fn(),
            locals: {
                adyen: {
                    adyenConfig: {
                        appleDomainAssociation: 'mock-apple-domain-association-content'
                    }
                }
            }
        }
        next = jest.fn()
    })

    it('should send the apple domain association content from the adyen config', async () => {
        await appleDomainAssociation(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('AppleDomainAssociation', 'start')
        expect(res.setHeader).toHaveBeenCalledWith('content-type', 'text/plain')
        expect(res.send).toHaveBeenCalledWith('mock-apple-domain-association-content\n')
        expect(next).not.toHaveBeenCalled()
    })

    it('should call next with an error if adyen context is missing', async () => {
        res.locals = {}

        await appleDomainAssociation(req, res, next)

        expect(Logger.error).toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
    })

    it('should call next with an error if adyenConfig is missing', async () => {
        res.locals.adyen = {}

        await appleDomainAssociation(req, res, next)

        expect(Logger.error).toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
    })
})
