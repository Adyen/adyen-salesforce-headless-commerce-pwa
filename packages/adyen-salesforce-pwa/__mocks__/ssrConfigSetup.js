jest.mock('@salesforce/pwa-kit-runtime/utils/ssr-config', () => ({
    getConfig: jest.fn(() => ({
        app: {
            commerceAPI: {
                parameters: {
                    siteId: 'RefArch'
                }
            }
        }
    }))
}))
