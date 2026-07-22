import {
    executeCallbacks,
    executeErrorCallbacks,
    createThrottledErrorHandler
} from '../executeCallbacks'

describe('executeCallbacks', () => {
    let consoleErrorSpy

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('should execute all callbacks successfully and return aggregated data', async () => {
        const callback1 = jest.fn().mockResolvedValue({data1: 'result1'})
        const callback2 = jest.fn().mockResolvedValue({data2: 'result2'})
        const callbacks = [callback1, callback2]
        const props = {prop1: 'value1'}

        const execute = executeCallbacks(callbacks, props)
        const result = await execute('param1', 'param2')

        expect(callback1).toHaveBeenCalledWith('param1', 'param2', props, {})
        expect(callback2).toHaveBeenCalledWith('param1', 'param2', props, {data1: 'result1'})
        expect(result).toEqual({data1: 'result1', data2: 'result2'})
        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should stop executing callbacks on error, log to console, and re-throw', async () => {
        const callback1 = jest.fn().mockResolvedValue({data1: 'result1'})
        const error = new Error('Some error')
        const callback2 = jest.fn().mockRejectedValue(error)
        const callback3 = jest.fn()
        const callbacks = [callback1, callback2, callback3]
        const props = {prop1: 'value1'}

        const execute = executeCallbacks(callbacks, props)

        await expect(execute('param1', 'param2')).rejects.toThrow('Some error')

        expect(callback1).toHaveBeenCalledWith('param1', 'param2', props, {})
        expect(callback2).toHaveBeenCalledWith('param1', 'param2', props, {data1: 'result1'})
        expect(callback3).not.toHaveBeenCalled()
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in callback execution:', error)
    })
})

describe('executeErrorCallbacks', () => {
    let consoleErrorSpy

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it('should execute all callbacks successfully and return aggregated data', async () => {
        const callback1 = jest.fn().mockResolvedValue({data1: 'result1'})
        const callback2 = jest.fn().mockResolvedValue({data2: 'result2'})
        const callbacks = [callback1, callback2]
        const props = {prop1: 'value1'}

        const execute = executeErrorCallbacks(callbacks, props)
        const result = await execute('param1', 'param2')

        expect(callback1).toHaveBeenCalledWith('param1', 'param2', props, {})
        expect(callback2).toHaveBeenCalledWith('param1', 'param2', props, {data1: 'result1'})
        expect(result).toEqual({data1: 'result1', data2: 'result2'})
        expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should stop on error, log it, and NOT re-throw', async () => {
        const callback1 = jest.fn().mockResolvedValue({data1: 'result1'})
        const error = new Error('Some error')
        const callback2 = jest.fn().mockRejectedValue(error)
        const callback3 = jest.fn()
        const callbacks = [callback1, callback2, callback3]
        const props = {prop1: 'value1'}

        const execute = executeErrorCallbacks(callbacks, props)
        const result = await execute('param1', 'param2')

        expect(callback1).toHaveBeenCalledWith('param1', 'param2', props, {})
        expect(callback2).toHaveBeenCalledWith('param1', 'param2', props, {data1: 'result1'})
        expect(callback3).not.toHaveBeenCalled()
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error in error callback:', error)
        expect(result).toEqual({data1: 'result1'})
    })
})

