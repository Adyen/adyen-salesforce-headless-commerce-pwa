export const executeCallbacks = (callbacks, props, onError) => {
    return async (...params) => {
        let data = {}
        for (const func of callbacks) {
            try {
                const response = await func(...params, props, data)
                data = {...data, ...response}
            } catch (error) {
                if (onError) {
                    await onError(error)
                }
                break
            }
        }
        return data
    }
}

export const executeErrorCallbacks = (callbacks) => {
    return async (error) => {
        let data = {}
        for (const func of callbacks) {
            try {
                const response = await func(error, data)
                data = {...data, ...response}
            } catch (e) {
                console.error('Error in error callback:', e)
                break
            }
        }
        return data
    }
}
