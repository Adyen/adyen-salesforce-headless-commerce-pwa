import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {CardData} from '../data/cardData.js'

const user_US = new ShopperData().US
const threeDs2 = new CardData().threeDs2
const storedCard = new CardData().storedCard

test.describe('Payments through PWA UI', () => {
    test('CC 3Ds2 payments should succeed', async ({page}) => {
        const scenarios = new ScenarioHelper(page)
        await scenarios.visitStore()
        await scenarios.setupCart()

        await scenarios.arrangeShippingAndProceedToPayment(user_US)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('Cards')
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

    test.only('Tokenized payment should succeed', async ({page}) => {
        const scenarios = new ScenarioHelper(page)
        await scenarios.visitStore()
        await scenarios.setupCart()
        await scenarios.login(user_US)
        await scenarios.arrangeShippingAndProceedToPaymentForLoggedInUser(user_US)

        const paymentPage = new PaymentHelper(page)
        await paymentPage.fillCVCInfo(
            storedCard.cvc
        )
        await paymentPage.clickPay()
        await scenarios.verifySuccessfulOrder()
    })
})
