const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const StringUtils = require('dw/util/StringUtils');
const PaymentMgr = require('dw/order/PaymentMgr');
const PaymentTransaction = require('dw/order/PaymentTransaction');
const Logger = require('dw/system/Logger');
const {
    createOrUpdateNotificationObject,
    createLogMessage,
    isWebhookSuccessful,
    updatePaymentTransaction
} = require('./notificationEventHelper');

function makeCustomObject() {
    return {custom: {}};
}

describe('notificationEventHelper', () => {
    describe('createOrUpdateNotificationObject', () => {
        beforeEach(() => {
            StringUtils.formatCalendar.mockReturnValue('20240101120000000');
        });

        it('creates a new custom object when none exists yet', () => {
            CustomObjectMgr.getCustomObject.mockReturnValue(null);
            const created = makeCustomObject();
            CustomObjectMgr.createCustomObject.mockReturnValue(created);

            const result = createOrUpdateNotificationObject({
                merchantReference: 'ref-1',
                eventCode: 'AUTHORISATION'
            });

            expect(CustomObjectMgr.createCustomObject).toHaveBeenCalledWith(
                'adyenNotification',
                'ref-1-20240101120000000'
            );
            expect(result).toBe(created);
        });

        it('reuses an existing custom object instead of creating a new one', () => {
            const existing = makeCustomObject();
            CustomObjectMgr.getCustomObject.mockReturnValue(existing);

            const result = createOrUpdateNotificationObject({
                merchantReference: 'ref-1',
                eventCode: 'AUTHORISATION'
            });

            expect(CustomObjectMgr.createCustomObject).not.toHaveBeenCalled();
            expect(result).toBe(existing);
        });

        it('copies every field from data onto customObj.custom', () => {
            const existing = makeCustomObject();
            CustomObjectMgr.getCustomObject.mockReturnValue(existing);

            const result = createOrUpdateNotificationObject({
                merchantReference: 'ref-1',
                eventCode: 'AUTHORISATION',
                pspReference: 'psp-1'
            });

            expect(result.custom.merchantReference).toBe('ref-1');
            expect(result.custom.pspReference).toBe('psp-1');
        });

        it('sets updateStatus to PROCESS for known process events', () => {
            CustomObjectMgr.getCustomObject.mockReturnValue(makeCustomObject());

            const result = createOrUpdateNotificationObject({
                merchantReference: 'ref-1',
                eventCode: 'AUTHORISATION'
            });

            expect(result.custom.updateStatus).toBe('PROCESS');
        });

        it('sets updateStatus to PENDING for unknown events', () => {
            CustomObjectMgr.getCustomObject.mockReturnValue(makeCustomObject());

            const result = createOrUpdateNotificationObject({
                merchantReference: 'ref-1',
                eventCode: 'SOME_UNKNOWN_EVENT'
            });

            expect(result.custom.updateStatus).toBe('PENDING');
        });

        it('extracts amount value/currency onto the custom object when present', () => {
            CustomObjectMgr.getCustomObject.mockReturnValue(makeCustomObject());

            const result = createOrUpdateNotificationObject({
                merchantReference: 'ref-1',
                eventCode: 'AUTHORISATION',
                amount: {value: 1000, currency: 'EUR'}
            });

            expect(result.custom.value).toBe(1000);
            expect(result.custom.currency).toBe('EUR');
        });

        it('ignores fields that throw when assigned to customObj.custom', () => {
            const existing = {custom: {}};
            Object.defineProperty(existing.custom, 'weirdField', {
                set() {
                    throw new Error('unknown field');
                }
            });
            CustomObjectMgr.getCustomObject.mockReturnValue(existing);

            expect(() =>
                createOrUpdateNotificationObject({
                    merchantReference: 'ref-1',
                    eventCode: 'AUTHORISATION',
                    weirdField: 'value'
                })
            ).not.toThrow();
            expect(existing.custom.updateStatus).toBe('PROCESS');
        });

        it('stores the raw notification payload as JSON on custom.log', () => {
            CustomObjectMgr.getCustomObject.mockReturnValue(makeCustomObject());
            const data = {merchantReference: 'ref-1', eventCode: 'AUTHORISATION'};

            const result = createOrUpdateNotificationObject(data);

            expect(result.custom.log).toBe(JSON.stringify(data));
            expect(Logger.__logger.info).toHaveBeenCalled();
        });
    });

    describe('createLogMessage', () => {
        it('builds a readable log message from the custom object fields', () => {
            const customObj = {
                custom: {
                    version: '1.0',
                    httpRemoteAddress: '127.0.0.1',
                    reason: 'some reason',
                    eventDate: '2024-01-01',
                    merchantReference: 'ref-1',
                    currency: 'EUR',
                    pspReference: 'psp-1',
                    merchantAccountCode: 'MerchantAccount',
                    eventCode: 'AUTHORISATION',
                    value: 1000,
                    operations: ['CANCEL', 'REFUND'],
                    success: 'true',
                    paymentMethod: 'scheme',
                    live: 'false'
                }
            };

            const message = createLogMessage(customObj);

            expect(message).toContain('AdyenNotification v 1.0');
            expect(message).toContain('Called from : 127.0.0.1');
            expect(message).toContain('merchantReference : ref-1');
            expect(message).toContain('operations : CANCEL,REFUND');
            expect(message).toContain('success : true');
        });
    });

    describe('isWebhookSuccessful', () => {
        it('returns true when custom.success is the string "true"', () => {
            expect(isWebhookSuccessful({custom: {success: 'true'}})).toBe(true);
        });

        it('returns false when custom.success is "false"', () => {
            expect(isWebhookSuccessful({custom: {success: 'false'}})).toBe(false);
        });

        it('returns a falsy value when customObj or custom is missing', () => {
            expect(isWebhookSuccessful(null)).toBeFalsy();
            expect(isWebhookSuccessful({})).toBeFalsy();
        });
    });

    describe('updatePaymentTransaction', () => {
        function makePaymentInstrument(overrides = {}) {
            return {
                custom: {paymentMethodType: 'scheme', ...overrides.custom},
                paymentTransaction: {
                    custom: {},
                    setTransactionID: jest.fn(),
                    setType: jest.fn(),
                    setPaymentProcessor: jest.fn(),
                    setAmount: jest.fn(),
                    setAccountID: jest.fn()
                },
                getPaymentMethod: jest.fn(() => 'CREDIT_CARD'),
                ...overrides
            };
        }

        function makeOrder(paymentInstruments) {
            return {
                getPaymentInstruments: jest.fn(() => ({
                    toArray: () => paymentInstruments
                }))
            };
        }

        function customObjWith(overrides = {}) {
            return {
                custom: {
                    pspReference: 'psp-1',
                    value: 1000,
                    currency: 'EUR',
                    merchantAccountCode: 'MerchantAccount',
                    log: '{}',
                    ...overrides
                }
            };
        }

        beforeEach(() => {
            PaymentMgr.getPaymentMethod.mockReturnValue({
                getPaymentProcessor: () => ({id: 'ADYEN_PROCESSOR'})
            });
        });

        it('updates the payment instrument matched by pspReference', () => {
            const pi = makePaymentInstrument({custom: {pspReference: 'psp-1', paymentMethodType: 'scheme'}});
            const order = makeOrder([pi]);
            const customObj = customObjWith();

            const result = updatePaymentTransaction(order, customObj, PaymentTransaction.TYPE_AUTH);

            expect(result).toBe(true);
            expect(pi.paymentTransaction.setTransactionID).toHaveBeenCalledWith('psp-1');
            expect(pi.paymentTransaction.setType).toHaveBeenCalledWith(PaymentTransaction.TYPE_AUTH);
            expect(pi.paymentTransaction.setAccountID).toHaveBeenCalledWith('MerchantAccount');
        });

        it('falls back to the first non-giftcard payment instrument when no pspReference matches', () => {
            const giftcard = makePaymentInstrument({custom: {pspReference: 'other', paymentMethodType: 'giftcard'}});
            const fallback = makePaymentInstrument({custom: {pspReference: 'other-2', paymentMethodType: 'scheme'}});
            const order = makeOrder([giftcard, fallback]);
            const customObj = customObjWith();

            const result = updatePaymentTransaction(order, customObj, PaymentTransaction.TYPE_AUTH);

            expect(result).toBe(true);
            expect(fallback.paymentTransaction.setTransactionID).toHaveBeenCalledWith('psp-1');
            expect(giftcard.paymentTransaction.setTransactionID).not.toHaveBeenCalled();
        });

        it('returns false when nothing matches and only a giftcard instrument exists', () => {
            const giftcard = makePaymentInstrument({custom: {pspReference: 'other', paymentMethodType: 'giftcard'}});
            const order = makeOrder([giftcard]);
            const customObj = customObjWith();

            const result = updatePaymentTransaction(order, customObj, PaymentTransaction.TYPE_AUTH);

            expect(result).toBe(false);
            expect(giftcard.paymentTransaction.setTransactionID).not.toHaveBeenCalled();
        });

        it('skips instruments whose payment method has no processor', () => {
            PaymentMgr.getPaymentMethod.mockReturnValue({getPaymentProcessor: () => null});
            const pi = makePaymentInstrument({custom: {pspReference: 'psp-1', paymentMethodType: 'scheme'}});
            const order = makeOrder([pi]);
            const customObj = customObjWith();

            const result = updatePaymentTransaction(order, customObj, PaymentTransaction.TYPE_AUTH);

            expect(result).toBe(true);
            expect(pi.paymentTransaction.setTransactionID).not.toHaveBeenCalled();
        });
    });
});
