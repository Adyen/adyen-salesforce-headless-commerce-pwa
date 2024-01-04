#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
// this script helps load environment variables when running the retail-react-app on local
'use strict'
const spawn = require('cross-spawn');
const dotenv = require('dotenv')
var argv = require('minimist')(process.argv.slice(2))
;(async function () {
    // load the env variables. pass custom env file with -e flag. eg."npm run dot-env -- -e='.env.local'"
    const envPath = argv.e || '.env'
    const result = dotenv.config({path: envPath})
    if (result.error) {
        throw result.error
    }
    Object.assign(process.env, result.parsed)
    if (argv.p) {
        // run the npm command in a new child process
        const command = spawn(argv.p, argv._)

        command.stdout.on('data', (data) => {
            console.log(data.toString())
        })

        command.stderr.on('data', (data) => {
            console.error(data.toString())
        })

        command.on('exit', (code) => {
            console.log(`Child exited with code ${code}`)
        })
    }
})()
