/* eslint-disable @typescript-eslint/no-var-requires */
'use strict'

const readline = require('readline')

const COUNTRY_CHOICES = {
    1: {code: 'BR', label: 'Brazil (BRL)'},
    2: {code: 'MX', label: 'Mexico (MXN)'},
    3: {code: 'JP', label: 'Japan (JPY)'}
}

const MEXICO_ALLOWED_VALUES = [3, 6, 9, 12, 18]
const JAPAN_ALLOWED_PLANS = ['regular', 'revolving', 'bonus']

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const ask = (question) =>
    new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()))
    })

const parseIntegerList = (value) =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => Number(item))

const hasOnlyUniqueIntegers = (numbers) =>
    numbers.length > 0 &&
    numbers.every((item) => Number.isInteger(item)) &&
    new Set(numbers).size === numbers.length

const toUniqueLowercaseList = (value) => [
    ...new Set(
        value
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
    )
]

const askCountry = async () => {
    let country = null
    while (!country) {
        console.log('\nSelect country:')
        console.log('  1. Brazil (BRL) — values 1..99')
        console.log('  2. Mexico (MXN) — values in [3, 6, 9, 12, 18]')
        console.log('  3. Japan (JPY)  — plans regular/revolving/bonus')
        const choice = Number(await ask('\nEnter choice (1-3): '))
        if (COUNTRY_CHOICES[choice]) {
            country = COUNTRY_CHOICES[choice]
        } else {
            console.log('Invalid country choice. Please enter 1, 2, or 3.')
        }
    }
    return country
}

const askConfigMode = async () => {
    let mode = null
    while (!mode) {
        console.log('\nInstallment options mode:')
        console.log('  1. Single config for all cards (key: card)')
        console.log('  2. Per scheme config (keys: visa, mc, etc.)')
        const choice = await ask('\nEnter choice (1-2): ')
        if (choice === '1') {
            mode = 'card'
        } else if (choice === '2') {
            mode = 'scheme'
        } else {
            console.log('Invalid mode choice. Please enter 1 or 2.')
        }
    }
    return mode
}

const askBrazilValues = async () => {
    let values = null
    while (!values) {
        const answer = await ask('Enter installment values (comma-separated, 1..99): ')
        const parsedValues = parseIntegerList(answer)
        const valid =
            hasOnlyUniqueIntegers(parsedValues) &&
            parsedValues.every((value) => value >= 1 && value < 100)
        if (valid) {
            values = parsedValues
        } else {
            console.log('Invalid values. Use unique integers from 1 to 99.')
        }
    }
    return values
}

const askMexicoValues = async () => {
    let values = null
    while (!values) {
        console.log(`Allowed Mexico values: ${MEXICO_ALLOWED_VALUES.join(', ')}`)
        const answer = await ask('Enter installment values (comma-separated): ')
        const parsedValues = parseIntegerList(answer)
        const valid =
            hasOnlyUniqueIntegers(parsedValues) &&
            parsedValues.every((value) => MEXICO_ALLOWED_VALUES.includes(value))
        if (valid) {
            values = parsedValues
        } else {
            console.log('Invalid values. Use a unique subset of: 3, 6, 9, 12, 18.')
        }
    }
    return values
}

const askJapanConfig = async () => {
    let japanConfig = null
    while (!japanConfig) {
        console.log(`Allowed Japan plans: ${JAPAN_ALLOWED_PLANS.join(', ')}`)
        const plansAnswer = await ask('Enter plans (comma-separated): ')
        const plans = toUniqueLowercaseList(plansAnswer)
        const validPlans =
            plans.length > 0 && plans.every((plan) => JAPAN_ALLOWED_PLANS.includes(plan))

        if (!validPlans) {
            console.log('Invalid plans. Use one or more of: regular, revolving, bonus.')
            continue
        }

        let regularValues = []
        if (plans.includes('regular')) {
            let validRegularValues = false
            while (!validRegularValues) {
                const valuesAnswer = await ask(
                    'For regular plan, enter values (comma-separated, 2..99): '
                )
                regularValues = parseIntegerList(valuesAnswer)
                validRegularValues =
                    hasOnlyUniqueIntegers(regularValues) &&
                    regularValues.every((value) => value > 1 && value < 100)
                if (!validRegularValues) {
                    console.log('Invalid regular values. Use unique integers from 2 to 99.')
                }
            }
        }

        const requiresOneInstallmentValue = plans.some(
            (plan) => plan === 'revolving' || plan === 'bonus'
        )
        const values = [...new Set([...regularValues, ...(requiresOneInstallmentValue ? [1] : [])])]
        if (values.length === 0) {
            console.log('At least one value is required.')
            continue
        }
        japanConfig = {values, plans}
    }
    return japanConfig
}

const askInstallmentConfigForCountry = async (countryCode) => {
    if (countryCode === 'BR') {
        return {values: await askBrazilValues()}
    }
    if (countryCode === 'MX') {
        return {values: await askMexicoValues()}
    }
    return await askJapanConfig()
}

const askShowInstallmentAmounts = async () => {
    let showInstallmentAmounts = null
    while (showInstallmentAmounts === null) {
        const answer = await ask('Show per-installment amounts? (Y/n): ')
        if (!answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            showInstallmentAmounts = true
        } else if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
            showInstallmentAmounts = false
        } else {
            console.log('Please answer with y/yes or n/no.')
        }
    }
    return showInstallmentAmounts
}

const askSchemeKeys = async () => {
    let schemeKeys = null
    while (!schemeKeys) {
        const answer = await ask('Enter scheme keys (comma-separated, e.g. visa,mc,amex): ')
        const keys = toUniqueLowercaseList(answer)
        if (keys.length > 0) {
            schemeKeys = keys
        } else {
            console.log('Please provide at least one scheme key.')
        }
    }
    return schemeKeys
}

const generateInstallmentOptions = async () => {
    console.log('\nGenerate Adyen card installmentOptions for paymentMethodsConfiguration.card')
    const country = await askCountry()
    const mode = await askConfigMode()
    const showInstallmentAmounts = await askShowInstallmentAmounts()

    const installmentOptions = {}
    if (mode === 'card') {
        installmentOptions.card = await askInstallmentConfigForCountry(country.code)
    } else {
        const schemeKeys = await askSchemeKeys()
        for (const schemeKey of schemeKeys) {
            console.log(`\nConfigure scheme: ${schemeKey}`)
            installmentOptions[schemeKey] = await askInstallmentConfigForCountry(country.code)
        }
    }

    const cardConfiguration = {
        installmentOptions,
        showInstallmentAmounts
    }

    console.log('\nGenerated JSON:\n')
    console.log(JSON.stringify(cardConfiguration, null, 2))
    console.log('\nJS snippet:\n')
    console.log(`paymentMethodsConfiguration: {
  card: ${JSON.stringify(cardConfiguration, null, 2).replace(/\n/g, '\n  ')}
}`)
    console.log(
        `\nCountry selected: ${country.label}\nPaste this under paymentMethodsConfiguration when invoking AdyenCheckout.`
    )
}

generateInstallmentOptions()
    .catch((error) => {
        console.error('Failed to generate installment options:', error.message)
        process.exitCode = 1
    })
    .finally(() => {
        rl.close()
    })
