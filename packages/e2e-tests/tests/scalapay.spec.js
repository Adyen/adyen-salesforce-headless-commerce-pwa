import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {LocaleData} from '../data/localeData'

const user_FR = new ShopperData().FR

// Scalapay is only available for shoppers in IT, FR, PT and ES, so this
// suite runs against the FR locale/shopper.
test.describe('Payments through PWA UI', () => {
    test.beforeEach(async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().FR)
        await scenarios.visitStore()
        await scenarios.setupCart()
    })

    test('Scalapay should render for FR locale', async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().FR)
        await scenarios.arrangeShippingAndProceedToPayment(user_FR)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('Scalapay')
    })

    // No Scalapay test user is available, so this only verifies the redirect
    // to the Scalapay portal and does not complete the full payment flow.
    test('Scalapay should redirect', async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().FR)
        await scenarios.arrangeShippingAndProceedToPayment(user_FR)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('Scalapay')
        await paymentPage.clickPay()
        await paymentPage.waitForScalapayLoad()
    })
})
