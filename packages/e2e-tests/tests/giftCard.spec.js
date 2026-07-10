import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {CardData} from '../data/cardData.js'
import {LocaleData} from '../data/localeData'

const user_US = new ShopperData().US
const user_FR = new ShopperData().FR
const giftCard = new CardData().giftCard
const threeDs2 = new CardData().threeDs2


test.describe('Payments through PWA UI', () => {
    test('gift card payments should succeed', async ({page}) => {
        const scenarios = new ScenarioHelper(page)
        await scenarios.visitStore()
        await scenarios.setupCart()

        await scenarios.arrangeShippingAndProceedToPayment(user_US)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType(giftCard.brand)
        await paymentPage.fillGiftCardInfo(giftCard.cardNumber, giftCard.pin)
        await paymentPage.clickPay()
        await paymentPage.addedGiftCardIsDisplayed()

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

    test('gift card + iDEAL should redirect', async ({page}) => {
        const scenarios = new ScenarioHelper(page, new LocaleData().FR)
        await scenarios.visitStore()
        await scenarios.setupCart()
        await scenarios.arrangeShippingAndProceedToPayment(user_FR)

        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType(giftCard.brand)
        await paymentPage.fillGiftCardInfo(giftCard.cardNumber, giftCard.pin)
        await paymentPage.clickPay()
        await paymentPage.addedGiftCardIsDisplayed()

        await paymentPage.selectPaymentType('iDEAL')
        await paymentPage.clickPay()
        await paymentPage.waitForIdealLoad()
    })

    test('gift card + PayPal payment should succeed', async ({page}) => {
        const scenarios = new ScenarioHelper(page)
        await scenarios.visitStore()
        await scenarios.setupCart()
        await scenarios.arrangeShippingAndProceedToPayment(user_US)

        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType(giftCard.brand)
        await paymentPage.fillGiftCardInfo(giftCard.cardNumber, giftCard.pin)
        await paymentPage.clickPay()
        await paymentPage.addedGiftCardIsDisplayed()

        await paymentPage.selectPaymentType('PayPal')
        await paymentPage.initiatePayPalPayment()
        await scenarios.verifySuccessfulOrder()
    })
})
