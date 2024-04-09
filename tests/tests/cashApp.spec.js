import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {CardData} from '../data/cardData.js'

const user_US = new ShopperData().US
const threeDs2 = new CardData().threeDs2

test.describe('Payments through PWA UI', () => {
  test.beforeEach(async ({page}) => {
    const scenarios = new ScenarioHelper(page)
    await scenarios.visitStore()
    await scenarios.setupCart()
  })

  test('CashApp should render', async ({page}) => {
    const scenarios = new ScenarioHelper(page)
    await scenarios.arrangeShippingAndProceedToPayment(user_US)
    const paymentPage = new PaymentHelper(page)
    await paymentPage.selectPaymentType('Cash App Pay')
  })
})
