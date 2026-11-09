// Module-level map for tracking error notifications across instances.
// IMPORTANT: This module is client-side-only (browser/React event-handler context).
// It must NOT be invoked during server-side rendering (SSR), as the shared module-level
// state would leak across shoppers' requests. All current call sites are browser-only
// (Adyen Web SDK callbacks, React component event handlers).
const errorNotificationTimestamps = new Map()
const cancelHandledKeys = new Set()

export const markCancelHandled = (key) => cancelHandledKeys.add(key)
export const hasCancelHandled = (key) => cancelHandledKeys.has(key)
export const clearCancelHandled = (key) => cancelHandledKeys.delete(key)
export const clearErrorNotificationThrottle = (key) => errorNotificationTimestamps.delete(key)

/**
 * Leading-edge throttle gate for error notifications.
 * Returns true on the first call within the window, false for subsequent calls.
 * @param {string} key - Throttle key (e.g., payment method identifier)
 * @param {number} windowMs - Throttle window in milliseconds (default: 300)
 * @returns {boolean} - Whether to proceed with the notification
 */
export const shouldNotifyError = (key, windowMs = 300) => {
    const now = Date.now()
    const lastCall = errorNotificationTimestamps.get(key)

    if (!lastCall || now - lastCall >= windowMs) {
        errorNotificationTimestamps.set(key, now)
        return true
    }

    return false
}

/**
 * Test-only helper to reset the shared throttle state.
 * Call in beforeEach/afterEach to prevent test pollution.
 */
export const __resetErrorNotificationThrottle = () => {
    errorNotificationTimestamps.clear()
    cancelHandledKeys.clear()
}

/**
 * Creates a throttled error handler that deduplicates notifications across instances.
 * @param {Function[]} callbacks - Error callback functions
 * @param {object} props - Component properties
 * @param {object} options - Configuration options
 * @param {string} options.key - Required throttle key (e.g., 'checkout', 'applepay-express')
 * @param {number} [options.windowMs=300] - Throttle window in milliseconds
 * @returns {Function} - Throttled error handler
 */
export const createThrottledErrorHandler = (callbacks, props, {key, windowMs = 300}) => {
    if (!key) {
        throw new Error('createThrottledErrorHandler: key is required')
    }

    return async (...params) => {
        if (shouldNotifyError(key, windowMs)) {
            return executeErrorCallbacks(callbacks, props)(...params)
        }
        return {}
    }
}

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
