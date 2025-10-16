import {appleDomainAssociation} from '../apple-domain-association'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../../models/logger'

jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs', () => ({
    getAdyenConfigForCurrentSite: jest.fn()
}))

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
        }
        next = jest.fn()
    })

    it('should send the apple domain association content from the adyen config', async () => {
        const mockContent = 'mock-apple-domain-association-content'
        getAdyenConfigForCurrentSite.mockReturnValue({
            appleDomainAssociation: mockContent
        })

        await appleDomainAssociation(req, res, next)

        expect(Logger.info).toHaveBeenCalledWith('AppleDomainAssociation', 'start')
        expect(getAdyenConfigForCurrentSite).toHaveBeenCalled()
        expect(res.setHeader).toHaveBeenCalledWith('content-type', 'text/plain')
        expect(res.send).toHaveBeenCalledWith(`${mockContent}\n`)
        expect(next).not.toHaveBeenCalled()
    })

    it('should call next with an error if config fetching fails', async () => {
        const mockError = new Error('Config not found')
        getAdyenConfigForCurrentSite.mockImplementation(() => {
            throw mockError
        })

        await appleDomainAssociation(req, res, next)

        expect(Logger.error).toHaveBeenCalledWith('AppleDomainAssociation', mockError.stack)
        expect(res.send).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(mockError)
    })
})
