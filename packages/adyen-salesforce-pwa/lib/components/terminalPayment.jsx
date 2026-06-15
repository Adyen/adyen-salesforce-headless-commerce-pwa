import React, {useEffect, useState, useRef, useCallback} from 'react'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'
import useMultiSite from '@salesforce/retail-react-app/app/hooks/use-multi-site'
import useNavigation from '@salesforce/retail-react-app/app/hooks/use-navigation'
import {useCurrentBasket} from '@salesforce/retail-react-app/app/hooks/use-current-basket'
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Select,
    Stack,
    Text
} from '@salesforce/retail-react-app/app/components/shared/ui'
import PropTypes from 'prop-types'
import useTerminalPayment, {TERMINAL_PAYMENT_STATUS} from '../hooks/useTerminalPayment'
import useAdyenOrderNumber from '../hooks/useAdyenOrderNumber'

const TerminalPaymentComponent = ({
    locale: localeProp,
    site: siteProp,
    basket: basketProp,
    navigate: navigateProp,
    authToken: authTokenProp,
    customerId: customerIdProp,
    storeId,
    onSuccess,
    onDeclined,
    onError = [],
    onAbort,
    beforeSubmit = [],
    spinner = null
}) => {
    const {site: hookSite} = useMultiSite()
    const hookNavigate = useNavigation()
    const {data: hookBasket} = useCurrentBasket()

    const site = siteProp ?? hookSite
    const navigate = navigateProp ?? hookNavigate
    const basket = basketProp ?? hookBasket

    const hookCustomerId = useCustomerId()
    const customerId = customerIdProp || hookCustomerId
    const {getTokenWhenReady} = useAccessToken()
    const [authToken, setAuthToken] = useState(authTokenProp)

    const {
        orderNo,
        isLoading: isLoadingOrderNumber,
        refetch: refetchOrderNumber
    } = useAdyenOrderNumber({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site
    })

    const errorShownRef = useRef(false)
    const [selectedTerminalId, setSelectedTerminalId] = useState('')

    useEffect(() => {
        if (authTokenProp) return
        const getToken = async () => {
            const token = await getTokenWhenReady()
            setAuthToken(token)
        }
        getToken()
    }, [authTokenProp])

    const handleSuccess = useCallback(
        (result) => {
            if (onSuccess) {
                onSuccess(result)
            } else if (result?.orderNo) {
                navigate(`/checkout/confirmation/${result.orderNo}`)
            }
        },
        [onSuccess, navigate]
    )

    const handleError = useCallback(
        (error) => {
            if (!errorShownRef.current) {
                errorShownRef.current = true
                onError.forEach((cb) => cb(error))
            }
        },
        [onError]
    )

    const {
        status,
        error,
        result,
        terminals,
        isLoadingTerminals,
        sendPayment,
        abortPayment,
        reset
    } = useTerminalPayment({
        authToken,
        customerId,
        basketId: basket?.basketId,
        site,
        storeId,
        onSuccess: handleSuccess,
        onDeclined,
        onError: handleError,
        onAbort
    })

    useEffect(() => {
        if (error && !errorShownRef.current) {
            errorShownRef.current = true
            onError.forEach((cb) => cb(error))
        }
    }, [error])

    useEffect(() => {
        if (
            status === TERMINAL_PAYMENT_STATUS.DECLINED &&
            result?.error &&
            !errorShownRef.current
        ) {
            errorShownRef.current = true
            onError.forEach((cb) => cb(result.error))
        }
    }, [status, result])

    useEffect(() => {
        if (status === TERMINAL_PAYMENT_STATUS.IDLE) {
            errorShownRef.current = false
        }
    }, [status])

    const handleSend = useCallback(async () => {
        if (selectedTerminalId) {
            for (const callback of beforeSubmit) {
                await callback()
            }
            await refetchOrderNumber()
            sendPayment(selectedTerminalId)
        }
    }, [selectedTerminalId, sendPayment, beforeSubmit, refetchOrderNumber])

    const isIdle = status === TERMINAL_PAYMENT_STATUS.IDLE
    const isSending = status === TERMINAL_PAYMENT_STATUS.SENDING
    const isWaiting = status === TERMINAL_PAYMENT_STATUS.WAITING
    const isSuccess = status === TERMINAL_PAYMENT_STATUS.SUCCESS
    const isDeclined = status === TERMINAL_PAYMENT_STATUS.DECLINED
    const isCancelled = status === TERMINAL_PAYMENT_STATUS.CANCELLED
    const isError = status === TERMINAL_PAYMENT_STATUS.ERROR
    const isProcessing = isSending || isWaiting
    const isTerminalState = isSuccess || isDeclined || isCancelled || isError

    if (isLoadingTerminals || isLoadingOrderNumber) {
        return spinner ? <>{spinner}</> : null
    }

    return (
        <Box data-testid="terminal-payment">
            {isIdle && (
                <Stack spacing={4} data-testid="terminal-payment-idle">
                    <FormControl>
                        <FormLabel htmlFor="terminal-select">Select Terminal</FormLabel>
                        <Select
                            id="terminal-select"
                            data-testid="terminal-select"
                            placeholder="-- Select a terminal --"
                            value={selectedTerminalId}
                            onChange={(e) => setSelectedTerminalId(e.target.value)}
                        >
                            {terminals.map((terminal) => (
                                <option key={terminal.poiId} value={terminal.poiId}>
                                    {terminal.name}
                                </option>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        data-testid="send-to-terminal"
                        w="full"
                        isDisabled={!selectedTerminalId}
                        onClick={handleSend}
                    >
                        Send to Terminal
                    </Button>
                </Stack>
            )}

            {isProcessing && (
                <Box position="relative" data-testid="terminal-payment-processing">
                    {spinner && <>{spinner}</>}
                    <Stack
                        spacing={4}
                        align="center"
                        position="relative"
                        zIndex="modal"
                        py={8}
                    >
                        <Text>
                            {isSending
                                ? 'Sending payment to terminal...'
                                : 'Waiting for payment on terminal...'}
                        </Text>
                        <Button
                            variant="outline"
                            data-testid="abort-payment"
                            onClick={abortPayment}
                        >
                            Cancel
                        </Button>
                    </Stack>
                </Box>
            )}

            {isSuccess && (
                <Box data-testid="terminal-payment-success">
                    <Text>Payment successful</Text>
                </Box>
            )}

            {isDeclined && (
                <Stack spacing={4} data-testid="terminal-payment-declined">
                    <Text>{result?.error?.message || 'Payment declined'}</Text>
                    <Button variant="outline" data-testid="try-again" onClick={reset}>
                        Try Again
                    </Button>
                </Stack>
            )}

            {isCancelled && (
                <Stack spacing={4} data-testid="terminal-payment-cancelled">
                    <Text>Payment cancelled</Text>
                    <Button variant="outline" data-testid="try-again" onClick={reset}>
                        Try Again
                    </Button>
                </Stack>
            )}

            {isError && (
                <Stack spacing={4} data-testid="terminal-payment-error">
                    <Text>{error?.message || 'An error occurred'}</Text>
                    <Button variant="outline" data-testid="try-again" onClick={reset}>
                        Try Again
                    </Button>
                </Stack>
            )}
        </Box>
    )
}

TerminalPaymentComponent.propTypes = {
    authToken: PropTypes.string,
    customerId: PropTypes.string,
    site: PropTypes.object,
    basket: PropTypes.object,
    navigate: PropTypes.func,
    locale: PropTypes.object,
    storeId: PropTypes.string.isRequired,
    onSuccess: PropTypes.func,
    onDeclined: PropTypes.func,
    onError: PropTypes.arrayOf(PropTypes.func),
    onAbort: PropTypes.func,
    beforeSubmit: PropTypes.arrayOf(PropTypes.func),
    spinner: PropTypes.node
}

export default React.memo(TerminalPaymentComponent, (prevProps, nextProps) => {
    return (
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.storeId === nextProps.storeId
    )
})
