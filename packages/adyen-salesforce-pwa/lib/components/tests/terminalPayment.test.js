/**
 * @jest-environment jest-environment-jsdom
 * @jest-environment-options {"url": "http://localhost:3000/", "resources": "usable"}
 */
import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import TerminalPaymentComponent from '../terminalPayment'
import useTerminalPayment, {TERMINAL_PAYMENT_STATUS} from '../../hooks/useTerminalPayment'
import useAdyenOrderNumber from '../../hooks/useAdyenOrderNumber'
import {useAccessToken, useCustomerId} from '@salesforce/commerce-sdk-react'

jest.mock('../../hooks/useTerminalPayment')
jest.mock('../../hooks/useAdyenOrderNumber')
jest.mock('@salesforce/commerce-sdk-react')

describe('TerminalPaymentComponent', () => {
    const defaultProps = {
        site: {id: 'test-site'},
        basket: {basketId: 'test-basket'},
        navigate: jest.fn(),
        storeId: 'store-001',
        spinner: <div>Spinner</div>
    }

    const mockTerminals = [
        {poiId: 'V400m-123', name: 'Terminal 1', storeId: 'store-001'},
        {poiId: 'V400m-456', name: 'Terminal 2', storeId: 'store-001'}
    ]

    const mockSendPayment = jest.fn()
    const mockAbortPayment = jest.fn()
    const mockReset = jest.fn()

    const setupHookReturn = (overrides = {}) => ({
        status: TERMINAL_PAYMENT_STATUS.IDLE,
        error: null,
        result: null,
        terminals: mockTerminals,
        isLoadingTerminals: false,
        sendPayment: mockSendPayment,
        abortPayment: mockAbortPayment,
        reset: mockReset,
        ...overrides
    })

    beforeEach(() => {
        jest.clearAllMocks()
        useCustomerId.mockReturnValue('test-customer')
        useAccessToken.mockReturnValue({
            getTokenWhenReady: jest.fn().mockResolvedValue('test-auth-token')
        })
        useAdyenOrderNumber.mockReturnValue({
            orderNo: 'ORDER-001',
            isLoading: false,
            error: null,
            refetch: jest.fn().mockResolvedValue({data: {orderNo: 'ORDER-001'}})
        })
        useTerminalPayment.mockReturnValue(setupHookReturn())
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    describe('Idle state', () => {
        it('renders terminal selector and send button', () => {
            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByTestId('terminal-payment-idle')).toBeInTheDocument()
            expect(screen.getByTestId('terminal-select')).toBeInTheDocument()
            expect(screen.getByTestId('send-to-terminal')).toBeInTheDocument()
        })

        it('renders terminal options from hook data', () => {
            render(<TerminalPaymentComponent {...defaultProps} />)

            const select = screen.getByTestId('terminal-select')
            const options = select.querySelectorAll('option')
            // Default empty option + 2 terminals
            expect(options).toHaveLength(3)
            expect(options[1].textContent).toBe('Terminal 1')
            expect(options[2].textContent).toBe('Terminal 2')
        })

        it('disables send button when no terminal is selected', () => {
            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByTestId('send-to-terminal')).toBeDisabled()
        })

        it('enables send button after terminal selection', () => {
            render(<TerminalPaymentComponent {...defaultProps} />)

            fireEvent.change(screen.getByTestId('terminal-select'), {
                target: {value: 'V400m-123'}
            })

            expect(screen.getByTestId('send-to-terminal')).not.toBeDisabled()
        })

        it('calls sendPayment with selected terminal on button click', async () => {
            render(<TerminalPaymentComponent {...defaultProps} />)

            fireEvent.change(screen.getByTestId('terminal-select'), {
                target: {value: 'V400m-123'}
            })
            fireEvent.click(screen.getByTestId('send-to-terminal'))

            await waitFor(() => {
                expect(mockSendPayment).toHaveBeenCalledWith('V400m-123')
            })
        })
    })

    describe('Loading state', () => {
        it('renders spinner when terminals are loading', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({isLoadingTerminals: true, terminals: []})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByText('Spinner')).toBeInTheDocument()
            expect(screen.queryByTestId('terminal-payment-idle')).not.toBeInTheDocument()
        })

        it('renders nothing when loading and no spinner provided', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({isLoadingTerminals: true, terminals: []})
            )

            const {container} = render(
                <TerminalPaymentComponent {...defaultProps} spinner={null} />
            )

            expect(container.innerHTML).toBe('')
        })
    })

    describe('Processing states', () => {
        it('renders processing UI with spinner when sending', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({status: TERMINAL_PAYMENT_STATUS.SENDING})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByTestId('terminal-payment-processing')).toBeInTheDocument()
            expect(screen.getByText('Sending payment to terminal...')).toBeInTheDocument()
            expect(screen.getByText('Spinner')).toBeInTheDocument()
            expect(screen.getByTestId('abort-payment')).toBeInTheDocument()
        })

        it('renders waiting message when waiting for terminal', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({status: TERMINAL_PAYMENT_STATUS.WAITING})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByText('Waiting for payment on terminal...')).toBeInTheDocument()
        })

        it('calls abortPayment when cancel button is clicked', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({status: TERMINAL_PAYMENT_STATUS.WAITING})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            fireEvent.click(screen.getByTestId('abort-payment'))

            expect(mockAbortPayment).toHaveBeenCalled()
        })
    })

    describe('Success state', () => {
        it('renders success message', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({
                    status: TERMINAL_PAYMENT_STATUS.SUCCESS,
                    result: {orderNo: '00001'}
                })
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByTestId('terminal-payment-success')).toBeInTheDocument()
            expect(screen.getByText('Payment successful')).toBeInTheDocument()
        })
    })

    describe('Declined state', () => {
        it('renders declined message with try again button', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({status: TERMINAL_PAYMENT_STATUS.DECLINED})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByTestId('terminal-payment-declined')).toBeInTheDocument()
            expect(screen.getByText('Payment declined')).toBeInTheDocument()
            expect(screen.getByTestId('try-again')).toBeInTheDocument()
        })

        it('calls reset on try again click', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({status: TERMINAL_PAYMENT_STATUS.DECLINED})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            fireEvent.click(screen.getByTestId('try-again'))

            expect(mockReset).toHaveBeenCalled()
        })
    })

    describe('Cancelled state', () => {
        it('renders cancelled message with try again button', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({status: TERMINAL_PAYMENT_STATUS.CANCELLED})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByTestId('terminal-payment-cancelled')).toBeInTheDocument()
            expect(screen.getByText('Payment cancelled')).toBeInTheDocument()
        })

        it('calls reset on try again click', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({status: TERMINAL_PAYMENT_STATUS.CANCELLED})
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            fireEvent.click(screen.getByTestId('try-again'))

            expect(mockReset).toHaveBeenCalled()
        })
    })

    describe('Error state', () => {
        it('renders error message with try again button', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({
                    status: TERMINAL_PAYMENT_STATUS.ERROR,
                    error: new Error('Connection timeout')
                })
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByTestId('terminal-payment-error')).toBeInTheDocument()
            expect(screen.getByText('Connection timeout')).toBeInTheDocument()
        })

        it('renders fallback error message when error has no message', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({
                    status: TERMINAL_PAYMENT_STATUS.ERROR,
                    error: {}
                })
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(screen.getByText('An error occurred')).toBeInTheDocument()
        })

        it('calls reset on try again click', () => {
            useTerminalPayment.mockReturnValue(
                setupHookReturn({
                    status: TERMINAL_PAYMENT_STATUS.ERROR,
                    error: new Error('fail')
                })
            )

            render(<TerminalPaymentComponent {...defaultProps} />)

            fireEvent.click(screen.getByTestId('try-again'))

            expect(mockReset).toHaveBeenCalled()
        })
    })

    describe('Hook integration', () => {
        it('passes correct props to useTerminalPayment', () => {
            render(<TerminalPaymentComponent {...defaultProps} />)

            expect(useTerminalPayment).toHaveBeenCalledWith(
                expect.objectContaining({
                    customerId: 'test-customer',
                    basketId: 'test-basket',
                    site: {id: 'test-site'},
                    storeId: 'store-001'
                })
            )
        })

        it('uses default navigate to confirmation on success when no onSuccess prop', () => {
            const navigateFn = jest.fn()
            useTerminalPayment.mockImplementation(({onSuccess}) => {
                // Simulate immediate success callback
                if (onSuccess) {
                    onSuccess({orderNo: '00001'})
                }
                return setupHookReturn({
                    status: TERMINAL_PAYMENT_STATUS.SUCCESS,
                    result: {orderNo: '00001'}
                })
            })

            render(
                <TerminalPaymentComponent
                    {...defaultProps}
                    navigate={navigateFn}
                    onSuccess={undefined}
                />
            )

            expect(navigateFn).toHaveBeenCalledWith('/checkout/confirmation/00001')
        })
    })
})
