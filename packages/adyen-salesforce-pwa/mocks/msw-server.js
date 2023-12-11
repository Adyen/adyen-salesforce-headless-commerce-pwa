import {setupServer} from 'msw/node'
import {paymentMethodsHandlers} from './adyenApi/paymentMethods'

export const mswServer = setupServer(...paymentMethodsHandlers)
