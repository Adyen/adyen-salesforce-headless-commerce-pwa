/* eslint-disable @typescript-eslint/no-var-requires */
var config = require('@salesforce/pwa-kit-dev/configs/webpack/config')
var configNames = require('@salesforce/pwa-kit-dev/configs/webpack/config-names')
const {isRemote} = require('@salesforce/pwa-kit-runtime/utils/ssr-server')

module.exports = config.map((configItem) => {
    if (configItem.name === configNames.CLIENT || configItem.name === configNames.SERVER) {
        return {
            ...configItem,
            devtool: isRemote() ? false : 'source-map',
            module: {
                ...configItem.module,
                rules: [
                    ...configItem.module.rules,
                    {
                        test: /\.css$/i,
                        use: ['style-loader', 'css-loader']
                    }
                ]
            }
        }
    } else {
        return configItem
    }
})
