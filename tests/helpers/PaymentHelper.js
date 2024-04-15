import { PaymentData } from "../data/paymentData.js";

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
        this.threeDS2Iframe = this.page.frameLocator("iframe[name='threeDSIframe']")
        this.threeDS2PasswordInput = this.threeDS2Iframe.locator("input[name='answer']")
        this.threeDS2SubmitButton = this.threeDS2Iframe.locator("button[type='submit']")
        this.threeDS2CancelButton = this.threeDS2Iframe.locator('#buttonCancel')
    }

    async selectPaymentType(paymentType) {
        await this.page
            .locator(
                `//*[contains(@class, 'adyen-checkout__payment-method__name') and contains(text(), '${paymentType}')]`
            )
            .click()
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
            waitUntil: 'load',
        });
    };

    initiatePayPalPayment = async () => {
        const payPalButton = this.page
          .frameLocator('.adyen-checkout__paypal__button--paypal iframe.visible')
          .locator('.paypal-button');

        const [popup] = await Promise.all([
            this.page.waitForEvent('popup'),
            payPalButton.click(),
        ]);

        await popup.waitForNavigation({
            url: /.*sandbox.paypal.com*/,
            timeout: 20000,
        });

        this.emailInput = popup.locator('#email');
        this.nextButton = popup.locator('#btnNext');
        this.passwordInput = popup.locator('#password');
        this.loginButton = popup.locator('#btnLogin');
        this.agreeAndPayNowButton = popup.locator('#payment-submit-btn');

        const payPalData = new PaymentData().PayPal;
        await this.emailInput.click();
        await this.emailInput.fill(payPalData.username);
        console.log(payPalData.username);
        await this.nextButton.click();
        await this.passwordInput.fill(payPalData.password);
        console.log(payPalData.password);
        await this.loginButton.click();
        await this.agreeAndPayNowButton.click();
    };

    async fillInput(inputField, value) {
        await inputField.click()
        await inputField.type(value, {delay: 50})
    }

    // CC
    async fillCreditCardInfo(cardHolderName, cardNumber, cardExpirationDate, cardCVC = undefined) {
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
        await this.fillInput(this.cvcInput, cardCVC)
    }

    // 3Ds2
    async validate3DS2(answer) {
        await this.fill3DS2PasswordAndSubmit(answer)
    }

    async fill3DS2PasswordAndSubmit(answer) {
        await this.threeDS2PasswordInput.waitFor({state: 'visible', timeout: 10000})
        await this.threeDS2PasswordInput.click()
        await this.threeDS2PasswordInput.type(answer)
        await this.threeDS2SubmitButton.click()
    }

    async cancel3DS2() {
        await this.threeDS2CancelButton.waitFor({state: 'visible', timeout: 10000})
        await this.threeDS2CancelButton.click()
    }
}
