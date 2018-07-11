const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PAYMENT_STATES = ['none', 'partial', 'paid', 'over'];
const ACCEPTANCE_STATES = ['pending', 'accepted', 'returned'];

const fifteenMinutes = 15 * 60 * 1000;

const uuidV4 = require('uuid/v4');

const PriceSchema = new Schema({
    pair: {type: String, required: true},
    amount: {type: Schema.Types.Decimal128, required: true},
    rate: {type: Schema.Types.Decimal128, required: true}
});

const FeeSchema = new Schema({
    currency: {type: String, required: true},
    amount: {type: Schema.Types.Decimal128, required: true},
    blocks: {type: Number, required: true}
});

const ReceiptSchema = new Schema({
    currency: {type: String, required: true},
    amount: {type: Schema.Types.Decimal128, required: true},
    timestamp: {type: Date, default: Date.now},
    txid: {type: String, required: true}
});

const PaymentSchema = new Schema({
    _id: {type: String, default: uuidV4},
    amount: {type: Schema.Types.Decimal128, required: true},
    currency: {type: String, required: true},
    created: {type: Date, default: Date.now},
    expires: {type: Date, default: function () {
        return Date.now() + fifteenMinutes;
    }},
    prices: [PriceSchema],
    fees: [FeeSchema],
    received: [ReceiptSchema],
    state: {
        payment: {type: String, enum: PAYMENT_STATES, default: PAYMENT_STATES[0]},
        acceptance: {type: String, enum: ACCEPTANCE_STATES, default: ACCEPTANCE_STATES[0]}
    },
    memo: String,
    ref: String,
    createdBy: {type: String, required: true}
});

module.exports = mongoose.model('Payment', PaymentSchema);
