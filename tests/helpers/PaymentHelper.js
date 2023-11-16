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
}
