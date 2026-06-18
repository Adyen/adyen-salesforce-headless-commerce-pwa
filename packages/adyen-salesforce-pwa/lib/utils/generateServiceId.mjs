/**
 * Generates a unique service ID for Terminal API requests.
 * @returns {string} A unique service ID string (max 10 characters).
 */
export function generateServiceId() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 10)
}
