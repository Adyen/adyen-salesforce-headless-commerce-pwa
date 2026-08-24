import {PaymentData} from '../data/paymentData.js'

export class PaymentHelper {
    constructor(page) {
        this.page = page
        this.paymentSection = this.page.locator('.sf-toggle-card-step-3-content')

        this.activePaymentType = this.page.locator('.adyen-checkout__payment-method--selected')
        this.payButton = this.activePaymentType.locator('.adyen-checkout__button--pay')

        // CC Component Locators
        this.holderNameInput = this.activePaymentType.locator(
            '.adyen-checkout__card__holderName input'
        )
        this.cardNumberInput = this.activePaymentType
            .frameLocator('.adyen-checkout__card__cardNumber__input iframe')
            .locator('.input-field')
        this.expDateInput = this.activePaymentType
            .frameLocator('.adyen-checkout__card__exp-date__input iframe')
            .locator('.input-field')
        this.cvcInput = this.activePaymentType
            .frameLocator('.adyen-checkout__card__cvc__input iframe')
            .locator('.input-field')

        // 3Ds2 Component locators
        this.threeDS2Iframe = this.page.frameLocator(
            "iframe[name='threeDSIframe'], iframe[name*='threeDS']"
        )
        this.threeDS2PasswordInput = this.threeDS2Iframe.locator("input[name='answer']")
        this.threeDS2SubmitButton = this.threeDS2Iframe.locator("button[type='submit']")
        this.threeDS2CancelButton = this.threeDS2Iframe.locator('#buttonCancel')

        // Gift Card Component locators
        this.giftCardNumberInput = this.activePaymentType
            .frameLocator('.adyen-checkout__card__cardNumber__input iframe')
            .locator('.input-field')
        this.giftCardPinInput = this.activePaymentType
            .frameLocator('.adyen-checkout__card__cvc__input iframe')
            .locator('.input-field')
        this.AddedGiftCards = this.page.locator('.adyen-checkout__order-payment-method')
    }

    async selectPaymentType(paymentType) {
        const paymentLocator = this.page.locator(
            `.adyen-checkout__payment-method__name:has-text("${paymentType}")`
        )
        await paymentLocator.waitFor({state: 'visible'})
        await paymentLocator.click()
    }

    /* This is the generic method to click Pay button for majority of the drop-in payment methods
    Some payment methods require a specific locator, so make sure to utilize the corresponding function */
    async clickPay() {
        await this.payButton.click()
    }

    waitForKlarnaLoad = async () => {
        await this.page.waitForNavigation({
            url: /.*playground.klarna/,
            timeout: 20000,
            waitUntil: 'load'
        })
    }

    waitForIdealLoad = async () => {
        await this.page.waitForNavigation({
            url: /.*ideal.nl/,
            timeout: 20000,
            waitUntil: 'load'
        })
    }

    waitForMobilePayLoad = async () => {
        await this.page.waitForNavigation({
            url: /.*pay-mt.mobilepay.dk/,
            timeout: 20000,
            waitUntil: 'load'
        })
    }

    rakutenPayIsRendered = async () => {
        const rakutenPayComponent = this.activePaymentType.locator(
            '.adyen-checkout__payment-method__details'
        )
        await rakutenPayComponent.waitFor({state: 'visible', timeout: 10000})
    }

    initiatePayPalPayment = async () => {
        const payPalButton = this.page
            .frameLocator('.adyen-checkout__paypal__button--paypal iframe.visible')
            .locator('.paypal-button')

        const [popup] = await Promise.all([this.page.waitForEvent('popup'), payPalButton.click()])

        await popup.waitForNavigation({
            url: /.*sandbox.paypal.com*/,
            timeout: 20000
        })

        this.emailInput = popup.locator('#email')
        this.nextButton = popup.locator('#btnNext')
        this.passwordInput = popup.locator('#password')
        this.loginButton = popup.locator('#btnLogin')
        this.agreeAndPayNowButton = popup.locator('[data-id="payment-submit-btn"]')

        const payPalData = new PaymentData().PayPal
        await this.emailInput.click()
        await this.emailInput.fill(payPalData.username)
        await this.nextButton.click()
        await this.passwordInput.fill(payPalData.password)
        await this.loginButton.click()
        await this.agreeAndPayNowButton.click()
    }

