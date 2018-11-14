#!/usr/bin/env node

const _ = require('lodash');
const mongoose = require( 'mongoose');
mongoose.Promise = global.Promise;

const config = require('config');

const Payment = require('../models/payment');

const headers = [
    'payment id',  // 0
    'req amount', // 1
    'req currency', // 2
    'created', // 3
    'received', // 4
    'txid', // 5
    'rec amount', // 6
    'rec currency', // 7
    'refund to', // 8
    'memo', // 9
    'merchant data' // 10
];

function printRow(data) {
    console.log(`'${data.join('\',\'')}'`);
}

(async () => {
    await mongoose.connect(config.db, {
        socketTimeoutMS: 0,
        keepAlive: true,
        reconnectTries: 30,
        useNewUrlParser: true
    });

    const payments = Payment.find({received: {$ne: []}}).cursor();
    printRow(headers);
    payments.on('data', (doc) => {
        doc.received.forEach((receipt) => {
            const data = [];
            data[0] = doc._id;
            data[1] = doc.amount;
            data[2] = doc.currency;
            data[3] = doc.created;
            data[4] = receipt.timestamp;
            data[5] = receipt.txid;
            const receivedAmount = _.find(doc.prices, {pair: `${receipt.currency}${doc.currency}`});
            data[6] = receivedAmount.amount;
            data[7] = receipt.currency;
            data[8] = receipt.refundTo;
            data[9] = receipt.memo;
            data[10] = receipt.merchantData;
            printRow(data);
        });
    });

    payments.on('close', async () => {
        console.log('Done. Closing db.');
        await mongoose.disconnect();
    });
})();
