import fs from 'fs'
import path from 'path'

describe('ProductView express payments', () => {
    test.each(['ApplePayExpress', 'GooglePayExpress', 'PayPalExpress'])(
        'mounts one %s component',
        (componentName) => {
            const source = fs.readFileSync(path.join(__dirname, 'index.jsx'), 'utf8')
            const componentInstances =
                source.match(new RegExp(`<${componentName}[\\s>]`, 'g')) || []

            expect(componentInstances).toHaveLength(1)
        }
    )
})
