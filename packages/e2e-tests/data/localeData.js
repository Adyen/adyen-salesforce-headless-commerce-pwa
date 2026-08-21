export class LocaleData {
    EN = {
        lang: 'en-US',
        landingPage: {
            heading: 'Adyen Integration in React PWA Starter Store'
        },
        loginPage: {
            paragraph: 'Welcome Back'
        },
        accountPage: {
            heading: 'Account Details'
        },
        productDetailPage: {
            productName: '12416789M',
            productColor: 'Navy',
            productSize: '28',
            addToCartButtonCaption: 'Add to Cart',
            proceedToCheckoutButtonCaption: 'Proceed to Checkout'
        },
        checkoutPage: {
            heading: 'Checkout',
            contactInfoSectionModifyButton: 'Contact Info',
            shippingMethodModifyButton: 'Edit Shipping Options',
            shippingAddressModifyButton: 'Shipping Address'
        },
        successfulOrderMessage: 'Thank you for your order!'
    }
    FR = {
        lang: 'fr-FR',
        landingPage: {
            heading: 'React PWA Starter Store pour le retail'
        },
        accountPage: {
            heading: 'Détails du compte'
        },
        productDetailPage: {
            productName: '12416789M',
            productColor: 'Marine',
            productSize: '28',
            addToCartButtonCaption: 'Ajouter au panier',
            proceedToCheckoutButtonCaption: 'Passer au checkout'
        },
        checkoutPage: {
            heading: 'Checkout',
            contactInfoSectionModifyButton: 'Modifier les coordonnées',
            shippingMethodModifyButton: 'Modifier les options de',
            shippingAddressModifyButton: 'Modifier l’adresse de'
        },
        successfulOrderMessage: 'Thank you for your order!'
    }
    IN = {
        lang: 'hi-IN',
        landingPage: {
            heading: 'Adyen Integration in React PWA Starter Store'
        },
        loginPage: {
            paragraph: 'Welcome Back'
        },
        accountPage: {
            heading: 'Account Details'
        },
        productDetailPage: {
            productName: '12416789M',
            productColor: 'Navy',
            productSize: '28',
            addToCartButtonCaption: 'Add to Cart',
            proceedToCheckoutButtonCaption: 'Proceed to Checkout'
        },
        checkoutPage: {
            heading: 'Checkout',
            contactInfoSectionModifyButton: 'Contact Info',
            shippingMethodModifyButton: 'Edit Shipping Options',
            shippingAddressModifyButton: 'Shipping Address'
        },
        successfulOrderMessage: 'Thank you for your order!'
    }
    DK = {
        lang: 'da-DK',
        landingPage: {
            heading: 'Adyen React PWA-startbutikken til detailhandel'
        },
        productDetailPage: {
            // Master product 25553417M does not have a color/size swatch pair
            // that this test can reliably select via a translated label, so the
            // variant (pid=701643489169M) is preselected via query params instead.
            productName: '25553417M?color=JJ0VWXX&size=004&pid=701643489169M',
            addToCartButtonCaption: 'Læg i kurv',
            proceedToCheckoutButtonCaption: 'Fortsæt til kassen'
        },
        checkoutPage: {
            heading: 'Kassen',
            contactInfoSectionModifyButton: 'Rediger kontaktoplysninger',
            shippingMethodModifyButton: 'Rediger forsendelsesindstillinger',
            shippingAddressModifyButton: 'Rediger leveringsadresse'
        },
        successfulOrderMessage: 'Tak for din bestilling!'
    }
}
