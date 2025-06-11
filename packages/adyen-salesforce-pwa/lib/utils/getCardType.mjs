export function getCardType(cardType) {
    switch (cardType) {
      case 'visa':
      case 'visa_applepay':
        cardType = 'Visa';
        break;
      case 'mc':
      case 'mc_applepay':
        cardType = 'Master Card';
        break;
      case 'amex':
      case 'amex_applepay':
        cardType = 'Amex';
        break;
      case 'discover':
      case 'discover_applepay':
        cardType = 'Discover';
        break;
      case 'maestro':
      case 'maestrouk':
      case 'maestro_applepay':
        cardType = 'Maestro';
        break;
      case 'diners':
      case 'diners_applepay':
        cardType = 'Diners';
        break;
      case 'bcmc':
        cardType = 'Bancontact';
        break;
      case 'jcb':
      case 'jcb_applepay':
        cardType = 'JCB';
        break;
      case 'cup':
        cardType = 'CUP';
        break;
      case 'cartebancaire':
      case 'cartebancaire_applepay':
        cardType = 'Carte Bancaire';
        break;
      default:
        cardType = '';
        break;
    }
    return cardType;
}