const math = require('mathjs');
math.config({precision: 8});

const _ = require('lodash');

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
    let addr;
    if (addressKeys.length === 0) {
        throw new Error('Cannot generate address for wallet with no keys');
    }
    if (wallet.minSigs > addressKeys.length) {
        throw new Error('Cannot generate address for wallet which requires more sigs than there are keys');
    }
    if (addressKeys.length > 1) {
        addr = new coins[currencyCode].lib.Address(addressKeys, wallet.minSigs);
    } else {
        addr = new coins[currencyCode].lib.Address(addressKeys[0]);
    }
    const s = coins.getScriptFromAddress(currencyCode, addr);
    return {address: addr, script: s, wallet};
};

coins.getScriptFromAddress = function (currencyCode, addr) {
    let s;
    if (addr.isPayToPublicKeyHash()) {
        s = coins[currencyCode].lib.Script.buildPublicKeyHashOut(addr);
    } else if (addr.isPayToScriptHash()) {
        s = coins[currencyCode].lib.Script.buildScriptHashOut(addr);
    } else {
        throw new Error(`Unrecognized address type ${  addr.type}`);
    }
    return s;
};

coins.assemblePaymentRequest = async function (currencyCode, paymentRequest) {
    const payPro = coins[currencyCode].paypro;
    let amount = math.bignumber(0);
    if (paymentRequest.currency !== 'USD') {
        const originalAmount = math.bignumber(paymentRequest.amount);
        const originalAmountSatoshis = math.multiply(originalAmount, 1e8);
        const markup = math.bignumber(1 + config.markup);
        amount = math.multiply(originalAmountSatoshis, markup);
        amount = math.number(math.round(amount, 0));
    } else if (paymentRequest.currency === 'USD') {
        paymentRequest.prices.forEach((price) => {
            if (price.pair === `${currencyCode}${paymentRequest.currency}`) {
                const originalAmount = math.bignumber(paymentRequest.amount.toString());
                const originalAmountSatoshis = math.multiply(originalAmount, 1e8);
                const markup = math.bignumber(1 + config.markup);
                const rate = math.bignumber(price.rate.toString());
                const converted = math.multiply(originalAmountSatoshis, rate);
                amount = math.multiply(converted, markup);
                amount = math.number(math.round(amount, 0));
            }
        });
    } else {
        throw new Error('Headers do not match currency.');
    }
    const outputs = [];
    const paymentOutput = new payPro().makeOutput();
    paymentOutput.set('amount', amount);
    let paymentAddress;
    const existingAddress = _.find(paymentRequest.addresses, {currency: currencyCode});
    if (!existingAddress) {
        paymentAddress = await coins.generatePaymentAddress(currencyCode);
        paymentRequest.addresses.push({
            currency: currencyCode,
            addressIndex: paymentAddress.wallet.addressIndex,
            wallet: paymentAddress.wallet._id,
            address: paymentAddress.address
        });
        await paymentRequest.save();
    } else {
        const reuseAddress = new coins[currencyCode].lib.Address(existingAddress.address);
        paymentAddress = {
            address: reuseAddress,
            script: coins.getScriptFromAddress(currencyCode, reuseAddress),
            wallet: existingAddress.wallet
        };
    }

    paymentOutput.set('script', paymentAddress.script.toBuffer());
    outputs.push(paymentOutput.message);

    const details = new payPro().makePaymentDetails();
    details.set('network', 'main');
    details.set('outputs', outputs);
    details.set('time', paymentRequest.created / 1000 | 0); //format in seconds, no millis or decimal
    details.set('expires', paymentRequest.expires / 1000 | 0);
    details.set('memo', paymentRequest.memo);
    details.set('payment_url', `https://${config.externalHostname}:3000/${paymentRequest._id}`);
    details.set('merchant_data', paymentRequest.ref);

    const certificates = new payPro().makeX509Certificates();
    certificates.set('certificate', [config.x509.ca, config.x509.cert]);

    const request = new payPro().makePaymentRequest();
    request.set('payment_details_version', 1);
    request.set('pki_type', 'x509+sha256');
    request.set('pki_data', certificates.serialize());
    request.set('serialized_payment_details', details.serialize());

    try {
        request.sign(config.x509.key);
    } catch (e) {
        console.error(e);
        throw e;
    }

    // serialize the response
    return request.serialize();
};

coins.receivePayment = async function (currencyCode, payload, paymentRequest) {
    console.log('Receive Payment', currencyCode, paymentRequest);
    const PaymentProtocol = coins[currencyCode].paypro;
    console.log('0');
    const body = PaymentProtocol.Payment.decode(payload);
    console.log('1', body);
    const payment = new PaymentProtocol().makePayment(body);
    console.log('2');
    const merchant_data = payment.get('merchant_data');
    console.log('3', merchant_data);
    const transactions = payment.get('transactions');
    console.log('4', transactions);
    const refund_to = payment.get('refund_to');
    console.log('5', refund_to);
    const memo = payment.get('memo');
    console.log('6', memo);
    console.log(body, payment, merchant_data, transactions, refund_to, memo);

    // do whatever validation here, persist, and send to blockchain before sending ack
    transactions.forEach((serialized) => {
        const tx = new coins[currencyCode].lib.Transaction(serialized);
        paymentRequest.received.push({
            currency: currencyCode,
            txid: tx.id
        });
    });
    await paymentRequest.save();

    // make a payment acknowledgement
    const ack = new PaymentProtocol().makePaymentACK();
    ack.set('payment', payment.message);
    ack.set('memo', 'Thank you for your payment!');

    // serialize the response
    return ack.serialize();
};

module.exports = coins;
