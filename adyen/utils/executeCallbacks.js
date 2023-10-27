export const executeCallbacks = (callbacks, props, onError) => {
    return async (...params) => {
        callbacks.reduce(async (data, func, index, arr) => {
            const next = await data
            const response = await func(...params, props, next)
            if (response instanceof Error) {
                onError(response)
                arr.splice(index)
            }
            return {...next, ...response}
        }, {})
    }
}
