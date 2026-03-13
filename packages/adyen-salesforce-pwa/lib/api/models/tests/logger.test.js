import {APPLICATION_VERSION} from '../../../utils/constants.mjs'
import packageJson from '../../../../package.json'

jest.mock('@salesforce/pwa-kit-runtime/utils/logger-factory', () => ({
    __esModule: true,
    default: jest.fn()
}))

describe('Logger', () => {
    const logTypes = ['info', 'warn', 'error', 'debug']

    for (const type of logTypes) {
        describe(`${type}`, () => {
            let Logger
            let createLogger
            let mockLoggerInstance

            const step = 'testStep'
            const message = 'testMessage'

            beforeEach(async () => {
                jest.resetModules()
                ;({default: createLogger} =
                    await import('@salesforce/pwa-kit-runtime/utils/logger-factory'))
                mockLoggerInstance = {
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    debug: jest.fn()
                }
                createLogger.mockReturnValue(mockLoggerInstance)

                await jest.isolateModulesAsync(async () => {
                    const mod = await import('../logger')
                    Logger = mod.default
                })
            })

            it('creates logger instance with package name', () => {
                Logger[`${type}`]()
                expect(createLogger).toHaveBeenCalledWith({packageName: packageJson.name})
            })

            it('creates log with correct application version', () => {
                Logger[`${type}`]()
                expect(mockLoggerInstance[type]).toHaveBeenCalled()
                expect(mockLoggerInstance[type].mock.calls[0][0]).toContain(APPLICATION_VERSION)
            })

            it('creates log with correct step', () => {
                Logger[`${type}`](step)
                expect(mockLoggerInstance[type]).toHaveBeenCalled()
                expect(mockLoggerInstance[type].mock.calls[0][0]).toContain(step)
            })

            it('creates log with correct message', () => {
                Logger[`${type}`](step, message)
                expect(mockLoggerInstance[type]).toHaveBeenCalled()
                expect(mockLoggerInstance[type].mock.calls[0][0]).toContain(message)
            })

            it('creates log when message is an object', () => {
                const objectMessage = {
                    prop1: 'value1',
                    prop2: {
                        prop3: 'value2'
                    }
                }

                Logger[`${type}`](step, objectMessage)
                expect(mockLoggerInstance[type]).toHaveBeenCalled()
                expect(mockLoggerInstance[type].mock.calls[0][0]).toContain(
                    JSON.stringify(objectMessage)
                )
            })

            it('does not create log with "undefined" when step or message is not defined', () => {
                Logger[`${type}`]()
                expect(mockLoggerInstance[type]).toHaveBeenCalled()
                expect(mockLoggerInstance[type].mock.calls[0][0]).not.toContain('undefined')
            })

            it('creates log with unnecessary spaces removed', () => {
                const spacedStep = ' test  step '
                const spacedMessage = 'test    message  '
                const log = `${APPLICATION_VERSION} test step test message`

                Logger[`${type}`](spacedStep, spacedMessage)
                expect(mockLoggerInstance[type]).toHaveBeenCalledWith(log)
            })
        })
    }
})
