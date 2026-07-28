jest.mock('./AUTHORISATION', () => ({
    handleSuccessfulAuthorisation: jest.fn()
}));

const {handleSuccessfulAuthorisation} = require('./AUTHORISATION');
const {handle} = require('./MANUAL_REVIEW_ACCEPT');

function makeOrder() {
    return {
        orderNo: 'ORDER-1',
        trackOrderChange: jest.fn()
    };
}

describe('MANUAL_REVIEW_ACCEPT event handler', () => {
    it('places the order via handleSuccessfulAuthorisation when the webhook was successful', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'true'}};
        const result = {};

        handle({order, customObj, result});

        expect(order.trackOrderChange).toHaveBeenCalledWith(
            'Manual review is accepted in Adyen Customer Area, placing the order'
        );
        expect(handleSuccessfulAuthorisation).toHaveBeenCalledWith(order, result);
    });

    it('does nothing when the webhook was unsuccessful', () => {
        const order = makeOrder();
        const customObj = {custom: {success: 'false'}};
        const result = {};

        handle({order, customObj, result});

        expect(order.trackOrderChange).not.toHaveBeenCalled();
        expect(handleSuccessfulAuthorisation).not.toHaveBeenCalled();
    });
});
