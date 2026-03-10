import {OrderApiClient} from '../orderApi'

describe('OrderApiClient', () => {
    let orderApiClient
    let mockCallAdminApi

    beforeEach(() => {
        orderApiClient = new OrderApiClient()
        mockCallAdminApi = jest.fn()
        orderApiClient._callAdminApi = mockCallAdminApi
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('getOrder', () => {
        it('should return order data on successful response', async () => {
            const mockOrderNo = '123'
            const mockResponseBody = {orderId: '123', status: 'completed'}

            mockCallAdminApi.mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponseBody)
            })

            const result = await orderApiClient.getOrder(mockOrderNo)

            expect(result).toEqual(mockResponseBody)
            expect(mockCallAdminApi).toHaveBeenCalledWith('GET', mockOrderNo)
        })

        it('should throw an error on unsuccessful response', async () => {
            const mockOrderNo = '456'
            mockCallAdminApi.mockRejectedValue(new Error('API Error'))

            await expect(orderApiClient.getOrder(mockOrderNo)).rejects.toThrow('API Error')
            expect(mockCallAdminApi).toHaveBeenCalledWith('GET', mockOrderNo)
        })
    })

    describe('updateOrderStatus', () => {
        it('should update order status successfully', async () => {
            const mockOrderNo = '123'
            const mockStatus = 'shipped'

            mockCallAdminApi.mockResolvedValue({
                ok: true
            })

            const result = await orderApiClient.updateOrderStatus(mockOrderNo, mockStatus)
            expect(result.ok).toBe(true)
            expect(mockCallAdminApi).toHaveBeenCalledWith('PUT', `${mockOrderNo}/status`, {
                body: JSON.stringify({status: mockStatus})
            })
        })

        it('should throw an error on unsuccessful response', async () => {
            const mockOrderNo = '456'
            const mockStatus = 'invalidStatus'

            mockCallAdminApi.mockRejectedValue(new Error('API Error'))

            await expect(orderApiClient.updateOrderStatus(mockOrderNo, mockStatus)).rejects.toThrow(
                'API Error'
            )
            expect(mockCallAdminApi).toHaveBeenCalledWith('PUT', `${mockOrderNo}/status`, {
                body: JSON.stringify({status: mockStatus})
            })
        })
    })

    describe('updateOrderPaymentStatus', () => {
        it('should update order payment status successfully', async () => {
            const mockOrderNo = '123'
            const mockStatus = 'paid'

            mockCallAdminApi.mockResolvedValue({
                ok: true
            })

            const result = await orderApiClient.updateOrderPaymentStatus(mockOrderNo, mockStatus)
            expect(result.ok).toBe(true)
            expect(mockCallAdminApi).toHaveBeenCalledWith('PUT', `${mockOrderNo}/payment-status`, {
                body: JSON.stringify({status: mockStatus})
            })
        })

        it('should throw an error on unsuccessful response', async () => {
            const mockOrderNo = '456'
            const mockStatus = 'invalidStatus'

            mockCallAdminApi.mockRejectedValue(new Error('API Error'))

            await expect(
                orderApiClient.updateOrderPaymentStatus(mockOrderNo, mockStatus)
            ).rejects.toThrow('API Error')
            expect(mockCallAdminApi).toHaveBeenCalledWith('PUT', `${mockOrderNo}/payment-status`, {
                body: JSON.stringify({status: mockStatus})
            })
        })
    })

    describe('updateOrderExportStatus', () => {
        it('should update order export status successfully', async () => {
            const mockOrderNo = '123'
            const mockStatus = 'exported'

            mockCallAdminApi.mockResolvedValue({
                ok: true
            })

            const result = await orderApiClient.updateOrderExportStatus(mockOrderNo, mockStatus)
            expect(result.ok).toBe(true)
            expect(mockCallAdminApi).toHaveBeenCalledWith('PUT', `${mockOrderNo}/export-status`, {
                body: JSON.stringify({status: mockStatus})
            })
        })

        it('should throw an error on unsuccessful response', async () => {
            const mockOrderNo = '456'
            const mockStatus = 'invalidStatus'

            mockCallAdminApi.mockRejectedValue(new Error('API Error'))

            await expect(
                orderApiClient.updateOrderExportStatus(mockOrderNo, mockStatus)
            ).rejects.toThrow('API Error')
            expect(mockCallAdminApi).toHaveBeenCalledWith('PUT', `${mockOrderNo}/export-status`, {
                body: JSON.stringify({status: mockStatus})
            })
        })
    })

    describe('updateOrderConfirmationStatus', () => {
        it('should update order confirmation status successfully', async () => {
            const mockOrderNo = '123'
            const mockStatus = 'confirmed'

            mockCallAdminApi.mockResolvedValue({
                ok: true
            })

            const result = await orderApiClient.updateOrderConfirmationStatus(
                mockOrderNo,
                mockStatus
            )

            expect(result.ok).toBe(true)
            expect(mockCallAdminApi).toHaveBeenCalledWith(
                'PUT',
                `${mockOrderNo}/confirmation-status`,
                {
                    body: JSON.stringify({status: mockStatus})
                }
            )
        })

        it('should throw an error on unsuccessful response', async () => {
            const mockOrderNo = '456'
            const mockStatus = 'invalidStatus'

            mockCallAdminApi.mockRejectedValue(new Error('API Error'))

            await expect(
                orderApiClient.updateOrderConfirmationStatus(mockOrderNo, mockStatus)
            ).rejects.toThrow('API Error')
            expect(mockCallAdminApi).toHaveBeenCalledWith(
                'PUT',
                `${mockOrderNo}/confirmation-status`,
                {
                    body: JSON.stringify({status: mockStatus})
                }
            )
        })
    })

    describe('updateOrderPaymentTransaction', () => {
        it('should update payment transaction successfully', async () => {
            const mockOrderNo = '123'
            const mockPaymentInstrumentId = '456'
            const mockPspReference = '789'

            mockCallAdminApi.mockResolvedValue({
                ok: true
            })

            const result = await orderApiClient.updateOrderPaymentTransaction(
                mockOrderNo,
                mockPaymentInstrumentId,
                mockPspReference
            )
            expect(result.ok).toBe(true)
            expect(mockCallAdminApi).toHaveBeenCalledWith(
                'PATCH',
                `${mockOrderNo}/payment-instruments/${mockPaymentInstrumentId}/transaction`,
                {
                    body: JSON.stringify({
                        c_externalReferenceCode: mockPspReference
                    })
                }
            )
        })

        it('should throw an error on unsuccessful response', async () => {
            const mockOrderNo = '123'
            const mockPaymentInstrumentId = '456'
            const mockPspReference = '789'

            mockCallAdminApi.mockRejectedValue(new Error('API Error'))

            await expect(
                orderApiClient.updateOrderPaymentTransaction(
                    mockOrderNo,
                    mockPaymentInstrumentId,
                    mockPspReference
                )
            ).rejects.toThrow('API Error')
            expect(mockCallAdminApi).toHaveBeenCalledWith(
                'PATCH',
                `${mockOrderNo}/payment-instruments/${mockPaymentInstrumentId}/transaction`,
                {
                    body: JSON.stringify({
                        c_externalReferenceCode: mockPspReference
                    })
                }
            )
        })
    })
})
