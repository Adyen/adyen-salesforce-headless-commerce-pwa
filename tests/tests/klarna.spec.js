import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'

const user_US = new ShopperData().US

test.describe('Payments through PWA UI', () => {
  test.beforeEach(async ({page}) => {
    const scenarios = new ScenarioHelper(page)
    await scenarios.visitStore()
    await scenarios.setupCart()
  })

  test('Klarna should redirect', async ({page}) => {
    const scenarios = new ScenarioHelper(page)
    await scenarios.arrangeShippingAndProceedToPayment(user_US)
    const paymentPage = new PaymentHelper(page)
    await paymentPage.selectPaymentType('Pay over time with Klarna.')
    await paymentPage.clickPay()
    await paymentPage.waitForKlarnaLoad()
  })
})
