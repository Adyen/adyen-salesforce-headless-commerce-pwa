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
import useTerminalPayment from '../hooks/useTerminalPayment'
import {TERMINAL_PAYMENT_STATUS} from '../utils/constants.mjs'
import useAdyenOrderNumber from '../hooks/useAdyenOrderNumber'

const DEFAULT_LABELS = {
    selectTerminal: 'Select Terminal',
    selectTerminalPlaceholder: '-- Select a terminal --',
    sendToTerminal: 'Send to Terminal',
    sendingPayment: 'Sending payment to terminal...',
    waitingForPayment: 'Waiting for payment on terminal...',
    cancel: 'Cancel',
    paymentSuccessful: 'Payment successful',
    paymentDeclined: 'Payment declined',
    paymentCancelled: 'Payment cancelled',
    errorOccurred: 'An error occurred',
    tryAgain: 'Try Again'
}

const TerminalPaymentComponent = ({
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
    spinner = null,
    labels: labelsProp,
    classNames = {}
}) => {
    const labels = {...DEFAULT_LABELS, ...labelsProp}
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

    const {isLoading: isLoadingOrderNumber, refetch: refetchOrderNumber} = useAdyenOrderNumber({
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
        if (status === TERMINAL_PAYMENT_STATUS.IDLE) {
            errorShownRef.current = false
        }
    }, [status])

    const handleSend = useCallback(async () => {
        if (!selectedTerminalId) return

        try {
            for (const callback of beforeSubmit) {
                const result = await callback()
                if (result === false) return
            }
            await refetchOrderNumber()
            sendPayment(selectedTerminalId)
        } catch (err) {
            handleError(err)
        }
    }, [selectedTerminalId, sendPayment, beforeSubmit, refetchOrderNumber, handleError])

    const isIdle = status === TERMINAL_PAYMENT_STATUS.IDLE
    const isSending = status === TERMINAL_PAYMENT_STATUS.SENDING
    const isWaiting = status === TERMINAL_PAYMENT_STATUS.WAITING
    const isSuccess = status === TERMINAL_PAYMENT_STATUS.SUCCESS
    const isDeclined = status === TERMINAL_PAYMENT_STATUS.DECLINED
    const isCancelled = status === TERMINAL_PAYMENT_STATUS.CANCELLED
    const isError = status === TERMINAL_PAYMENT_STATUS.ERROR
    const isProcessing = isSending || isWaiting

    if (isLoadingTerminals || isLoadingOrderNumber) {
        return spinner ? <>{spinner}</> : null
    }

    return (
        <Box data-testid="terminal-payment" className={classNames.container}>
            {isIdle && (
                <Stack spacing={4} data-testid="terminal-payment-idle" className={classNames.idle}>
                    <FormControl>
                        <FormLabel htmlFor="terminal-select">{labels.selectTerminal}</FormLabel>
                        <Select
                            id="terminal-select"
                            data-testid="terminal-select"
                            placeholder={labels.selectTerminalPlaceholder}
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
                        className={classNames.sendButton}
                    >
                        {labels.sendToTerminal}
                    </Button>
                </Stack>
            )}

            {isProcessing && (
                <Box
                    position="relative"
                    data-testid="terminal-payment-processing"
                    className={classNames.processing}
                >
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
                                ? labels.sendingPayment
                                : labels.waitingForPayment}
                        </Text>
                        <Button
                            variant="outline"
                            data-testid="abort-payment"
                            onClick={abortPayment}
                            className={classNames.cancelButton}
                        >
                            {labels.cancel}
                        </Button>
                    </Stack>
                </Box>
            )}

            {isSuccess && (
                <Box data-testid="terminal-payment-success" className={classNames.success}>
                    <Text>{labels.paymentSuccessful}</Text>
                </Box>
            )}

            {isDeclined && (
                <Stack
                    spacing={4}
                    data-testid="terminal-payment-declined"
                    className={classNames.declined}
                >
                    <Text>{result?.error?.message || labels.paymentDeclined}</Text>
                    <Button
                        variant="outline"
                        data-testid="try-again"
                        onClick={reset}
                        className={classNames.tryAgainButton}
                    >
                        {labels.tryAgain}
                    </Button>
                </Stack>
            )}

            {isCancelled && (
                <Stack
                    spacing={4}
                    data-testid="terminal-payment-cancelled"
                    className={classNames.cancelled}
                >
                    <Text>{labels.paymentCancelled}</Text>
                    <Button
                        variant="outline"
                        data-testid="try-again"
                        onClick={reset}
                        className={classNames.tryAgainButton}
                    >
                        {labels.tryAgain}
                    </Button>
                </Stack>
            )}

            {isError && (
                <Stack
                    spacing={4}
                    data-testid="terminal-payment-error"
                    className={classNames.error}
                >
                    <Text>{error?.message || labels.errorOccurred}</Text>
                    <Button
                        variant="outline"
                        data-testid="try-again"
                        onClick={reset}
                        className={classNames.tryAgainButton}
                    >
                        {labels.tryAgain}
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
    storeId: PropTypes.string.isRequired,
    onSuccess: PropTypes.func,
    onDeclined: PropTypes.func,
    onError: PropTypes.arrayOf(PropTypes.func),
    onAbort: PropTypes.func,
    beforeSubmit: PropTypes.arrayOf(PropTypes.func),
    spinner: PropTypes.node,
    labels: PropTypes.object,
    classNames: PropTypes.object
}

export default React.memo(TerminalPaymentComponent, (prevProps, nextProps) => {
    return (
        prevProps.basket?.basketId === nextProps.basket?.basketId &&
        prevProps.site?.id === nextProps.site?.id &&
        prevProps.storeId === nextProps.storeId &&
        prevProps.authToken === nextProps.authToken
    )
})
