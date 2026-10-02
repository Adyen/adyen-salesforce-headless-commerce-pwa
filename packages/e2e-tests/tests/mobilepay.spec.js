import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {LocaleData} from '../data/localeData'

const user_DK = new ShopperData().DK

test.describe('Payments through PWA UI', () => {
    test.beforeEach(async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().DK)
        await scenarios.visitStore()
        await scenarios.setupCart()
    })

    test('MobilePay should render and redirect', async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().DK)
        await scenarios.arrangeShippingAndProceedToPayment(user_DK)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('MobilePay')
        await paymentPage.clickPay()
        await paymentPage.waitForMobilePayLoad()
    })
})
