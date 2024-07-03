/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
export default {
    baseStyle: {
        borderRadius: 'base'
    },
    variants: {
        solid: (props) =>
            props.colorScheme === 'blue'
                ? {
                      backgroundColor: '#00112c',
                      color: 'white',
                      _hover: {bg: '#1c3045', _disabled: {bg: '#1c3045'}},
                      _active: {bg: '#3a4a5c'},
                      _disabled: {bg: '#1c3045'}
                  }
                : {},
        outline: (props) =>
            props.colorScheme === 'black'
                ? {color: 'gray.900', _hover: {bg: 'gray.50'}, borderColor: 'gray.200'}
                : {color: '#00112c', _hover: {bg: 'gray.50'}, borderColor: '#00112c'},
        footer: {
            fontSize: 'sm',
            backgroundColor: 'gray.100',
            color: 'black',
            _hover: {bg: 'gray.200'},
            _active: {bg: 'gray.300'},
            paddingLeft: 3,
            paddingRight: 3
        },
        link: (props) => ({
            color: props.colorScheme === 'red' ? 'red.500' : 'blue.600',
            fontWeight: 'normal',
            minWidth: '1em',
            lineHeight: 4
        }),
        'menu-link': {
            color: 'black',
            justifyContent: 'flex-start',
            fontSize: 'sm',
            _hover: {bg: 'gray.50', textDecoration: 'none'},
            _activeLink: {
                bg: 'gray.50',
                textDecoration: 'none'
            }
        },
        'menu-link-mobile': {
            color: 'black',
            justifyContent: 'flex-start',
            fontSize: 'sm',
            _hover: {bg: 'gray.50', textDecoration: 'none'},
            _activeLink: {
                bg: 'gray.100',
                textDecoration: 'none'
            }
        },
        'search-link': {
            color: 'black',
            justifyContent: 'flex-start',
            fontSize: 'sm',
            _hover: {textDecoration: 'none'}
        }
    },
    sizes: {
        md: {
            height: 11,
            minWidth: 11
        }
    },
    defaultProps: {
        colorScheme: 'blue'
    }
}
