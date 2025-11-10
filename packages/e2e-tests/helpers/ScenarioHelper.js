import {expect} from '@playwright/test'
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
        this.productSizeRadioButton = this.page.getByLabel('36')
        this.addToCartButton = this.page.getByRole('button', {
            name: `${locale.productDetailPage.addToCartButtonCaption}`
        })
        this.proceedToCheckoutLink = this.page.getByRole('link', {
            name: `${locale.productDetailPage.proceedToCheckoutButtonCaption}`
        })

        // Contact Info Page Locators
        this.contactInfoSection = this.page.locator("[data-testid='sf-toggle-card-step-0']")
        this.emailField = this.contactInfoSection.locator('#email')
        this.checkoutAsGuestButton = this.contactInfoSection.locator("[type='submit']")

        // Login Page Locators
        this.loginSection = this.page.locator(
            "[data-testid='login-page']"
        )
        this.loginEmail = this.page.locator("input#email")
        this.loginPassword = this.page.locator("input#password")
        this.loginButton = this.loginSection.locator("[type='submit']")

        // Account Page Locators
        this.accountPageHeading = this.page.getByRole('heading', {
            name: `${this.locale.accountPage.heading}`
        })

        // Shipping Details Page Locators
        this.shippingAddressSection = this.page.locator("[data-testid='sf-toggle-card-step-1-content']")
        this.selectedShippingAddress = this.shippingAddressSection.locator('> [class*="css"]')

        this.shippingAddressSectionForm = this.page.locator(
            "[data-testid='sf-shipping-address-edit-form']"
        )
        this.shippingAddressSectionLoggedInUser = this.page.locator("[data-testid='sf-checkout-container']")
        this.firstNameField = this.shippingAddressSectionForm.locator('#firstName')
        this.lastNameField = this.shippingAddressSectionForm.locator('#lastName')
        this.phoneNumberField = this.shippingAddressSectionForm.locator('#phone')
        this.countryDropdown = this.shippingAddressSectionForm.locator('#countryCode')
        this.addressField = this.shippingAddressSectionForm.locator('#address1')
        this.cityField = this.shippingAddressSectionForm.locator('#city')
        this.stateDropdown = this.shippingAddressSectionForm.locator('#stateCode')
        this.zipCodeField = this.shippingAddressSectionForm.locator('#postalCode')
        this.continueToShippingMethodButton = this.shippingAddressSectionForm.locator("[type='submit']")
        this.continueToShippingMethodButtonLoggedInUser = this.shippingAddressSectionLoggedInUser.locator("[type='submit']")

        this.shippingMethodSection = this.page.locator(
            "[data-testid='sf-toggle-card-step-2-content']"
        )
        this.shippingRadioButtonsSection = this.shippingMethodSection.locator("[role='radiogroup']")
        this.standardShippingRadioButton = this.shippingRadioButtonsSection
            .locator('.chakra-radio')
            .first()
        this.selectedShippingMethod = this.shippingMethodSection.locator('> [class*="css"]')
        this.continueToPaymentButton = this.shippingMethodSection.locator("[type='submit']")
    }

    async retryClick(button, apiEndpoint, httpMethod = 'POST', maxRetries = 3) {
        let success = false
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Attempt ${attempt}: Clicking button and waiting for ${httpMethod} ${apiEndpoint}`)
            try {
                const [response] = await Promise.all([
                    this.page.waitForResponse(res =>
                            res.url().includes(apiEndpoint) && res.request().method() === httpMethod
                        , {timeout: 10000}),
                    button.click(),
                ])

                if (response.ok()) {
                    console.log('API call succeeded')
                    success = true
                    break
                } else {
                    console.warn(`API call failed with status ${response.status()}`)
                }
            } catch (error) {
                console.warn(`Attempt ${attempt} failed: ${error.message}`)
            }
        }

        if (!success) {
            throw new Error(`All ${maxRetries} attempts to click and verify API call failed.`)
        }
    }

    async visitStore() {
        await this.page.goto(`/RefArch/${this.locale.lang}`)
        await this.heading.waitFor({state: 'visible', timeout: 30000})
    }

    async login(user) {
        await this.page.goto(`/RefArch/${this.locale.lang}/login`)
        await this.fillShopperDetails(user)
        await this.submitLoginDetails()
        await this.accountPageHeading.waitFor({state: 'visible', timeout: 30000})
    }

    async setupCart() {
        await this.carouselProduct.click()
        await this.productColorRadioButton.click()
        await this.productSizeRadioButton.click()
        await this.submitAddToCartButton()
        await this.proceedToCheckoutLink.click()
    }

    async submitAddToCartButton() {
        await this.retryClick(this.addToCartButton, '/baskets', 'POST')
    }

    async arrangeShippingAndProceedToPayment(user) {
        const selectedShippingAddressIsVisible = await this.selectedShippingAddress.isVisible()
        if (!selectedShippingAddressIsVisible) {
            await this.fillShippingDetails(user)
        }
        const selectedShippingMethodIsVisible = await this.selectedShippingMethod.isVisible()
        if (!selectedShippingMethodIsVisible) {
            await this.chooseShippingMethod()
            await this.proceedToPayment()
        }
    }

    async arrangeShippingAndProceedToPaymentForLoggedInUser() {
        const selectedShippingAddressIsVisible = await this.selectedShippingAddress.isVisible()
        if (!selectedShippingAddressIsVisible) {
            await this.proceedToShippingMethodsAsLoggedInUser()
        }
        const selectedShippingMethodIsVisible = await this.selectedShippingMethod.isVisible()
        if (!selectedShippingMethodIsVisible) {
            await this.chooseShippingMethod()
            await this.proceedToPayment()
        }
    }

    async proceedToShippingMethodsAsLoggedInUser() {
        if (this.continueToShippingMethodButtonLoggedInUser.isVisible()) {
            await this.continueToShippingMethodButtonLoggedInUser.click()
        }
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

        if (user.address.stateOrProvince !== '') {
            await this.stateDropdown.selectOption(user.address.stateOrProvince)
        }

        await this.zipCodeField.click()
        await this.zipCodeField.fill(user.address.postalCode)

        await this.retryClick(this.continueToShippingMethodButton, '/shipments/me/shipping-address', 'PUT')
    }

    async fillShopperDetails(user) {
        await this.loginEmail.fill(user.shopperEmail)
        await this.loginPassword.fill(user.password)
    }

    async submitLoginDetails() {
        await this.retryClick(this.loginButton, '/oauth2/token', 'POST')
    }


    async chooseShippingMethod() {
        const standardShippingRadioButtonIsVisible = await this.standardShippingRadioButton.isVisible()
        if (!!standardShippingRadioButtonIsVisible) {
            await this.standardShippingRadioButton.click()
        }
    }

    async proceedToPayment() {
        await this.continueToPaymentButton.click()
    }

    async verifySuccessfulOrder() {
        await this.page.waitForNavigation({
            url: / *\/checkout\/confirmation/,
            timeout: 15000
        })
        await expect(
            this.page.getByRole('heading', {name: `${this.locale.successfulOrderMessage}`})
        ).toBeVisible({timeout: 5000})
    }
}
