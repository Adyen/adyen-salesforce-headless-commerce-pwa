import {DEFAULT_EXPIRATION_TIME} from './constants.mjs'

/**
 * Calculates an expiration timestamp based on the provided expiration time in minutes.
 * @param {string|number} expirationTime - Time in minutes until expiration (can be string or number)
 * @returns {string} ISO 8601 formatted expiration timestamp
 */
export const expireAt = (expirationTime) => {
    const parsedTime = Number(expirationTime)
    const minutes = !parsedTime || parsedTime < 0 ? Number(DEFAULT_EXPIRATION_TIME) : parsedTime

    // Calculate expiration date (minutes * 60 seconds * 1000 milliseconds)
    return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}
