import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {LocaleData} from '../data/localeData'

const user_NO = new ShopperData().NO

test.describe('Payments through PWA UI', () => {
    test.beforeEach(async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().NO)
        await scenarios.visitStore()
        await scenarios.setupCart()
    })

    test('Vipps should render and redirect', async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().NO)
        await scenarios.arrangeShippingAndProceedToPayment(user_NO)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('Vipps')
        await paymentPage.clickPay()
        await paymentPage.waitForVippsLoad()
    })
})
