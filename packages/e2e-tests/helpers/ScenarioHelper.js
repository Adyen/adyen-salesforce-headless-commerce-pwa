import {expect} from '@playwright/test'
import {LocaleData} from '../data/localeData'

export class ScenarioHelper {
    constructor(page, locale = new LocaleData().EN) {
        this.page = page
        this.locale = locale

        // Landing Page Locators
        this.heading = this.page.getByRole('heading', {
            level: 1,
            name: `${this.locale.landingPage.heading}`
        })

        // Product Detail Page Locators
        this.productColorRadioButton = this.page.getByLabel(
            `${locale.productDetailPage.productColor}`
        )
        this.productSizeRadioButton = this.page.getByLabel(
            `${locale.productDetailPage.productSize}`
        )
        this.addToCartButton = this.page.getByRole('button', {
            name: `${locale.productDetailPage.addToCartButtonCaption}`
        })

        // Contact Info Page Locators
        this.contactInfoSection = this.page.locator("[data-testid='sf-toggle-card-step-0']")
        this.contactInfoSectionModifyButton = this.page.getByRole('button', {
            name: `${locale.checkoutPage.contactInfoSectionModifyButton}`
        })
        this.emailField = this.contactInfoSection.locator('#email')
        this.checkoutAsGuestButton = this.contactInfoSection.locator("[type='submit']")

        // Login Page Locators
        this.loginEmail = this.page.locator('input#email')
        this.loginPassword = this.page.locator('input#password')
        this.loginButton = this.page.locator("[type='submit']")
        this.switchToLoginButton = this.page.getByRole('button', {
            name: 'Already have an account? Log in'
        })

        // Shipping Details Page Locators
        this.shippingAddressSection = this.page.locator("[data-testid='sf-toggle-card-step-1']")
        this.shippingAddressModifyButton = this.page.getByRole('button', {
            name: `${locale.checkoutPage.shippingAddressModifyButton}`
        })
        this.shippingAddressSectionForm = this.page.locator(
            "[data-testid='sf-shipping-address-edit-form']"
        )
        this.firstNameField = this.shippingAddressSectionForm.locator('#firstName')
        this.lastNameField = this.shippingAddressSectionForm.locator('#lastName')
        this.phoneNumberField = this.shippingAddressSectionForm.locator('#phone')
        this.countryDropdown = this.shippingAddressSectionForm.locator('#countryCode')
        this.addressField = this.shippingAddressSectionForm.locator('#address1')
        this.cityField = this.shippingAddressSectionForm.locator('#city')
        this.stateDropdown = this.shippingAddressSectionForm.locator('#stateCode')
        this.zipCodeField = this.shippingAddressSectionForm.locator('#postalCode')
        this.continueToShippingMethodButton =
            this.shippingAddressSectionForm.locator("[type='submit']")
        // For logged-in users this button sits outside the form, so
        // [type='submit'] doesn't match; match by accessible name instead.
        this.continueToShippingMethodButtonLoggedInUser = this.page.getByRole('button', {
            name: 'Continue to Shipping Method'
        })

        // Shipping Method Locators
        this.shippingMethodSection = this.page.locator("[data-testid='sf-toggle-card-step-2']")
        this.shippingMethodModifyButton = this.page.getByRole('button', {
            name: `${locale.checkoutPage.shippingMethodModifyButton}`
        })
        this.shippingMethodSectionContent = this.page.locator(
            "[data-testid='sf-toggle-card-step-2-content']"
        )
        this.shippingRadioButtonsSection =
            this.shippingMethodSectionContent.locator("[role='radiogroup']")
        this.standardShippingRadioButton = this.shippingRadioButtonsSection
            .locator('.chakra-radio')
            .first()
        this.continueToPaymentButton = this.shippingMethodSectionContent.locator("[type='submit']")

        // Payment Page Locators
        this.paymentSection = this.page.locator("[data-testid='sf-toggle-card-step-3-content']")
    }

