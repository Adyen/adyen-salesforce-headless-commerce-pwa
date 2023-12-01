/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars */
const webpack = require('webpack')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const scriptsConfig = {
    target: 'node',
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs', '...']
    },
    entry: {
        'include-env': './lib/scripts/include-env.js',
        'get-env': './lib/scripts/get-env.js',
        'upload-env': './lib/scripts/upload-env.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist/scripts'),
        filename: '[name].js',
        publicPath: '/',
        globalObject: 'this',
        library: {
            type: 'commonjs-static'
        }
    },
    externals: [/^@salesforce\/pwa-kit-dev\/.+$/i],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.BannerPlugin({banner: '#!/usr/bin/env node', raw: true})
    ]
}

const serverConfig = {
    target: 'node',
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '...']
    },
    entry: './lib/api/index.js',
    output: {
        path: path.resolve(__dirname, 'dist/ssr'),
        filename: 'index.js',
        publicPath: '/',
        globalObject: 'this',
        library: {
            type: 'commonjs-static'
        }
    },
    externals: [/^@salesforce\/pwa-kit-runtime\/.+$/i],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    plugins: [new CleanWebpackPlugin()]
}

const webConfig = {
    target: 'web',
    entry: './lib/index.js',
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '...']
    },
    output: {
        path: path.resolve(__dirname, 'dist/app'),
        filename: 'index.js',
        publicPath: '/',
        globalObject: 'this',
        library: {
            type: 'commonjs-static'
        }
    },
    externals: [
        /^@salesforce\/retail-react-app\/.+$/i,
        /^@chakra-ui\/.+$/i,
        /^react.+$/i,
        'react',
        'prop-types'
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            },
            {
                test: /\.(js|jsx)$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.svg$/,
                use: 'file-loader',
                exclude: /node_modules/
            },
            {
                test: /\.png$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            mimetype: 'image/png'
                        }
                    }
                ]
            }
        ]
    },
    plugins: [new CleanWebpackPlugin(), new MiniCssExtractPlugin({filename: 'adyen.css'})]
}

module.exports = [scriptsConfig, serverConfig, webConfig]