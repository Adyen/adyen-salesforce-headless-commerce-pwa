/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/*
    This override re-exports the base template constants and replaces the shipping
    country codes with the full list supported by Adyen.
*/

/* -----------------Adyen Begin ------------------------ */
import {countryList} from '@adyen/adyen-salesforce-pwa'

export const SHIPPING_COUNTRY_CODES = countryList
/* -----------------Adyen End ------------------------ */

export * from '@salesforce/retail-react-app/app/constants'
