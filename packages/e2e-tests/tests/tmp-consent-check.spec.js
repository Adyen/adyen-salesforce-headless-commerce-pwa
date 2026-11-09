import {test, expect} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'

test('setupCart works despite tracking consent popup', async ({page}) => {
    const scenarios = new ScenarioHelper(page)
    await scenarios.visitStore()
    await scenarios.setupCart()
    await expect(page).toHaveURL(/\/checkout/)
})
