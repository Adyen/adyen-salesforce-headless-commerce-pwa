const constants = require('./constants');

describe('constants', () => {
    it('exposes the expected process events', () => {
        expect(constants.PROCESS_EVENTS).toEqual(
            expect.arrayContaining(['AUTHORISATION', 'CANCELLATION', 'REFUND', 'CAPTURE'])
        );
    });

    it('exposes the expected Adyen payment methods and processors', () => {
        expect(constants.ADYEN_METHODS).toEqual(
            expect.arrayContaining(['AdyenPOS', 'AdyenComponent', 'CREDIT_CARD'])
        );
        expect(constants.ADYEN_PROCESSORS).toEqual(
            expect.arrayContaining(['Adyen_POS', 'Adyen_Component'])
        );
    });

    it('exposes the expected update status values', () => {
        expect(constants.UPDATE_STATUS).toEqual({PROCESS: 'PROCESS', PENDING: 'PENDING'});
    });

    it('exposes the notification custom object name', () => {
        expect(constants.ADYEN_NOTIFICATION_NAME).toBe('adyenNotification');
    });
});
