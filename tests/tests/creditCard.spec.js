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

    test('CC 3Ds2 payments should succeed', async ({page}) => {
        const scenarios = new ScenarioHelper(page)
        await scenarios.arrangeShippingAndProceedToPayment(user_US)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('Credit Card')
        await paymentPage.fillCreditCardInfo(
            user_US.shopperName,
            threeDs2.cardNumber,
            threeDs2.expirationDate,
            threeDs2.cvc
        )
        await paymentPage.clickPay()
        await paymentPage.validate3DS2('password')
        await scenarios.verifySuccessfulOrder()
    })
})
