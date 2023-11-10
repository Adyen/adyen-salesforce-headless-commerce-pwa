import {LocaleData} from '../data/localeData'

export class ScenarioHelper {
    constructor(page, locale = new LocaleData().EN) {
        this.page = page
        this.locale = locale

        // Landing Page Locators
        this.heading = this.page.getByRole('heading', {
            name: `${this.locale.landingPage.heading}`
        })
        this.carouselProduct = this.page
            .locator("[data-testid='product-scroller']")
            .locator("[data-testid='product-scroller-item']")
            .first()

        // Product Detail Page Locators
        this.productColorRadioButton = this.page.getByLabel(
            `${locale.productDetailPage.productColor}`
        )
        this.productSizeRadioButton = this.page.getByLabel('28')
        this.addToCartButton = this.page.getByRole('button', {
            name: `${locale.productDetailPage.addToCartButtonCaption}`
        })
        this.proceedToCheckoutLink = this.page.getByRole('link', {
            name: `${locale.productDetailPage.proceedToCheckoutButtonCaption}`
        })

        // Shipping Details Page Locators
        this.contactInfoSection = this.page.locator("[data-testid='sf-toggle-card-step-0']")
        this.emailField = this.contactInfoSection.locator('#email')
        this.checkoutAsGuestButton = this.contactInfoSection.locator("[type='submit']")

        this.shippingAddressSection = this.page.locator(
            "[data-testid='sf-shipping-address-edit-form']"
        )
        this.firstNameField = this.shippingAddressSection.locator('#firstName')
        this.lastNameField = this.shippingAddressSection.locator('#lastName')
        this.phoneNumberField = this.shippingAddressSection.locator('#phone')
        this.countryDropdown = this.shippingAddressSection.locator('#countryCode')
        this.addressField = this.shippingAddressSection.locator('#address1')
        this.cityField = this.shippingAddressSection.locator('#city')
        this.stateDropdown = this.shippingAddressSection.locator('#stateCode')
        this.zipCodeField = this.shippingAddressSection.locator('#postalCode')
        this.continueToShippingMethodButton = this.shippingAddressSection.locator("[type='submit']")

        this.shippingMethodSection = this.page.locator(
            "[data-testid='sf-toggle-card-step-2-content']"
        )
        this.shippingRadioButtonsSection = this.shippingMethodSection.locator("[role='radiogroup']")
        this.standardShippingRadioButton = this.shippingRadioButtonsSection
            .locator('.chakra-radio')
            .first()
        this.continueToPaymentButton = this.shippingMethodSection.locator("[type='submit']")
    }

    async visitStore() {
        await this.page.goto(`/RefArch/${this.locale.lang}`)
        await this.heading.waitFor({state: 'visible', timeout: 30000})
    }

    async setupCart() {
        await this.carouselProduct.click()
        await this.productColorRadioButton.click()
        await this.productSizeRadioButton.click()
        await this.addToCartButton.click()
        await this.proceedToCheckoutLink.click()
    }

    async arrangeShippingAndProceedToPayment(user) {
        await this.fillShippingDetails(user)
        await this.chooseShippingMethod()
        await this.proceedToPayment()
    }

    async fillShippingDetails(user) {
        await this.emailField.click()
        await this.emailField.fill(user.shopperEmail)
        await this.checkoutAsGuestButton.click()

        await this.firstNameField.click()
        await this.firstNameField.fill(user.shopperName.firstName)
        await this.lastNameField.click()
        await this.lastNameField.fill(user.shopperName.lastName)
        await this.phoneNumberField.click()
        await this.phoneNumberField.fill(user.telephone)
        await this.addressField.click
        await this.addressField.fill(`${user.address.street} ${user.address.houseNumberOrName}`)
        await this.cityField.click()
        await this.cityField.fill(user.address.city)

        if (user.address.stateOrProvince != '') {
            await this.stateDropdown.selectOption(user.address.stateOrProvince)
        }

        await this.zipCodeField.click()
        await this.zipCodeField.fill(user.address.postalCode)

        await this.continueToShippingMethodButton.click()
    }

    async chooseShippingMethod() {
        await this.standardShippingRadioButton.click()
    }

    async proceedToPayment() {
        await this.continueToPaymentButton.click()
    }
}
