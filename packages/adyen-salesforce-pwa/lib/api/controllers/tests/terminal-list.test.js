import getTerminals from '../terminal-list'
import AdyenClientProvider from '../../models/adyenClientProvider'
import {ERROR_MESSAGE} from '../../../utils/constants.mjs'

jest.mock('../../models/adyenClientProvider')
jest.mock('../../models/logger')

describe('getTerminals controller', () => {
    let req, res, next
    let mockListTerminals

    beforeEach(() => {
        jest.clearAllMocks()

        mockListTerminals = jest.fn()

        AdyenClientProvider.mockImplementation(() => ({
            getManagementApi: () => ({
                TerminalsTerminalLevelApi: {
                    listTerminals: mockListTerminals
                }
            })
        }))

        req = {
            query: {storeId: 'STORE-001'}
        }

        res = {
            locals: {
                adyen: {
                    adyenConfig: {
                        merchantAccount: 'TestMerchant',
                        posActiveStoreIds: 'STORE-001,STORE-002'
                    }
                }
            }
        }

        next = jest.fn()
    })

    it('should return mapped terminals for a valid storeId', async () => {
        const mockResponse = {
            data: [
                {
                    id: 'V400m-111',
                    model: 'V400m',
                    serialNumber: '111',
                    assignment: {companyId: 'COMP', storeId: 'STORE-001'}
                },
                {
                    id: 'V400m-222',
                    model: 'V400m',
                    serialNumber: '222',
                    assignment: {companyId: 'COMP', storeId: 'STORE-001'}
                }
            ]
        }
        mockListTerminals.mockResolvedValue(mockResponse)

        await getTerminals(req, res, next)

        expect(mockListTerminals).toHaveBeenCalledWith(
            undefined,
            undefined,
            undefined,
            'TestMerchant',
            'STORE-001'
        )
        expect(res.locals.response).toEqual([
            {poiId: 'V400m-111', name: 'V400m - 111', storeId: 'STORE-001'},
            {poiId: 'V400m-222', name: 'V400m - 222', storeId: 'STORE-001'}
        ])
        expect(next).toHaveBeenCalledWith()
    })

    it('should use terminal id as name when model or serialNumber is missing', async () => {
        const mockResponse = {
            data: [{id: 'V400m-333', model: 'V400m', assignment: {}}]
        }
        mockListTerminals.mockResolvedValue(mockResponse)

        await getTerminals(req, res, next)

        expect(res.locals.response).toEqual([
            {poiId: 'V400m-333', name: 'V400m-333', storeId: 'STORE-001'}
        ])
    })

    it('should reject if storeId is not in active store IDs', async () => {
        req.query.storeId = 'UNAUTHORIZED-STORE'

        await getTerminals(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.INVALID_STORE_ID})
        )
        expect(mockListTerminals).not.toHaveBeenCalled()
    })

    it('should reject any storeId when posActiveStoreIds is not configured', async () => {
        res.locals.adyen.adyenConfig.posActiveStoreIds = undefined

        await getTerminals(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.INVALID_STORE_ID})
        )
        expect(mockListTerminals).not.toHaveBeenCalled()
    })

    it('should call next with error when storeId is missing', async () => {
        req.query = {}

        await getTerminals(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.INVALID_PARAMS})
        )
    })

    it('should call next with error when adyen context is missing', async () => {
        res.locals = {}

        await getTerminals(req, res, next)

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({message: ERROR_MESSAGE.ADYEN_CONTEXT_NOT_FOUND})
        )
    })

    it('should handle API errors gracefully', async () => {
        const apiError = new Error('Management API error')
        mockListTerminals.mockRejectedValue(apiError)

        await getTerminals(req, res, next)

        expect(next).toHaveBeenCalledWith(apiError)
    })

    it('should return empty array when no terminals found', async () => {
        mockListTerminals.mockResolvedValue({data: []})

        await getTerminals(req, res, next)

        expect(res.locals.response).toEqual([])
        expect(next).toHaveBeenCalledWith()
    })
})
