const BN = require('bn.js');
const config = require('config');

const ltcLib = require('@owstack/ltc-lib');
const btcLib = require('@owstack/btc-lib');
const bchLib = require('@owstack/bch-lib');

const BTCPayPro = require('@owstack/btc-payment-protocol');
const BCHPayPro = require('@owstack/bch-payment-protocol');
const LTCPayPro = require('@owstack/ltc-payment-protocol');

const Wallet = require('../models/wallet');

const coins = {
    BCH: {
        lib: bchLib,
        paypro: BCHPayPro
    },
    BTC: {
        lib: btcLib,
        paypro: BTCPayPro
    },
    LTC: {
        lib: ltcLib,
        paypro: LTCPayPro
    }
};

coins.generatePaymentAddress = async function (currencyCode) {
    const wallet = await Wallet.findOne({currency: currencyCode}).exec();
    if (!wallet) {
        throw new Error(`No ${currencyCode} wallet found`);
    }
    await wallet.updateAddressIndex();
    const addressKeys = [];
    wallet.keys.forEach((key) => {
        const hdPubKey = new coins[currencyCode].lib.HDPublicKey(key);
        const derived = hdPubKey.derive(wallet.getDerivationPath());
        addressKeys.push(derived.publicKey);
    });
    addressKeys.sort((a, b) => {
        const nameA = a.toString();
        const nameB = b.toString();
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0;
    });

    const addr = new coins[currencyCode].lib.Address(addressKeys, wallet.minSigs);
    let s;
    if (addr.isPayToPublicKeyHash()) {
        s = coins[currencyCode].lib.Script.buildPublicKeyHashOut(addr);
    } else if (addr.isPayToScriptHash()) {
        s = coins[currencyCode].lib.Script.buildScriptHashOut(addr);
    } else {
        throw new Error(`Unrecognized address type ${  addr.type}`);
    }
    // console.log(addr);
    // console.log(s);
    return {address: addr, script: s};
};

coins.assemblePaymentRequest = async function (currencyCode, paymentRequest) {
    const payPro = coins[currencyCode].paypro;
    // console.log('Request Currency: ', paymentRequest.currency);
    // console.log('Client Currency: ', currencyCode);
    let amount = new BN(0, 10);
    if (paymentRequest.currency !== 'USD') {
        const originalAmount = new BN(paymentRequest.amount.toString(), 10);
        const originalAmountSatoshis = originalAmount.mul(new BN(1e8, 10));
        const markup = new BN(1 + config.markup, 10);
        amount = originalAmountSatoshis.mul(markup);
    } else if (paymentRequest.currency === 'USD') {
        paymentRequest.prices.forEach((price) => {
            if (price.pair === `${currencyCode}${paymentRequest.currency}`) {
                const originalAmount = new BN(price.amount.toString(), 10);
                const originalAmountSatoshis = originalAmount.mul(new BN(1e8, 10));
                const markup = new BN(1 + config.markup, 10);
                amount = originalAmountSatoshis.mul(markup);
            }
        });
    } else {
        throw new Error('Headers do not match currency.');
    }
    // console.log('Creating outputs for amount:', amount.toNumber());
    const outputs = [];
    const paymentOutput = new payPro.Output();
    paymentOutput.set('amount', amount.toNumber());
    const paymentAddress = await coins.generatePaymentAddress(currencyCode);
    paymentOutput.set('script', paymentAddress.script.toBuffer()); // need to figure out how to create script here
    outputs.push(paymentOutput);

    // console.log('Creating payment details...');
    const details = new payPro().makePaymentDetails();
    details.set('network', 'main');
    details.set('outputs', outputs);
    details.set('time', paymentRequest.created / 1000 | 0); //format in seconds, no millis or decimal
    details.set('expires', paymentRequest.expires / 1000 | 0);
    details.set('memo', paymentRequest.memo);
    details.set('payment_url', `https://${config.externalHostname}/${paymentRequest._id}`);
    details.set('merchant_data', paymentRequest.ref);

    // console.log('Loading x509 certs...');
    const certificates = new payPro().makeX509Certificates();
    certificates.set('certificate', [config.x509.cert]);

    // console.log('Forming request...');
    const request = new payPro().makePaymentRequest();
    request.set('payment_details_version', 1);
    request.set('pki_type', 'x509+sha256');
    request.set('pki_data', certificates.serialize());
    request.set('serialized_payment_details', details.serialize());

    // console.log('Signing request...');
    try {
        request.sign(config.x509.key);
    } catch (e) {
        console.error(e);
        throw e;
    }

    // serialize the request
    // console.log('Serialize...');
    return request.serialize();
};

module.exports = coins;
