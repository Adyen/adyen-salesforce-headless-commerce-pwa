module.exports = {
    hooks: {
        afterAllResolved(lockfile) {
            const pnpmLock = structuredClone(lockfile)
            for (const packagePath in pnpmLock.packages) {
                delete pnpmLock.packages[packagePath]?.resolution?.tarball
            }

            return pnpmLock
        }
    }
}
