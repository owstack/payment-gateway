const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WalletSchema = new Schema({
    xpub: {type: String, required: true},
    addressIndex: {type: Number, default: 0},
    basePath: {type: String, default: 'm/44\''},
    currency: {type: String, required: true},
    testnet: {type: Boolean, required: true},
    identity: {type: Schema.Types.ObjectId, ref: 'Identity', required: true}
});

WalletSchema.methods.pathForCurrency = function () {
    const slip44 = {
        bch: 145,
        btc: 0,
        ltc: 2
    };

    if (!slip44[this.currency]) {
        throw new Error(`No SLIP44 mapping for currency: ${this.currency}`);
    }

    return `${this.basePath}/${slip44[this.currency]}'/${this.addressIndex}'`;
};

WalletSchema.methods.updateAddressIndex = function () {
    return WalletSchema.findOneAndUpdate(
        {
            _id: this._id
        },
        {
            $inc: {
                addressIndex: 1
            }
        },
        {
            new: true
        }
    ).exec();
};

module.exports = mongoose.model('Wallet', WalletSchema);
