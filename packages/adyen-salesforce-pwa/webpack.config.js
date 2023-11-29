/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars */
const webpack = require('webpack')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const serverConfig = {
    target: 'node',
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '...']
    },
    entry: {
        router: './lib/api/routes/index.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist/ssr'),
        filename: 'index.js',
        publicPath: '/',
        globalObject: 'this',
        library: {
            type: 'commonjs-static'
        }
    },
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
                use: [MiniCssExtractPlugin.loader, 'style-loader', 'css-loader']
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
    plugins: [new CleanWebpackPlugin(), new MiniCssExtractPlugin()]
}

module.exports = [serverConfig]