    async retryClick(button, apiEndpoint, httpMethod = 'POST', maxRetries = 3) {
        let success = false
        // Escape special regex chars except *, then replace * with .+ for flexible matching
        const escapedEndpoint = apiEndpoint.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        const endpointPattern = new RegExp(escapedEndpoint.replace(/\*/g, '[^/]+'))

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(
                `Attempt ${attempt}: Clicking button and waiting for ${httpMethod} ${apiEndpoint}`
            )
            try {
                await button.waitFor({state: 'visible', timeout: 10000})
                const responsePromise = this.page.waitForResponse(
                    (res) =>
                        endpointPattern.test(res.url()) && res.request().method() === httpMethod,
                    {timeout: 10000}
                )
                await button.click()
                const response = await responsePromise

                if (response.ok()) {
                    console.log('API call succeeded')
                    success = true
                    break
                } else {
                    // Log the response body so 4xx/5xx failures are diagnosable
                    const body = await response.text().catch(() => '<unreadable>')
                    console.warn(
                        `API call failed with status ${response.status()} for ${httpMethod} ${apiEndpoint}: ${body}`
                    )
                }
            } catch (error) {
                console.warn(`Attempt ${attempt} failed: ${error.message}`)
            }

            // Back off between attempts so transient backend state has time
            // to settle instead of hammering the same broken state.
            if (attempt < maxRetries) {
                await this.page.waitForTimeout(1000 * attempt)
            }
        }

