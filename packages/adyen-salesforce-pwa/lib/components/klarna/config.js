import {baseConfig} from '../helpers/baseConfig'

export const klarnaConfig = (props) => {
    return {
        ...baseConfig(props),
        showPayButton: true,
        useKlarnaWidget: true
    }
}
