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
