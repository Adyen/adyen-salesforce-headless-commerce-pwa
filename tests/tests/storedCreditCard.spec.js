import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import { CardData } from "../data/cardData";

const user_US = new ShopperData().US
const storedCard = new CardData().storedCard

test.describe('Payments through PWA UI', () => {
  test('Tokenized payment should succeed', async ({page}) => {
    const scenarios = new ScenarioHelper(page)
    await scenarios.login(user_US)
    await scenarios.visitStore()
    await page.reload();

    await scenarios.setupCart()
    // await scenarios.arrangeShippingAndProceedToPaymentForLoggedInUser(user_US)

    const paymentPage = new PaymentHelper(page)
    await paymentPage.fillCVCInfo(
      storedCard.cvc
    )
    await paymentPage.clickPay()
    await scenarios.verifySuccessfulOrder()
  })
})