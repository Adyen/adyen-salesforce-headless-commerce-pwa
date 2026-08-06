import {
    executeCallbacks,
    executeErrorCallbacks,
    shouldNotifyError,
    __resetErrorNotificationThrottle,
    createThrottledErrorHandler
} from '../executeCallbacks'

describe('shouldNotifyError', () => {
    beforeEach(() => {
        __resetErrorNotificationThrottle()
    })

    afterEach(() => {
        __resetErrorNotificationThrottle()
    })

    it('should return true on the first call (leading edge)', () => {
        expect(shouldNotifyError('test-key')).toBe(true)
    })

    it('should return false on duplicate calls within the window', () => {
        shouldNotifyError('test-key', 300)
        expect(shouldNotifyError('test-key', 300)).toBe(false)
        expect(shouldNotifyError('test-key', 300)).toBe(false)
    })

    it('should refire after the window elapses', async () => {
        shouldNotifyError('test-key', 50)
        expect(shouldNotifyError('test-key', 50)).toBe(false)

        // Wait for window to elapse
        await new Promise((resolve) => setTimeout(resolve, 60))

        expect(shouldNotifyError('test-key', 50)).toBe(true)
    })

    it('should handle different keys independently', () => {
        expect(shouldNotifyError('key-a')).toBe(true)
        expect(shouldNotifyError('key-b')).toBe(true)
        expect(shouldNotifyError('key-a')).toBe(false)
        expect(shouldNotifyError('key-b')).toBe(false)
    })

    it('should clear state when __resetErrorNotificationThrottle is called', () => {
        shouldNotifyError('test-key')
        expect(shouldNotifyError('test-key')).toBe(false)

        __resetErrorNotificationThrottle()

        expect(shouldNotifyError('test-key')).toBe(true)
    })
})

describe('createThrottledErrorHandler', () => {
    beforeEach(() => {
        __resetErrorNotificationThrottle()
    })

    afterEach(() => {
        __resetErrorNotificationThrottle()
    })

    it('should throw if key is not provided', () => {
        expect(() => {
            createThrottledErrorHandler([], {}, {})
        }).toThrow('createThrottledErrorHandler: key is required')
    })

    it('should fire callbacks once even when invoked via two separately-created handler instances sharing the same key', async () => {
        const callback = jest.fn().mockResolvedValue({})
        const props = {prop1: 'value1'}

        // Simulate two separate mounts creating two handler instances with the same key
        const handler1 = createThrottledErrorHandler([callback], props, {key: 'shared-key'})
        const handler2 = createThrottledErrorHandler([callback], props, {key: 'shared-key'})

        const error = new Error('test error')

        // Call both handlers near-simultaneously
        await handler1(error)
        await handler2(error)

        // The callback should only be invoked once due to shared throttle state
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should not interfere across different keys', async () => {
        const callback = jest.fn().mockResolvedValue({})
        const props = {prop1: 'value1'}

        const handler1 = createThrottledErrorHandler([callback], props, {key: 'key-a'})
        const handler2 = createThrottledErrorHandler([callback], props, {key: 'key-b'})

        const error = new Error('test error')

        await handler1(error)
        await handler2(error)

        // Each key should fire independently
        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should return empty object when throttled', async () => {
        const callback = jest.fn().mockResolvedValue({data: 'value'})
        const props = {prop1: 'value1'}

        const handler = createThrottledErrorHandler([callback], props, {key: 'test-key'})

        const error = new Error('test error')

        const result1 = await handler(error)
        const result2 = await handler(error)

        expect(result1).toEqual({data: 'value'})
        expect(result2).toEqual({})
    })
})

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
