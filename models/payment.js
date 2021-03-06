const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const config = require('config');

// const PAYMENT_STATES = ['none', 'partial', 'paid', 'over'];
// const ACCEPTANCE_STATES = ['pending', 'accepted', 'returned'];

const fifteenMinutes = 15 * 60 * 1000;

const uuidV4 = require('uuid/v4');

const AddressSchema = new Schema({
    currency: {type: String, required: true},
    address: {type: String, required: true},
    wallet: {type: Schema.Types.ObjectId, required: true},
    addressIndex: {type: String, required: true}
}, {_id: false, id: false});

const PriceSchema = new Schema({
    pair: {type: String, required: true},
    amount: {type: Schema.Types.Decimal128, required: true}
}, {_id: false, id: false});

const FeeSchema = new Schema({
    currency: {type: String, required: true},
    amount: {type: Schema.Types.Decimal128, required: true},
    blocks: {type: Number, required: true}
}, {_id: false, id: false});

const RefundSchema = new Schema({
    amount: {type: Schema.Types.Decimal128, required: true},
    script: String
}, {_id: false, id: false});

const ReceiptSchema = new Schema({
    currency: {type: String, required: true},
    timestamp: {type: Date, default: Date.now},
    txid: {type: String, required: true},
    merchantData: {type: String},
    refundTo: [RefundSchema],
    memo: {type: String}
}, {_id: false, id: false});

const PaymentSchema = new Schema({
    _id: {type: String, default: uuidV4},
    amount: {type: Schema.Types.Decimal128, required: true},
    currency: {type: String, required: true},
    created: {type: Date, default: Date.now},
    expires: {type: Date, default: function () {
        return Date.now() + fifteenMinutes;
    }},
    addresses: [AddressSchema],
    prices: [PriceSchema],
    fees: [FeeSchema],
    markup: Number,
    received: [ReceiptSchema],
    memo: String,
    ref: String,
    createdBy: {type: String, required: true}
});

PaymentSchema.virtual('paymentURLs').get(function () {
    let path = `/${this._id}`;
    if (config.proxyPath) {
        path = `${config.proxyPath}/${this._id}`;
    }
    const url = `https://${config.externalHostname}${path}`;
    return {
        BTC: `bitcoin:?r=${url}`,
        BCH: `bitcoincash:?r=${url}`,
        LTC: `litecoin:?r=${url}`,
    };
});

PaymentSchema.virtual('status').get(function () {
    if (this.received && this.received.length && this.expires < this.received.timestamp) {
        return 'late';
    }

    if (this.received && this.received.length) {
        return 'paid';
    }

    if (this.addresses && this.addresses.length) {
        return 'unpaid';
    }

    if (this.expires < Date.now()) {
        return 'expired';
    }

    return 'new';
});

module.exports = mongoose.model('Payment', PaymentSchema);
