export const executeCallbacks = (callbacks, props) => {
    return async (...params) => {
        callbacks.reduce(async (data, func, index, arr) => {
            try {
                const next = await data
                const response = await func(...params, props, next)
                return {...next, ...response}
            } catch (error) {
                arr.splice(index)
                if (props.onError) props.onError(error)
            }
        }, {})
    }
}
