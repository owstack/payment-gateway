const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
const Schema = mongoose.Schema;

let Wallet = new Schema({
    keys: [{type: String, required: true}],
    minSigs: {type: Number, default: 1},
    basePath: {type: String, default: 'm/0'},
    addressIndex: {type: Number, default: 0},
    currency: {type: String, required: true}
});

Wallet.methods.getDerivationPath = function () {
    return `${this.basePath}/${this.addressIndex}`;
};

Wallet.methods.updateAddressIndex = function () {
    return Wallet.findOneAndUpdate(
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

module.exports = Wallet = mongoose.model('Wallet', Wallet);
