import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

const script = path.resolve(__dirname, '../sync-adyen-salesforce-pwa.sh')

describe('sync-adyen-salesforce-pwa', () => {
    let directory
    let app
    let packageDirectory
    let bin

    const runSync = () =>
        spawnSync('bash', [script], {
            cwd: app,
            env: {
                ...process.env,
                PATH: `${bin}${path.delimiter}${process.env.PATH}`,
                npm_config_ignore_scripts: 'false'
            },
            encoding: 'utf8',
            timeout: 15000
        })

    beforeEach(() => {
        directory = mkdtempSync(path.join(tmpdir(), 'adyen sync '))
        app = path.join(directory, 'adyen-retail-react-app')
        packageDirectory = path.join(directory, 'adyen-salesforce-pwa')
        bin = path.join(directory, 'bin')
        const folders = [app, packageDirectory, bin]
        folders.forEach((folder) => mkdirSync(folder))
        writeFileSync(
            path.join(bin, 'pnpm'),
            '#!/bin/sh\necho ERR_PNPM_VERIFY_DEPS_BEFORE_RUN >&2\nexit 1\n',
            {mode: 0o755}
        )
        writeFileSync(
            path.join(packageDirectory, 'package.json'),
            JSON.stringify({
                name: '@adyen/adyen-salesforce-pwa',
                version: '1.0.0',
                main: 'dist/index.js',
                files: ['dist'],
                bin: {'fixture-bin': 'dist/bin.js'},
                scripts: {'build-prod': 'node build.js'}
            })
        )
        writeFileSync(
            path.join(packageDirectory, 'build.js'),
            "const fs = require('fs'); fs.mkdirSync('dist'); fs.writeFileSync('dist/index.js', 'built package'); fs.writeFileSync('dist/bin.js', '#!/usr/bin/env node\\nconsole.log(\"fixture bin\")\\n')"
        )
    })

    afterEach(() => {
        rmSync(directory, {recursive: true, force: true})
    })

    it('builds, packs and installs without requiring pnpm or changing manifests', () => {
        const manifest = '{"name":"fixture-app"}\n'
        const lockfile = 'fixture lockfile\n'
        writeFileSync(path.join(app, 'package.json'), manifest)
        writeFileSync(path.join(app, 'pnpm-lock.yaml'), lockfile)

        const result = runSync()

        expect({status: result.status, stderr: result.stderr}).toEqual({
            status: 0,
            stderr: expect.not.stringContaining('ERR_PNPM_VERIFY_DEPS_BEFORE_RUN')
        })
        const installed = path.join(app, 'node_modules/@adyen/adyen-salesforce-pwa')
        expect(readFileSync(path.join(installed, 'dist/index.js'), 'utf8')).toBe('built package')
        expect(JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8')).version).toBe(
            '1.0.0'
        )
        expect(readFileSync(path.join(app, 'package.json'), 'utf8')).toBe(manifest)
        expect(readFileSync(path.join(app, 'pnpm-lock.yaml'), 'utf8')).toBe(lockfile)
        expect(readdirSync(app).filter((name) => name.endsWith('.tgz'))).toEqual([])
        expect(readdirSync(packageDirectory).filter((name) => name.endsWith('.tgz'))).toEqual([])
    })

    it('makes installed package commands executable', () => {
        const result = runSync()

        expect(result.status).toBe(0)
        const command = spawnSync(
            path.join(app, 'node_modules/@adyen/adyen-salesforce-pwa/dist/bin.js'),
            [],
            {encoding: 'utf8'}
        )
        expect(command.error).toBeUndefined()
        expect(command.status).toBe(0)
        expect(command.stdout.trim()).toBe('fixture bin')
    })

    it('stops when packaging fails and preserves the installed package', () => {
        const manifestPath = path.join(packageDirectory, 'package.json')
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
        manifest.scripts.prepack = 'exit 1'
        writeFileSync(manifestPath, JSON.stringify(manifest))
        const installed = path.join(app, 'node_modules/@adyen/adyen-salesforce-pwa')
        mkdirSync(installed, {recursive: true})
        writeFileSync(path.join(installed, 'original.txt'), 'original package')

        const result = runSync()

        expect(result.status).toBe(1)
        expect(result.stdout).toContain('Packaging failed!')
        expect(result.stdout).not.toContain('Successfully synced')
        expect(readFileSync(path.join(installed, 'original.txt'), 'utf8')).toBe('original package')
    })
})
