import Logger from '../logger'
import {APPLICATION_VERSION} from '../../../utils/constants.mjs'

describe('Logger', () => {
    const logTypes = {
        info: 'INFO',
        warn: 'WARN',
        error: 'ERROR',
        debug: 'DEBUG'
    }
    for (const type in logTypes) {
        describe(`${type}`, () => {
            let consoleSpy
            const prefix = `ADYEN_${logTypes[type]}`
            const step = 'testStep'
            const message = 'testMessage'
            beforeEach(() => {
                consoleSpy = jest.spyOn(console, `${type}`).mockImplementation(() => {})
            })
            it('creates log with correct prefix', () => {
                Logger[`${type}`]()
                expect(consoleSpy).toHaveBeenCalled()
                expect(consoleSpy.mock.calls[0][0]).toContain(prefix)
            })
            it('creates log with correct application version', () => {
                Logger[`${type}`]()
                expect(consoleSpy).toHaveBeenCalled()
                expect(consoleSpy.mock.calls[0][0]).toContain(APPLICATION_VERSION)
            })
            it('creates log with correct step', () => {
                Logger[`${type}`](step)
                expect(consoleSpy).toHaveBeenCalled()
                expect(consoleSpy.mock.calls[0][0]).toContain(step)
            })
            it('creates log with correct message', () => {
                Logger[`${type}`](step, message)
                expect(consoleSpy).toHaveBeenCalled()
                expect(consoleSpy.mock.calls[0][0]).toContain(message)
            })
            it('creates log when message is an object', () => {
                const message = {
                    prop1: 'value1',
                    prop2: {
                        prop3: 'value2'
                    }
                }
                Logger[`${type}`](step, message)
                expect(consoleSpy).toHaveBeenCalled()
                expect(consoleSpy.mock.calls[0][0]).toContain(JSON.stringify(message))
            })
            it('does not create log with "undefined" when step or message is not defined', () => {
                Logger[`${type}`]()
                expect(consoleSpy).toHaveBeenCalled()
                expect(consoleSpy.mock.calls[0][0]).not.toContain('undefined')
            })
            it('creates log with unnecessary spaces removed', () => {
                const step = ' test  step '
                const message = 'test    message  '
                const log = `${prefix} ${APPLICATION_VERSION} test step test message`
                Logger[`${type}`](step, message)
                expect(consoleSpy).toHaveBeenCalledWith(log)
            })
        })
    }
})
