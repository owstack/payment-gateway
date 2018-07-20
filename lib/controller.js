const config = require('config');
const Boom = require('boom');
const jwt = require('jsonwebtoken');

const request = require('request-promise-native');

const PaymentRequest = require('../models/payment');
const coins = require('./coins');

function getDecodedJWT(token) {
    try {
        return jwt.decode(token); //TODO: Replace with .verify method
    } catch (e) {
        console.error(e);
        return {};
    }
}

function identifyFromJWT(request) {
    const token = request.headers.authorization.replace('Bearer ', '');
    const decoded = getDecodedJWT(token);
    return decoded.sub;
}

async function getNetworkFees(blocks) {
    const promises = [];
    Object.keys(config.explorerAPIs).forEach(async (currency) => {
        const getFee = async () => {
            const url = `${config.explorerAPIs[currency]}/utils/estimatefee?nbBlocks=${blocks}`;
            try {
                const rateResponse = await request({url, json: true});
                return {currency, blocks, amount: rateResponse[blocks]};
            } catch (e) {
                console.error(e);
                throw e;
            }
        };
        promises.push(getFee(blocks));
    });

    return Promise.all(promises);
}

async function getConversionRates(currency, amount) {
    const promises = [];
    Object.keys(config.rates).forEach(async (pair) => {
        promises.push(new Promise(async (resolve, reject) => {
            const url = `${config.rates[pair]}/${amount}`;
            try {
                const rateResponse = await request({url, json: true});
                return resolve({pair, amount, rate: rateResponse.price});
            } catch (e) {
                reject(e);
            }

        }));
    });

    return Promise.all(promises);
}

async function createPaymentRequest(req, h) {
    const currency = req.payload.currency;
    const amount = req.payload.amount;
    const ref = req.payload.ref;
    const memo = req.payload.memo;
    const createdBy = identifyFromJWT(req);

    if (!config.currencies.includes(currency)) {
        return Promise.reject(new Error(`Requested currency: ${currency} is not supported. Supported currencies: ${config.currencies}`));
    }

    const fees = await getNetworkFees(2);
    const prices = await getConversionRates(currency, amount);
    const paymentRequest = new PaymentRequest({
        amount,
        currency,
        prices,
        fees,
        memo,
        ref,
        createdBy
    });
    try {
        await paymentRequest.save();
    } catch (e) {
        console.error(e);
        return h.response({error: 'Internal Error'}).code(500);
    }

    return h.response(paymentRequest).code(200);
}

async function viewPaymentRequest(req, h) {
    const _id = req.params.id;
    let paymentRequest;
    try {
        paymentRequest = await PaymentRequest.findOne({_id}).exec();
    } catch (e) {
        throw Boom.serverUnavailable('Error finding payment request. Please try your request again.');
    }
    if (!paymentRequest) {
        throw Boom.notFound('Could not find the specified payment request.');
    }
    const acceptHeader = req.headers.accept;
    let payPro;
    switch (acceptHeader) {
        case 'application/json':
            return h.response(paymentRequest.toJSON({virtuals: true})).code(200);
        case 'application/bitcoin-paymentrequest': // BIP 71 MIME type
            try {
                payPro = await coins.assemblePaymentRequest('BTC', paymentRequest);
            } catch (e) {
                console.error(e);
                return h.response({error: 'Internal error'}).code(500);
            }

            return h.response(payPro).code(200);
        case 'application/bitcoincash-paymentrequest': // BIP 71 MIME type modified for bitcoincash
            try {
                payPro = await coins.assemblePaymentRequest('BCH', paymentRequest);
            } catch (e) {
                console.error(e);
                return h.response({error: 'Internal error'}).code(500);
            }
            return h.response(payPro).code(200);
        case 'application/litecoin-paymentrequest': // BIP 71 MIME type modified for litecoin
            try {
                payPro = await coins.assemblePaymentRequest('LTC', paymentRequest);
            } catch (e) {
                console.error(e);
                return h.response({error: 'Internal error'}).code(500);
            }
            return h.response(payPro).code(200);
        // case 'application/payment-request': // BitPay jsonPaymentProtocol format (currency agnostic)
        //     return renderJSONPayPro(req, h, paymentRequest);
        default:
            throw new Error('Invalid Accept header.');
    }
}

async function receivePayment(req, h) {
    const _id = req.params.id;
    let paymentRequest;
    try {
        paymentRequest = await PaymentRequest.findOne({_id}).exec();
    } catch (e) {
        console.error('Error finding payment request', e);
        throw Boom.serverUnavailable('Error finding payment request. Please try your request again.');
    }
    const contentType = req.headers['x-content-type'];
    const payload = req.payload;
    let payProResponse;
    switch (contentType) {
        case 'application/bitcoin-payment':
            payProResponse = await coins.receivePayment('BTC', payload, paymentRequest);
            return h.response(payProResponse).type('application/bitcoin-paymentack').code(200);
        case 'application/bitcoincash-payment':
            payProResponse = await coins.receivePayment('BCH', payload, paymentRequest);
            return h.response(payProResponse).type('application/bitcoincash-paymentack').code(200);
        case 'application/litecoin-payment':
            payProResponse = await coins.receivePayment('LTC', payload, paymentRequest);
            return h.response(payProResponse).type('application/litecoin-paymentack').code(200);
        default:
            throw new Error('Invalid Content-Type header.');
    }
}

module.exports = {
    createPaymentRequest,
    viewPaymentRequest,
    receivePayment,
    getNetworkFees
};
