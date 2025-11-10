import {executeCallbacks} from '../executeCallbacks'

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
