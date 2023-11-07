import {test, expect} from '@playwright/test'

test('test', async ({page}) => {
    // Store setup

    await page.goto('')
    await page
        .getByRole('heading', {name: 'The React PWA Starter Store for Retail'})
        .waitFor({state: 'visible', timeout: 30000})

    // Cart Setup
    await page.getByRole('link', {name: 'Slim Fit Pants, , large Slim Fit Pants $50.00'}).click()
    await page.getByLabel('Black').click()
    await page.getByLabel('28').click()
    await page.getByRole('button', {name: 'Add to Cart'}).click()
    await page.getByRole('link', {name: 'Proceed to Checkout'}).click()

    // Filling shipping details
    await page.getByPlaceholder('you@email.com').click()
    await page.getByPlaceholder('you@email.com').fill('adyentest@adyen.com')
    await page.getByRole('button', {name: 'Checkout as Guest'}).click()
    await page.getByLabel('First Name').click()
    await page.getByLabel('First Name').fill('Cenk')
    await page.getByLabel('First Name').press('Tab')
    await page.getByLabel('Last Name').fill('Kucukiravul')
    await page.getByLabel('Last Name').press('Tab')
    await page.getByLabel('Phone').fill('(062) 448-9500')
    await page.getByLabel('Address').click()
    await page.getByLabel('Address').fill('Adresvs')
    await page.getByLabel('City').click()
    await page.getByLabel('City').fill('Istanbul')
    await page.getByLabel('State').selectOption('AL')
    await page.getByLabel('Zip Code').click()
    await page.getByLabel('Zip Code').fill('35860')
    await page.getByRole('button', {name: 'Continue to Shipping Method'}).click()

    // Select shipping option if applicable
    await page.getByRole('button', {name: 'Continue to Payment'}).click()

    // Select shipping method and pay

    // Take payment method specific actions
    await page
        .frameLocator('iframe[title="Iframe for card number"]')
        .getByPlaceholder('1234 5678 9012 3456')
        .click()
    await page
        .frameLocator('iframe[title="Iframe for card number"]')
        .getByPlaceholder('1234 5678 9012 3456')
        .fill('4111 1111 1111 1111')
    await page
        .frameLocator('iframe[title="Iframe for card number"]')
        .getByPlaceholder('1234 5678 9012 3456')
        .press('Tab')
    await page
        .frameLocator('iframe[title="Iframe for expiry date"]')
        .getByPlaceholder('MM/YY')
        .fill('03/30')
    await page
        .frameLocator('iframe[title="Iframe for security code"]')
        .getByPlaceholder('3 digits')
        .fill('737')
    await page.getByPlaceholder('J. Smith').click()
    await page.getByPlaceholder('J. Smith').fill('Ahmet')
    await page.getByRole('button', {name: 'Pay'}).click()

    // wait for URL redirection http://localhost:3000/RefArch/en-US/checkout/confirmation/00006802
    await page
        .getByRole('heading', {name: 'Thank you for your order!'})
        .waitFor({state: 'visible', timeout: 10000})
})
