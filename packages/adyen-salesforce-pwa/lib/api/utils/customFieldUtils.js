export function mapCustomFields(customFields = []) {
    return customFields.reduce((acc, {field, value} = {}) => {
        if (!field || value == null) {
            return acc
        }

        acc[field] = value
        return acc
    }, {})
}
