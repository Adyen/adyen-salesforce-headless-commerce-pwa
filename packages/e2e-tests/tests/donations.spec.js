import {test, expect} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'
import {ShopperData} from '../data/shopperData.js'
import {PaymentHelper} from '../helpers/PaymentHelper.js'
import {CardData} from '../data/cardData.js'

const user_US = new ShopperData().US
const card = new CardData().storedCard

test.describe.only('Donations through PWA UI', () => {
    test('donation after CC 3Ds2 payment should succeed', async ({page}) => {
        const scenarios = new ScenarioHelper(page)
        await scenarios.visitStore()
        await scenarios.setupCart()

        await scenarios.arrangeShippingAndProceedToPayment(user_US)
        const paymentPage = new PaymentHelper(page)
        await paymentPage.selectPaymentType('Cards')
        await paymentPage.fillCreditCardInfo(
            user_US.shopperName,
            card.cardNumber,
            card.expirationDate,
            card.cvc
        )
        await paymentPage.clickPay()
        await scenarios.verifySuccessfulOrder()

        const donationComponent = page.locator(
            '.adyen-checkout__adyen-giving'
        )
        await expect(donationComponent).toBeVisible({timeout: 15000})

        const donateButton = donationComponent.locator('.adyen-checkout__button--donate')
        await donateButton.click()

        const donationSuccess = donationComponent.locator(
            '.adyen-checkout__status--success, .adyen-checkout__status__text'
        )
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
          card.cardNumber,
          card.expirationDate,
          card.cvc
        )
        await paymentPage.clickPay()
        await scenarios.verifySuccessfulOrder()

        const donationComponent = page.locator(
            '.adyen-checkout__adyen-giving'
        )
        await expect(donationComponent).toBeVisible({timeout: 15000})

        const notNowButton = donationComponent.locator('.adyen-checkout__button--decline')
        await notNowButton.click()

        await expect(donationComponent).not.toBeVisible({timeout: 5000})
    })
})