        if (!success) {
            throw new Error(`All ${maxRetries} attempts to click and verify API call failed.`)
        }
    }

    async visitStore() {
        await this.page.goto(`/RefArch/${this.locale.lang}`)
        await this.page.getByTestId('home-page').waitFor({state: 'visible', timeout: 30000})
    }

    async login(user) {
        await this.switchToLoginButton.click()
        await this.fillShopperDetails(user)
        await this.submitLoginDetails()
    }

    async arrangeShippingAndProceedToPaymentLoggedInShopper() {
        const continueButtonAppeared = await this.continueToShippingMethodButtonLoggedInUser
            .waitFor({state: 'visible', timeout: 10000})
            .then(() => true)
            .catch(() => false)

        if (continueButtonAppeared) {
            const addressRadios = this.shippingAddressSection.getByRole('radio')
            const anyChecked = await addressRadios
                .and(this.page.locator('[aria-checked="true"], :checked'))
                .count()
                .catch(() => 0)
            if (anyChecked === 0 && (await addressRadios.count()) > 0) {
                await addressRadios.first().click({force: true})
            }

            await this.retryClick(
                this.continueToShippingMethodButtonLoggedInUser,
                '/shipments/me/shipping-address',
                'PUT'
            )
        }

        await this.selectShippingMethodAndProceedToPayment()
    }

    async selectShippingMethodAndProceedToPayment() {
        await this.shippingMethodSection.waitFor({state: 'visible', timeout: 10000}).catch(() => {})

        const shippingMethodSectionIsVisible = await this.shippingMethodSection.isVisible()
        if (!shippingMethodSectionIsVisible) {
            return
        }

        const radioButtonsVisible = await this.shippingRadioButtonsSection.isVisible()

        if (!radioButtonsVisible) {
            await this.shippingMethodModifyButton
                .waitFor({state: 'visible', timeout: 10000})
                .catch(() => {})
            const shippingMethodModifyButtonIsVisible =
                await this.shippingMethodModifyButton.isVisible()
            if (shippingMethodModifyButtonIsVisible) {
                const shippingMethodsResponsePromise = this.page.waitForResponse(
                    (res) =>
                        res.url().includes('/shipping-methods') && res.request().method() === 'GET',
                    {timeout: 10000}
                )
                await this.shippingMethodModifyButton.click()
                await shippingMethodsResponsePromise
                await this.shippingRadioButtonsSection.waitFor({
                    state: 'visible',
                    timeout: 10000
                })
            }
        }
        await this.chooseShippingMethod()
    }

    async setupCart() {
        await this.page.goto(
            `/RefArch/${this.locale.lang}/product/${this.locale.productDetailPage.productName}`
        )
        await this.productColorRadioButton.click()
        await this.productSizeRadioButton.click()
        await this.submitAddToCartButton()

        await this.page.waitForTimeout(2000)

        await this.page.goto(`/RefArch/${this.locale.lang}/checkout`)
    }

    async submitAddToCartButton() {
        await this.retryClick(this.addToCartButton, '/baskets/*/items', 'POST')
    }

    async arrangeShippingAndProceedToPayment(user) {
        await this.contactInfoSection.waitFor({state: 'visible', timeout: 10000}).catch(() => {})

        const contactInfoSectionIsVisible = await this.contactInfoSection.isVisible()
        if (contactInfoSectionIsVisible) {
            const contactInfoSectionModifyButtonIsVisible =
                await this.contactInfoSectionModifyButton.isVisible()
            if (contactInfoSectionModifyButtonIsVisible) {
                await this.contactInfoSectionModifyButton.click()
            }
            await this.fillContactInfo(user)
        }

        await this.shippingAddressSection
            .waitFor({state: 'visible', timeout: 10000})
            .catch(() => {})

        const shippingAddressSectionIsVisible = await this.shippingAddressSection.isVisible()
        if (shippingAddressSectionIsVisible) {
            const shippingAddressModifyButtonIsVisible =
                await this.shippingAddressModifyButton.isVisible()
            if (shippingAddressModifyButtonIsVisible) {
                await this.shippingAddressModifyButton.click()
            }
            await this.fillShippingAddress(user)
        }

        // Let the UI settle before the shipping method step
        await this.page.waitForTimeout(1000)

        await this.selectShippingMethodAndProceedToPayment()
    }

    async fillContactInfo(user) {
        const emailFormVisible = await this.emailField.isVisible({timeout: 5000}).catch(() => false)

        if (!emailFormVisible) {
            return
        }
        await this.emailField.click()
        await this.emailField.fill(user.shopperEmail)

        await this.retryClick(this.checkoutAsGuestButton, '/baskets/*/customer', 'PUT')
    }

    async fillShippingAddress(user) {
        const shippingFormVisible = await this.firstNameField
            .isVisible({timeout: 5000})
            .catch(() => false)

        if (!shippingFormVisible) {
            return
        }

        await this.firstNameField.click()
        await this.firstNameField.fill(user.shopperName.firstName)
        await this.lastNameField.click()
        await this.lastNameField.fill(user.shopperName.lastName)
        await this.phoneNumberField.click()
        await this.phoneNumberField.fill(user.telephone)

        if (user.address.country) {
            await this.countryDropdown.selectOption(user.address.country)
        }
        await this.addressField.click()
        await this.addressField.fill(`${user.address.street} ${user.address.houseNumberOrName}`)
        await this.cityField.click()
        await this.cityField.fill(user.address.city)

        if (user.address.stateOrProvince !== '') {
            await this.stateDropdown.selectOption(user.address.stateOrProvince)
        }

        await this.zipCodeField.click()
        await this.zipCodeField.fill(user.address.postalCode)

        await this.retryClick(
            this.continueToShippingMethodButton,
            '/shipments/me/shipping-address',
            'PUT'
        )
    }

    async fillShopperDetails(user) {
        await this.loginEmail.fill(user.shopperEmail)
        await this.loginPassword.fill(user.password)
    }

    async submitLoginDetails() {
        await this.loginButton.click()
    }

    async chooseShippingMethod() {
        await this.standardShippingRadioButton
            .waitFor({state: 'visible', timeout: 10000})
            .catch(() => {})
        const standardShippingRadioButtonIsVisible =
            await this.standardShippingRadioButton.isVisible()
        if (standardShippingRadioButtonIsVisible) {
            await this.standardShippingRadioButton.click()
        }

        await this.continueToPaymentButton.waitFor({state: 'visible', timeout: 10000})
        await this.continueToPaymentButton.click()

        await this.paymentSection.waitFor({state: 'visible', timeout: 20000})
    }

    async verifyClickToPayIsRendered() {
        const ctpSection = this.page.locator('.adyen-checkout-ctp__section')
        await expect(ctpSection).toBeVisible()
    }

    async verifySuccessfulOrder() {
        await expect(this.page).toHaveURL(/\/checkout\/confirmation/, {timeout: 20000})
        await expect(
            this.page.getByRole('heading', {name: `${this.locale.successfulOrderMessage}`})
        ).toBeVisible({timeout: 5000})
    }
}
