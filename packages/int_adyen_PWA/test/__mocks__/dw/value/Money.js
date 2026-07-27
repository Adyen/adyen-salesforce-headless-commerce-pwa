class Money {
    constructor(value, currencyCode) {
        this.value = value;
        this.currencyCode = typeof currencyCode === 'string' ? currencyCode : currencyCode?.currencyCode;
    }

    divide(divisor) {
        return new Money(this.value / divisor, this.currencyCode);
    }

    multiply(factor) {
        return new Money(this.value * factor, this.currencyCode);
    }
}

module.exports = Money;
