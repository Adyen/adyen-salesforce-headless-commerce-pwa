import {expect, test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import { LocaleData } from "../data/localeData";
import { PaymentHelper } from "../helpers/PaymentHelper";

const user_IN = new ShopperData().IN

test.describe('Payments through PWA UI', () => {
    test.beforeEach(async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().IN)
        await scenarios.visitStore()
        await scenarios.setupCart()
    })

    test.only('UPI should render only on checkout page for Indian locale', async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().IN)
        await scenarios.arrangeShippingAndProceedToPayment(user_IN)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('UPI')
        await paymentPage.clickPay()
    })
})
