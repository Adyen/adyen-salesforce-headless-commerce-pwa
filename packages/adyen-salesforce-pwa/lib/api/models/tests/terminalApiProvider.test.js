import TerminalApiProvider from '../terminalApiProvider.js'
import {AdyenError} from '../AdyenError'
import {ADYEN_ENVIRONMENT, ERROR_MESSAGE} from '../../../utils/constants.mjs'
import Client from '@adyen/api-library/lib/src/client.js'

const mockSync = jest.fn()

jest.mock('@adyen/api-library/lib/src/client.js', () => {
    return jest.fn().mockImplementation((config) => ({config}))
})

jest.mock('@adyen/api-library/lib/src/services/terminalCloudAPI.js', () => {
    return jest.fn().mockImplementation(() => ({
        sync: mockSync
    }))
})

describe('TerminalApiProvider', () => {
    let mockAdyenContext

    beforeEach(() => {
        jest.clearAllMocks()
        mockAdyenContext = {
            adyenConfig: {
                apiKey: 'mock-api-key',
                terminalApiKey: 'mock-terminal-api-key',
                terminalEnvironment: 'TEST'
            }
        }
    })

    describe('constructor / getClient', () => {
        it('creates a client for TEST environment using terminalApiKey', () => {
            new TerminalApiProvider(mockAdyenContext)

            expect(Client).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiKey: 'mock-terminal-api-key',
                    environment: ADYEN_ENVIRONMENT.TEST
                })
            )
        })

        it('falls back to apiKey when terminalApiKey is not set', () => {
            delete mockAdyenContext.adyenConfig.terminalApiKey

            new TerminalApiProvider(mockAdyenContext)

            expect(Client).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiKey: 'mock-api-key',
                    environment: ADYEN_ENVIRONMENT.TEST
                })
            )
        })

        it('creates a LIVE client with correct endpoint URL when prefix is provided', () => {
            mockAdyenContext.adyenConfig.terminalEnvironment = 'LIVE'
            mockAdyenContext.adyenConfig.liveTerminalUrlPrefix = 'eu-prefix'

            new TerminalApiProvider(mockAdyenContext)

            expect(Client).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiKey: 'mock-terminal-api-key',
                    environment: ADYEN_ENVIRONMENT.LIVE,
                    endpoint: 'https://terminal-api-live-eu-prefix.adyen.com'
                })
            )
        })

        it('handles case-insensitive LIVE environment value', () => {
            mockAdyenContext.adyenConfig.terminalEnvironment = 'live'
            mockAdyenContext.adyenConfig.liveTerminalUrlPrefix = 'us-prefix'

            new TerminalApiProvider(mockAdyenContext)

            expect(Client).toHaveBeenCalledWith(
                expect.objectContaining({
                    environment: ADYEN_ENVIRONMENT.LIVE,
                    endpoint: 'https://terminal-api-live-us-prefix.adyen.com'
                })
            )
        })

        it('throws AdyenError when LIVE environment is missing liveTerminalUrlPrefix', () => {
            mockAdyenContext.adyenConfig.terminalEnvironment = 'LIVE'

            expect(() => new TerminalApiProvider(mockAdyenContext)).toThrow(
                new AdyenError(ERROR_MESSAGE.MISSING_LIVE_TERMINAL_PREFIX, 400)
            )
        })
    })

    describe('sync', () => {
        it('delegates to TerminalCloudAPI.sync', async () => {
            const mockResponse = {SaleToPOIResponse: {PaymentResponse: {}}}
            mockSync.mockResolvedValue(mockResponse)

            const provider = new TerminalApiProvider(mockAdyenContext)
            const mockRequest = {SaleToPOIRequest: {MessageHeader: {}}}

            const result = await provider.sync(mockRequest)

            expect(mockSync).toHaveBeenCalledWith(mockRequest)
            expect(result).toBe(mockResponse)
        })

        it('propagates errors from TerminalCloudAPI.sync', async () => {
            const error = new Error('API error')
            mockSync.mockRejectedValue(error)

            const provider = new TerminalApiProvider(mockAdyenContext)

            await expect(provider.sync({SaleToPOIRequest: {}})).rejects.toThrow('API error')
        })
    })
})
