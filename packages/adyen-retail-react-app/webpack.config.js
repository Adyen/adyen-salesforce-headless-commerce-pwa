/* eslint-disable @typescript-eslint/no-var-requires */
var config = require('@salesforce/pwa-kit-dev/configs/webpack/config')
var configNames = require('@salesforce/pwa-kit-dev/configs/webpack/config-names')
const {isRemote} = require('@salesforce/pwa-kit-runtime/utils/ssr-server')

const isCssRule = (rule) => rule.test instanceof RegExp && rule.test.test('styles.css')

module.exports = config.map((configItem) => {
    if (configItem.name === configNames.CLIENT || configItem.name === configNames.SERVER) {
        const rules =
            configItem.name === configNames.CLIENT
                ? [
                      ...configItem.module.rules.filter((rule) => !isCssRule(rule)),
                      {
                          test: /\.css$/i,
                          use: ['style-loader', 'css-loader']
                      }
                  ]
                : configItem.module.rules

        return {
            ...configItem,
            devtool: isRemote() ? false : 'source-map',
            module: {
                ...configItem.module,
                rules
            }
        }
    } else {
        return configItem
    }
})
