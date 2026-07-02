/* eslint-disable @typescript-eslint/no-var-requires */
var config = require('@salesforce/pwa-kit-dev/configs/webpack/config')
var configNames = require('@salesforce/pwa-kit-dev/configs/webpack/config-names')
const {isRemote} = require('@salesforce/pwa-kit-runtime/utils/ssr-server')

module.exports = config.map((configItem) => {
    if (configItem.name === configNames.CLIENT) {
        return {
            ...configItem,
            devtool: isRemote() ? false : 'source-map',
            module: {
                ...configItem.module,
                rules: [
                    // Remove pwa-kit's ignore-loader CSS rule so our style-loader takes over
                    ...configItem.module.rules.filter(
                        (rule) => !(rule.test && rule.test.toString().includes('css'))
                    ),
                    {
                        test: /\.css$/i,
                        use: ['style-loader', 'css-loader']
                    }
                ]
            }
        }
    } else if (configItem.name === configNames.SERVER) {
        // Server-side (SSR) bundle: CSS is irrelevant in Node.js — keep ignore-loader as-is,
        // only apply the devtool override.
        return {
            ...configItem,
            devtool: isRemote() ? false : 'source-map'
        }
    } else {
        return configItem
    }
})
