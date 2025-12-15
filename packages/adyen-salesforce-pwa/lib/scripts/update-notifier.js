/* eslint-disable @typescript-eslint/no-var-requires */

try {
    const packageJson = require('../../package.json')
    const mod = require('update-notifier')
    const updateNotifier = mod?.default || mod
    updateNotifier({pkg: packageJson}).notify()
} catch (e) {
    process.exit(0)
}
