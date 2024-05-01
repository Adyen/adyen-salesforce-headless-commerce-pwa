import { APPLICATION_VERSION } from "./constants.mjs";

export function getApplicationInfo(systemIntegratorName) {
  return {
    merchantApplication: {
      name: 'adyen-salesforce-commerce-cloud',
      version: APPLICATION_VERSION
    },
    externalPlatform: {
      name: 'SalesforceCommerceCloud',
      version: 'PWA',
      integrator: systemIntegratorName
    }
  }
}