describe('createThrottledErrorHandler', () => {
    let consoleErrorSpy

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
        jest.useFakeTimers()
    })

    afterEach(() => {
        consoleErrorSpy.mockRestore()
        jest.useRealTimers()
    })

    it('should execute callbacks on the first call within the throttle window', async () => {
        const callback = jest.fn().mockResolvedValue({handled: true})
        const callbacks = [callback]
        const props = {prop1: 'value1'}
        const error = new Error('Test error')

        const handler = createThrottledErrorHandler(callbacks, props, {windowMs: 300})
        const result = await handler(error)

        expect(callback).toHaveBeenCalledWith(error, props, {})
        expect(result).toEqual({handled: true})
    })

    it('should ignore duplicate calls within the throttle window', async () => {
        const callback = jest.fn().mockResolvedValue({handled: true})
        const callbacks = [callback]
        const props = {prop1: 'value1'}
        const error1 = new Error('First error')
        const error2 = new Error('Second error')

        const handler = createThrottledErrorHandler(callbacks, props, {windowMs: 300})

        const result1 = await handler(error1)
        expect(callback).toHaveBeenCalledTimes(1)
        expect(result1).toEqual({handled: true})

        // Immediate second call - should be throttled
        const result2 = await handler(error2)
        expect(callback).toHaveBeenCalledTimes(1) // Still only called once
        expect(result2).toEqual({}) // Returns empty object (no-op)
    })

    it('should execute callbacks again after the throttle window elapses', async () => {
        const callback = jest.fn().mockResolvedValue({handled: true})
        const callbacks = [callback]
        const props = {prop1: 'value1'}
        const error1 = new Error('First error')
        const error2 = new Error('Second error')

        const handler = createThrottledErrorHandler(callbacks, props, {windowMs: 300})

        const result1 = await handler(error1)
        expect(callback).toHaveBeenCalledTimes(1)
        expect(result1).toEqual({handled: true})

        // Advance time past the throttle window
        jest.advanceTimersByTime(300)

        const result2 = await handler(error2)
        expect(callback).toHaveBeenCalledTimes(2) // Called again
        expect(result2).toEqual({handled: true})
    })

    it('should pass error arguments through correctly', async () => {
        const callback = jest.fn().mockResolvedValue({handled: true})
        const callbacks = [callback]
        const props = {prop1: 'value1'}
        const error = new Error('Test error')
        const component = {name: 'TestComponent'}

        const handler = createThrottledErrorHandler(callbacks, props, {windowMs: 300})
        await handler(error, component)

        expect(callback).toHaveBeenCalledWith(error, component, props, {})
    })

    it('should use default windowMs of 300 when not specified', async () => {
        const callback = jest.fn().mockResolvedValue({handled: true})
        const callbacks = [callback]
        const props = {}
        const error1 = new Error('First error')
        const error2 = new Error('Second error')

        const handler = createThrottledErrorHandler(callbacks, props)

        await handler(error1)
        expect(callback).toHaveBeenCalledTimes(1)

        // Immediate second call - should be throttled
        await handler(error2)
        expect(callback).toHaveBeenCalledTimes(1)

        // Advance time by 300ms (default)
        jest.advanceTimersByTime(300)

        await handler(error2)
        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple callbacks in the array', async () => {
        const callback1 = jest.fn().mockResolvedValue({data1: 'result1'})
        const callback2 = jest.fn().mockResolvedValue({data2: 'result2'})
        const callbacks = [callback1, callback2]
        const props = {prop1: 'value1'}
        const error = new Error('Test error')

        const handler = createThrottledErrorHandler(callbacks, props, {windowMs: 300})
        const result = await handler(error)

        expect(callback1).toHaveBeenCalledWith(error, props, {})
        expect(callback2).toHaveBeenCalledWith(error, props, {data1: 'result1'})
        expect(result).toEqual({data1: 'result1', data2: 'result2'})
    })

    it('should maintain separate throttle state for different handler instances', async () => {
        const callback1 = jest.fn().mockResolvedValue({handled: true})
        const callback2 = jest.fn().mockResolvedValue({handled: true})
        const props = {}
        const error = new Error('Test error')

        const handler1 = createThrottledErrorHandler([callback1], props, {windowMs: 300})
        const handler2 = createThrottledErrorHandler([callback2], props, {windowMs: 300})

        await handler1(error)
        await handler2(error)

        expect(callback1).toHaveBeenCalledTimes(1)
        expect(callback2).toHaveBeenCalledTimes(1)

        // Both handlers should throttle independently
        await handler1(error)
        await handler2(error)

        expect(callback1).toHaveBeenCalledTimes(1)
        expect(callback2).toHaveBeenCalledTimes(1)
    })
})
