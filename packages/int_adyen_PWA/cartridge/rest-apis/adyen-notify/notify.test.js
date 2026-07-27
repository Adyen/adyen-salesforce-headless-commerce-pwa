const RESTResponseMgr = require('dw/system/RESTResponseMgr');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const Logger = require('dw/system/Logger');
const {notify} = require('./notify');

describe('adyen-notify notify', () => {
    beforeEach(() => {
        CustomObjectMgr.getCustomObject.mockReturnValue({custom: {}});
    });

    it('accepts a valid notification and renders a success response', () => {
        global.request.httpParameterMap.requestBodyAsString = JSON.stringify({
            notificationData: {merchantReference: 'ref-1', eventCode: 'AUTHORISATION', operations: []}
        });

        notify();

        expect(RESTResponseMgr.createSuccess).toHaveBeenCalledWith({success: true}, 200);
        expect(RESTResponseMgr.__successResponse.render).toHaveBeenCalled();
        expect(Logger.__logger.info).toHaveBeenCalledWith('Notify processed successfully');
    });

    it('returns a 500 error when the request body is empty', () => {
        global.request.httpParameterMap.requestBodyAsString = '';

        notify();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(500, 'internal_server_error');
        expect(RESTResponseMgr.__errorResponse.render).toHaveBeenCalled();
        expect(Logger.__logger.error).toHaveBeenCalled();
    });

    it('returns a 500 error when notificationData is missing', () => {
        global.request.httpParameterMap.requestBodyAsString = JSON.stringify({});

        notify();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(500, 'internal_server_error');
    });

    it('returns a 500 error when the request body is malformed JSON', () => {
        global.request.httpParameterMap.requestBodyAsString = '{not-json';

        notify();

        expect(RESTResponseMgr.createError).toHaveBeenCalledWith(500, 'internal_server_error');
    });

    it('is registered as a public endpoint', () => {
        expect(notify.public).toBe(true);
    });
});
