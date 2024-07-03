import {test} from '@playwright/test'
import {ScenarioHelper} from '../helpers/ScenarioHelper.js'

test.describe('The application', () => {
    test('should render successfully', async ({page}) => {
        const scenarios = new ScenarioHelper(page)
        await scenarios.visitStore()
    })
})