    async fillInput(inputField, value) {
        await inputField.click()
        await inputField.pressSequentially(value, {delay: 50})
    }

    /**
     * Fills an Adyen-secured iframe input and verifies the full value was
     * entered.
     */
    async fillInputReliably(inputField, value, maxRetries = 3) {
        const expectedDigits = value.replace(/\s/g, '').length
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await inputField.click()
            // Clear any existing content before typing
            await inputField.press('ControlOrMeta+A').catch(() => {})
            await inputField.press('Delete').catch(() => {})
            await inputField.pressSequentially(value, {delay: 50})

            // Verify the value was entered completely by reading the input's value
            const actualDigits = await inputField
                .evaluate((el) => (el.value || '').replace(/\s/g, '').length)
                .catch(() => 0)
            if (actualDigits >= expectedDigits) {
                return
            }
            console.log(
                `fillInputReliably attempt ${attempt}: got ${actualDigits}/${expectedDigits} digits, retrying...`
            )
        }
    }

    // CC
    async fillCreditCardInfo(cardHolderName, cardNumber, cardExpirationDate, cardCVC = undefined) {
        // Wait for Click to Pay component to resolve and card component to become visible
        await this.activePaymentType
            .locator('.adyen-checkout__card__cardNumber__input iframe')
            .waitFor({state: 'visible', timeout: 20000})
        await this.cardNumberInput.waitFor({state: 'visible', timeout: 20000})
        await this.fillInput(this.cardNumberInput, cardNumber)
        await this.fillInput(this.expDateInput, cardExpirationDate)
        if (cardCVC !== undefined) {
            await this.fillInput(this.cvcInput, cardCVC)
        }
        await this.fillInput(
            this.holderNameInput,
            cardHolderName.firstName + ' ' + cardHolderName.lastName
        )
    }

    async fillCVCInfo(cardCVC) {
        // Wait for the CVC iframe and input field to become visible
        await this.activePaymentType
            .locator('.adyen-checkout__card__cvc__input iframe')
            .waitFor({state: 'visible', timeout: 20000})
        await this.cvcInput.waitFor({state: 'visible', timeout: 20000})
        await this.fillInput(this.cvcInput, cardCVC)
    }

    // 3Ds2
    async validate3DS2(answer) {
        const threeDSIframe = this.page
            .locator("iframe[name='threeDSIframe'], iframe[name*='threeDS']")
            .first()

        // Wait for the 3DS2 iframe to become visible before checking
        const threeDSChallengeVisible = await threeDSIframe
            .waitFor({state: 'visible', timeout: 20000})
            .then(() => true)
            .catch(() => false)

        if (threeDSChallengeVisible) {
            await this.fill3DS2PasswordAndSubmit(answer)
        }
    }

    async fill3DS2PasswordAndSubmit(answer) {
        await this.threeDS2PasswordInput.waitFor({state: 'visible', timeout: 10000})
        await this.threeDS2PasswordInput.click()
        await this.threeDS2PasswordInput.pressSequentially(answer)
        await this.threeDS2SubmitButton.click()
    }

    async cancel3DS2() {
        await this.threeDS2CancelButton.waitFor({state: 'visible', timeout: 10000})
        await this.threeDS2CancelButton.click()
    }

    // Gift Card
    async fillGiftCardInfo(cardNumber, cardCVC = undefined) {
        await this.fillInputReliably(this.giftCardNumberInput, cardNumber)
        if (cardCVC !== undefined) {
            await this.fillInputReliably(this.giftCardPinInput, cardCVC)
        }
    }

    async addedGiftCardIsDisplayed() {
        await this.AddedGiftCards.waitFor({state: 'visible', timeout: 10000})
    }
}
