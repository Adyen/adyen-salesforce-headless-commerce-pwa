module.exports = () => ({
    site: {id: 'RefArch'},
    locale: {id: 'en-US'},
    buildUrl: (path, siteRef = 'RefArch', localeRef = 'en-US') => `/${siteRef}/${localeRef}${path}`
})
