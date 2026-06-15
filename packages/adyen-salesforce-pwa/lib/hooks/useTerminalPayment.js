import {useState, useCallback, useRef} from 'react'
import {useQuery} from '@tanstack/react-query'
import {TerminalApiService} from '../services/terminal-api'
import {adyenKeys} from '../utils/queryKeys'
import {TERMINAL_PAYMENT_STATUS} from '../utils/constants.mjs'

/**
 * Hook that manages the full terminal payment lifecycle with a state machine.
 *
 * States: idle → sending → waiting → success | declined | cancelled | error → idle (reset)
 *
 * @param {object} props
 * @param {string} props.authToken - The authentication token.
 * @param {string} props.customerId - The customer ID.
 * @param {string} props.basketId - The basket ID.
 * @param {object} props.site - The site object.
 * @param {string} props.storeId - The POS store ID for terminal listing.
 * @param {Function} [props.onSuccess] - Callback on successful payment.
 * @param {Function} [props.onDeclined] - Callback on declined payment.
 * @param {Function} [props.onError] - Callback on error.
 * @param {Function} [props.onAbort] - Callback on abort.
 * @returns {object} Terminal payment state and actions.
 */
const useTerminalPayment = ({
    authToken,
    customerId,
    basketId,
    site,
    storeId,
    onSuccess,
    onDeclined,
    onError,
    onAbort
}) => {
    const [status, setStatus] = useState(TERMINAL_PAYMENT_STATUS.IDLE)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)

    const statusRef = useRef(status)
    statusRef.current = status

    const paymentContextRef = useRef({serviceId: null, orderNo: null, terminalId: null})

    const terminalsQuery = useQuery({
        queryKey: adyenKeys.terminals(storeId, site?.id),
        queryFn: async () => {
            const service = new TerminalApiService(authToken, customerId, basketId, site)
            return service.fetchTerminals(storeId)
        },
        enabled: !!authToken && !!storeId && !!site?.id
    })

    const sendPayment = useCallback(
        async (terminalId) => {
            if (statusRef.current !== TERMINAL_PAYMENT_STATUS.IDLE) return

            setStatus(TERMINAL_PAYMENT_STATUS.SENDING)
            setError(null)
            setResult(null)

            const serviceId = Date.now().toString().slice(-10)
            paymentContextRef.current = {serviceId, orderNo: null, terminalId}

            try {
                const service = new TerminalApiService(authToken, customerId, basketId, site)
                setStatus(TERMINAL_PAYMENT_STATUS.WAITING)
                const response = await service.createPayment({terminalId, serviceId})

                paymentContextRef.current.orderNo = response.orderNo

                if (response.result === 'Success') {
                    setStatus(TERMINAL_PAYMENT_STATUS.SUCCESS)
                    setResult(response)
                    onSuccess?.(response)
                } else {
                    setStatus(TERMINAL_PAYMENT_STATUS.DECLINED)
                    setResult(response)
                    onDeclined?.(response)
                }
            } catch (err) {
                setStatus(TERMINAL_PAYMENT_STATUS.ERROR)
                setError(err)
                setResult(null)
                onError?.(err)
            }
        },
        [authToken, customerId, basketId, site, onSuccess, onDeclined, onError]
    )

    const abortPayment = useCallback(async () => {
        const {serviceId, terminalId, orderNo} = paymentContextRef.current
        if (!serviceId || !terminalId) return

        setStatus(TERMINAL_PAYMENT_STATUS.CANCELLED)

        try {
            const service = new TerminalApiService(authToken, customerId, basketId, site)
            const response = await service.abortPayment({serviceId, terminalId, orderNo})
            setResult(response)
            onAbort?.(response)
        } catch (err) {
            setError(err)
            onError?.(err)
        }
    }, [authToken, customerId, basketId, site, onAbort, onError])

    const reset = useCallback(() => {
        setStatus(TERMINAL_PAYMENT_STATUS.IDLE)
        setError(null)
        setResult(null)
        paymentContextRef.current = {serviceId: null, orderNo: null, terminalId: null}
    }, [])

    return {
        status,
        error,
        result,
        terminals: terminalsQuery.data ?? [],
        isLoadingTerminals: terminalsQuery.isLoading && terminalsQuery.fetchStatus !== 'idle',
        sendPayment,
        abortPayment,
        reset
    }
}

export default useTerminalPayment
