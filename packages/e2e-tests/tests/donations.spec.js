import {test, expect} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {CardData} from '../data/cardData.js'

const user_US = new ShopperData().US
const threeDs2 = new CardData().threeDs2

test.describe('Donations through PWA UI', () => {
    test('donation after CC 3Ds2 payment should succeed', async ({page}) => {
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

        const donationComponent = page.locator('.adyen-checkout__donation')
        await expect(donationComponent).toBeVisible({timeout: 15000})

        const donationAmountButton = donationComponent
            .locator('.adyen-checkout__donation-amount__button')
            .first()
        await donationAmountButton.click()

        const donateButton = donationComponent.locator('.adyen-checkout__button--donate')
        await donateButton.click()

        const donationSuccess = donationComponent.locator('.adyen-checkout__status--success')
        await expect(donationSuccess).toBeVisible({timeout: 15000})
    })

    test('donation can be declined by clicking Not now', async ({page}) => {
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

        const donationComponent = page.locator('.adyen-checkout__donation')
        await expect(donationComponent).toBeVisible({timeout: 15000})

        const notNowButton = donationComponent.locator('.adyen-checkout__button--decline')
        await notNowButton.click()

        await expect(donationComponent).not.toBeVisible({timeout: 5000})
    })
})
