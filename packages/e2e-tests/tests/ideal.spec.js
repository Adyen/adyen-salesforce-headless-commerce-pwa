import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import { LocaleData } from "../data/localeData";

const user_FR = new ShopperData().FR

test.describe('Payments through PWA UI', () => {
  test.beforeEach(async ({page}) => {
    const scenarios = new ScenarioHelper(page, new LocaleData().FR)
    await scenarios.visitStore()
    await scenarios.setupCart()
  })

  test('iDEAL should redirect', async ({page}) => {
    const scenarios = new ScenarioHelper(page, new LocaleData().FR)
    await scenarios.arrangeShippingAndProceedToPayment(user_FR)
    const paymentPage = new PaymentHelper(page)
    await paymentPage.selectPaymentType('iDEAL')
    await paymentPage.clickPay()
    await paymentPage.waitForIdealLoad()
  })
})
