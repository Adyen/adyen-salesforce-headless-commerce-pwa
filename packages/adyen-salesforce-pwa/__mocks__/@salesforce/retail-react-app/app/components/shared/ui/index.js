import React from 'react'
import PropTypes from 'prop-types'

const createComponent = (element) => {
    const Component = ({children, ...props}) => React.createElement(element, props, children)
    Component.displayName = element
    Component.propTypes = {children: PropTypes.node}
    return Component
}

export const Box = createComponent('div')

export const Button = ({children, isDisabled, ...props}) =>
    React.createElement('button', {...props, disabled: isDisabled}, children)
Button.displayName = 'Button'
Button.propTypes = {children: PropTypes.node, isDisabled: PropTypes.bool}

export const FormControl = createComponent('div')
export const FormLabel = createComponent('label')

export const Select = ({children, placeholder, ...props}) =>
    React.createElement(
        'select',
        props,
        placeholder ? React.createElement('option', {value: ''}, placeholder) : null,
        children
    )
Select.displayName = 'Select'
Select.propTypes = {children: PropTypes.node, placeholder: PropTypes.string}

export const Stack = createComponent('div')
export const Text = createComponent('p')
