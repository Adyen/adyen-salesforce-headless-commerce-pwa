export const executeCallbacks = (callbacks, props) => {
    return async (...params) => {
        let data = {}
        for (const func of callbacks) {
            try {
                const response = await func(...params, props, data)
                data = {...data, ...response}
            } catch (error) {
                console.error('Error in callback execution:', error)
                // Re-throw the error so Adyen's dropin can handle it and trigger onError
                throw error
            }
        }
        return data
    }
}

export const executeErrorCallbacks = (callbacks, props) => {
    return async (...params) => {
        let data = {}
        for (const func of callbacks) {
            try {
                const response = await func(...params, props, data)
                data = {...data, ...response}
            } catch (error) {
                console.error('Error in error callback:', error)
                // Don't re-throw - error handlers should fail gracefully
                break
            }
        }
        return data
    }
}

/**
 * Creates a throttled error handler that prevents duplicate error notifications.
 * Uses a leading-edge throttle: the first call within the time window executes immediately,
 * and subsequent calls within the window are ignored (no-op).
 *
 * @param {Function[]} callbacks - Array of error callback functions to execute
 * @param {object} props - Props object to pass to the callbacks
 * @param {object} options - Configuration options
 * @param {number} [options.windowMs=300] - Throttle window in milliseconds
 * @returns {Function} Throttled error handler that can be reused across multiple event registrations
 */
export const createThrottledErrorHandler = (callbacks, props, {windowMs = 300} = {}) => {
    let lastCallTime = 0
    const handler = executeErrorCallbacks(callbacks, props)

    return async (...params) => {
        const now = Date.now()
        if (now - lastCallTime >= windowMs) {
            lastCallTime = now
            return await handler(...params)
        }
        // Within throttle window - no-op
        return {}
    }
}
