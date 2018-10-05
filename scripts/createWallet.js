const config = require('config');
const mongoose = require('mongoose');
const Wallet = require('../models/wallet');

const btcXpubs = [];
const bchXpubs = [];
// const ltcXpubs = [];

// const currencies = ['BCH', 'BTC', 'LTC'];

// BTC wallet
btcXpubs.push('xpub6CKeAVKcVkhYBQ79K6esJFB9vEjdHFQbnAGNexUdCz1Jtrn5g4AqmQwq5BVoSrmSTEjV13qHfQ1Tntzy2JYFwSPkPkNeRdefSTwVYGbT7kK');
btcXpubs.push('xpub6BowusUnSGdtcX9J21jGgFByQCLsQudgoxmgLFDcFA1516mijbiJD3QPbYXKob7LcStj8ZoqMBmAqSMY2rGLHc493stNLTkPAm7tvpVuzaW');
btcXpubs.push('xpub6CZWs42xFKyD1ifxuHT1GovDhjf92cASs1johoFZR9tbEFfofxNhA7trhTXQiqkTZotVNBJUgGY7uCbndeCzXqQshmYTjoQueKcARjGPdiC');

// BCH Wallet
bchXpubs.push('xpub6CJeoNR7qtMjr2bab19C5vUBFR8PZSGJiPYNuqivQBjYQooxJnJnoaKUNG1tXAbcTXz56YE4msdn6RQjk97fsjaLPxexyde8P52RYzwDAe7');
bchXpubs.push('xpub6CKGppfqJHwiLH3nXhW2udubBppyZpxEP9x7MobNKjaqvCdoNVAH36WvM9LZkf5UZ6oHxbhz4b63vmMZtjjqC58LBP3C4zWdcSDqef1w8oR');
bchXpubs.push('xpub6DBza8v826yuU83Z9hZhG6NyGrhu4BqDBo8wobRB4hZBuJTidomVL3xNanmAszADE81NVGvgRYf5hNvmvc6nhSDJSq9ZBdmuTiSD2t5RG9M');

// LTC
// ltcXpubs.push();
// ltcXpubs.push();
// ltcXpubs.push();

async function create() {
    await mongoose.connect(config.db, {
        socketTimeoutMS: 0,
        keepAlive: true,
        reconnectTries: 30
    });
    const promises = [];
    const BTCWallet = new Wallet({
        keys: btcXpubs,
        minSigs: 2,
        basePath: 'm/0',
        addressIndex: 0,
        currency: 'BTC'
    });
    promises.push(BTCWallet.save());
    const BCHWallet = new Wallet({
        keys: bchXpubs,
        minSigs: 2,
        basePath: 'm/0',
        addressIndex: 0,
        currency: 'BCH'
    });
    promises.push(BCHWallet.save());
    // const LTCWallet = new Wallet({
    //     keys: ltcXpubs,
    //     minSigs: 2,
    //     basePath: 'm/0',
    //     addressIndex: 0,
    //     currency: 'LTC'
    // });
    // promises.push(LTCWallet.save());
    await Promise.all(promises);
    console.log('done');
}

create();
