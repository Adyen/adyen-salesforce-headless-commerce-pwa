const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const Status = require('dw/system/Status');
const {handle, handleSuccessfulAuthorisation} = require('./AUTHORISATION');

function makeOrder({paymentStatusValue, statusValue, paymentInstruments = []} = {}) {
    return {
        orderNo: 'ORDER-1',
        paymentStatus: {value: paymentStatusValue},
        status: {value: statusValue},
        setPaymentStatus: jest.fn(),
        setExportStatus: jest.fn(),
        setConfirmationStatus: jest.fn(),
        trackOrderChange: jest.fn(),
        getPaymentInstruments: jest.fn(() => ({toArray: () => paymentInstruments})),
        paymentInstruments: {toArray: () => paymentInstruments}
    };
}

function makeCustomObj({value = '1000', success = 'true', log = {}} = {}) {
    return {
        custom: {
            value,
            success,
            currency: 'EUR',
            pspReference: 'psp-1',
            merchantAccountCode: 'MerchantAccount',
            log: JSON.stringify(log)
        }
    };
}

describe('AUTHORISATION event handler', () => {
    describe('when the webhook is unsuccessful', () => {
        it('fails a CREATED order and marks it as not paid', () => {
            const order = makeOrder({statusValue: Order.ORDER_STATUS_CREATED});
            const customObj = makeCustomObj({success: 'false'});

            const result = handle({order, customObj, result: {}, totalAmount: 1000});

            expect(order.trackOrderChange).toHaveBeenCalledWith(
                'Authorisation refused (success=false), failing order'
            );
            expect(order.setConfirmationStatus).toHaveBeenCalledWith(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
            expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_NOTPAID);
            expect(order.setExportStatus).toHaveBeenCalledWith(Order.EXPORT_STATUS_NOTEXPORTED);
            expect(OrderMgr.failOrder).toHaveBeenCalledWith(order, false);
            expect(result).toEqual({success: false, isAdyenPayment: true});
        });

        it('resets statuses on an already FAILED order without failing it again', () => {
            const order = makeOrder({statusValue: Order.ORDER_STATUS_FAILED});
            const customObj = makeCustomObj({success: 'false'});

            handle({order, customObj, result: {}, totalAmount: 1000});

            expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_NOTPAID);
            expect(order.trackOrderChange).not.toHaveBeenCalled();
            expect(OrderMgr.failOrder).not.toHaveBeenCalled();
        });

        it('does nothing for orders in other statuses', () => {
            const order = makeOrder({statusValue: 'OPEN'});
            const customObj = makeCustomObj({success: 'false'});

            handle({order, customObj, result: {}, totalAmount: 1000});

            expect(order.setPaymentStatus).not.toHaveBeenCalled();
            expect(order.trackOrderChange).not.toHaveBeenCalled();
        });
    });

    describe('when the webhook is successful', () => {
        it('treats an already PAID order as a duplicate callback and makes no status changes', () => {
            const order = makeOrder({paymentStatusValue: Order.PAYMENT_STATUS_PAID});
            const customObj = makeCustomObj({value: '1000'});

            const result = handle({order, customObj, result: {}, totalAmount: 1000});

            expect(order.setPaymentStatus).not.toHaveBeenCalled();
            expect(OrderMgr.placeOrder).not.toHaveBeenCalled();
            expect(result).toEqual({success: true, isAdyenPayment: true});
        });

        it('marks the order as partially paid when the amount paid is lower than the total', () => {
            const order = makeOrder({paymentStatusValue: Order.PAYMENT_STATUS_NOTPAID});
            const customObj = makeCustomObj({value: '500'});

            handle({order, customObj, result: {}, totalAmount: 1000});

            expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_PARTPAID);
            expect(OrderMgr.placeOrder).not.toHaveBeenCalled();
        });

        it('flags the order for manual review without placing it when fraudResultType is AMBER', () => {
            const order = makeOrder({paymentStatusValue: Order.PAYMENT_STATUS_NOTPAID});
            const customObj = makeCustomObj({
                value: '1000',
                log: {additionalData: {fraudResultType: 'AMBER'}}
            });

            handle({order, customObj, result: {}, totalAmount: 1000});

            expect(order.trackOrderChange).toHaveBeenCalledWith(
                'Order sent for manual review in Adyen Customer Area'
            );
            expect(OrderMgr.placeOrder).not.toHaveBeenCalled();
        });

        it('recovers a FAILED order and places it successfully when amounts match', () => {
            OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.OK});
            const order = makeOrder({
                paymentStatusValue: Order.PAYMENT_STATUS_NOTPAID,
                statusValue: Order.ORDER_STATUS_FAILED
            });
            const customObj = makeCustomObj({value: '1000'});
            const result = {};

            handle({order, customObj, result, totalAmount: 1000});

            expect(OrderMgr.undoFailOrder).toHaveBeenCalledWith(order);
            expect(order.trackOrderChange).toHaveBeenCalledWith(
                'Authorisation webhook received for failed order, moving order status to CREATED'
            );
            expect(order.setPaymentStatus).toHaveBeenCalledWith(Order.PAYMENT_STATUS_PAID);
            expect(order.setExportStatus).toHaveBeenCalledWith(Order.EXPORT_STATUS_READY);
            expect(order.setConfirmationStatus).toHaveBeenCalledWith(Order.CONFIRMATION_STATUS_CONFIRMED);
            expect(result.SubmitOrder).toBe(true);
        });

        it('does not mark the order as paid when placeOrder fails', () => {
            OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.ERROR});
            const order = makeOrder({paymentStatusValue: Order.PAYMENT_STATUS_NOTPAID});
            const customObj = makeCustomObj({value: '1000'});
            const result = {};

            handle({order, customObj, result, totalAmount: 1000});

            expect(order.setPaymentStatus).not.toHaveBeenCalled();
            expect(result.SubmitOrder).toBeUndefined();
        });

        it('populates terminal fields on the payment instrument when additionalData.terminalId is present', () => {
            OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.OK});
            const paymentInstrument = {
                custom: {paymentMethodType: 'scheme'},
                getPaymentMethod: jest.fn(() => 'CREDIT_CARD')
            };
            const order = makeOrder({
                paymentStatusValue: Order.PAYMENT_STATUS_NOTPAID,
                paymentInstruments: [paymentInstrument]
            });
            const customObj = makeCustomObj({
                value: '1000',
                log: {
                    additionalData: {
                        terminalId: 'TERM-1',
                        store: 'STORE-1',
                        paymentMethod: 'visa',
                        paymentMethodVariant: 'visacredit'
                    }
                }
            });

            handle({order, customObj, result: {}, totalAmount: 1000});

            expect(paymentInstrument.custom.terminalId).toBe('TERM-1');
            expect(paymentInstrument.custom.storeId).toBe('STORE-1');
            expect(paymentInstrument.custom.adyenPaymentMethod).toBe('visa');
            expect(paymentInstrument.custom.Adyen_Payment_Method_Variant).toBe('visacredit');
        });

        it('does not touch payment instruments when there is no terminalId', () => {
            OrderMgr.placeOrder.mockReturnValue({getCode: () => Status.OK});
            const paymentInstrument = {
                custom: {paymentMethodType: 'scheme'},
                getPaymentMethod: jest.fn(() => 'CREDIT_CARD')
            };
            const order = makeOrder({
                paymentStatusValue: Order.PAYMENT_STATUS_NOTPAID,
                paymentInstruments: [paymentInstrument]
            });
            const customObj = makeCustomObj({value: '1000', log: {}});

            handle({order, customObj, result: {}, totalAmount: 1000});

            expect(paymentInstrument.custom.terminalId).toBeUndefined();
        });
    });

    describe('handleSuccessfulAuthorisation', () => {
        it('is exported for reuse by MANUAL_REVIEW_ACCEPT', () => {
            expect(typeof handleSuccessfulAuthorisation).toBe('function');
        });
    });
});
