const config = require('config');
const mongoose = require('mongoose');
const Wallet = require('../models/wallet');

const xpubs = [];
const currencies = ['BCH', 'BTC', 'LTC'];

// BTC wallet
xpubs.push('xpub6DVhME6zTr9hbTxXonFnR8ivJSGgBeWjYU9JNHGmyGqv4FcE8D8v6VCoxXvbady7BzTYtpS6uwSWkzC3fZ7n4zRavj5MAsBc7rsQTxioqdo');
xpubs.push('xpub6BunPg6rKmoixwdqDZ3jW3TRbuH9NYSV4JUcATag3TY2GTZyA8TVtpom7smUyTyArLzvwG7s1Vpq3RMtazFmwjnKYCZGUcgfTVfCppCfACm');

async function create() {
    await mongoose.connect(config.db, {
        socketTimeoutMS: 0,
        keepAlive: true,
        reconnectTries: 30
    });
    const promises = [];
    currencies.forEach((curr) => {
        const wallet = new Wallet({
            keys: xpubs,
            minSigs: 2,
            basePath: 'm/0',
            addressIndex: 0,
            currency: curr
        });
        promises.push(wallet.save());
    });
    await Promise.all(promises);
    console.log('done');
}

create();
