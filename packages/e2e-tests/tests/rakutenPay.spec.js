import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {LocaleData} from '../data/localeData'

const user_JP = new ShopperData().JP

test.describe('Payments through PWA UI', () => {
    test.beforeEach(async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().JP)
        await scenarios.visitStore()
        await scenarios.setupCart()
    })

    test('Rakuten Pay should render on checkout page for Japanese locale', async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().JP)
        await scenarios.arrangeShippingAndProceedToPayment(user_JP)
        const paymentPage = new PaymentHelper(page)
        // Adyen returns the localized display name for the ja-JP shopper locale
        // (confirmed via CI trace), not the English "Rakuten Pay" label.
        await paymentPage.selectPaymentType('楽天ペイ')
        await paymentPage.rakutenPayIsRendered()
    })
})
