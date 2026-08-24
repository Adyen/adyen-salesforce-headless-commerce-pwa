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
    JP = {
        lang: 'ja-JP',
        landingPage: {
            heading: 'リテール用 Adyen React PWA スターターストア'
        },
        productDetailPage: {
            // Master product 25553417M does not have a color/size swatch pair
            // that this test can reliably select via a translated label, so the
            // variant (pid=701643489169M) is preselected via query params instead.
            productName: '25553417M?color=JJ0VWXX&size=004&pid=701643489169M',
            addToCartButtonCaption: '買い物カゴに追加',
            proceedToCheckoutButtonCaption: '注文手続きに進む'
        },
        checkoutPage: {
            heading: 'チェックアウト',
            contactInfoSectionModifyButton: '連絡先情報の編集',
            shippingMethodModifyButton: '配送オプションの編集',
            shippingAddressModifyButton: '配送先住所の編集'
        },
        successfulOrderMessage: 'ご注文いただきありがとうございました!'
    }
}
