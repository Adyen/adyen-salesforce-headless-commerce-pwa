import {appleDomainAssociation} from '../apple-domain-association'
import {getAdyenConfigForCurrentSite} from '../../../utils/getAdyenConfigForCurrentSite.mjs'
import Logger from '../../models/logger'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {AdyenError} from '../../models/AdyenError'

jest.mock('../../models/AdyenError')
jest.mock('../../../utils/getAdyenConfigForCurrentSite.mjs')

jest.mock('../../models/logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}))

describe('appleDomainAssociation Controller', () => {
    let req, res, next

    beforeEach(() => {
        jest.clearAllMocks()
        req = {query: {}}
        res = {
            send: jest.fn(),
            setHeader: jest.fn()
        }
        next = jest.fn()
    })

    it('should send the apple domain association content from the adyen config', async () => {
        getAdyenConfigForCurrentSite.mockReturnValue({
            appleDomainAssociation: 'mock-apple-domain-association-content'
        })

        await appleDomainAssociation(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith(undefined)
        expect(Logger.info).toHaveBeenCalledWith('AppleDomainAssociation', 'start')
        expect(res.setHeader).toHaveBeenCalledWith('content-type', 'text/plain')
        expect(res.send).toHaveBeenCalledWith('mock-apple-domain-association-content')
        expect(next).not.toHaveBeenCalled()
    })

    it('should use the provided siteId to resolve the config', async () => {
        req.query = {siteId: 'RefArch'}
        getAdyenConfigForCurrentSite.mockReturnValue({
            appleDomainAssociation: 'mock-apple-domain-association-content'
        })

        await appleDomainAssociation(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith('RefArch')
        expect(res.send).toHaveBeenCalledWith('mock-apple-domain-association-content')
    })

    it('should call next with an error if appleDomainAssociation is missing from the config', async () => {
        getAdyenConfigForCurrentSite.mockReturnValue({})

        await appleDomainAssociation(req, res, next)

        expect(Logger.error).toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalled()
    })

    it('should call next with an error if getAdyenConfigForCurrentSite throws', async () => {
        const mockError = new Error('Failed to get config')
        getAdyenConfigForCurrentSite.mockImplementation(() => {
            throw mockError
        })

        await appleDomainAssociation(req, res, next)

        expect(Logger.error).toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
        expect(next).toHaveBeenCalledWith(mockError)
    })

    it('should resolve via global config when siteId and query are absent', async () => {
        req = {}
        getAdyenConfigForCurrentSite.mockReturnValue({
            appleDomainAssociation: 'mock-global-content'
        })

        await appleDomainAssociation(req, res, next)

        expect(getAdyenConfigForCurrentSite).toHaveBeenCalledWith(undefined)
        expect(res.send).toHaveBeenCalledWith('mock-global-content')
        expect(next).not.toHaveBeenCalled()
    })
})
