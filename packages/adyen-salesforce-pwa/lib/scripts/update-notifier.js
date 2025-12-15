/* eslint-disable @typescript-eslint/no-var-requires */
let updateNotifier

try {
    const mod = require('update-notifier')
    updateNotifier = mod?.default || mod
} catch (e) {
    process.exit(0)
}

const packageJson = require('../../package.json')

updateNotifier({pkg: packageJson}).notify()
