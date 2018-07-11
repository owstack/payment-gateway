const fs = require('fs');
const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || 'development';

module.exports = {
    db: process.env.DB_CONN_STRING || `mongodb://localhost:27017/payment-gateway-${environment}`,
    externalHostname: process.env.EXTERNAL_HOSTNAME || 'localhost',
    xpub: process.env.XPUB,
    x509: {
        cert: fs.readFileSync(process.env.X509_DER_CERTIFICATE || './zerossl/payments.owstack.org.der'),
        key: fs.readFileSync(process.env.X509_PRIVATE_KEY || './zerossl/payments.owstack.org.key')
    },
    markup: Number(process.env.MARKUP) || 0.01,
    rates: {
        BTCUSD: process.env.RATES_BTCUSD || 'http://rates.owstack.org/convert/gdax,bitstamp/btcusd',
        BCHUSD: process.env.RATES_BCHUSD || 'http://rates.owstack.org/convert/gdax,bitstamp/bchusd',
        LTCUSD: process.env.RATES_LTCUSD || 'http://rates.owstack.org/convert/gdax,bitstamp/ltcusd'
    },
    currencies: ['USD', 'BTC', 'BCH', 'LTC'],
    networkRPC: {
        BTC: {
            host: process.env.BTC_RPC_HOST || 'http://btc-mainnet-bitcoin-core',
            user: process.env.BTC_RPC_USER,
            pass: process.env.BTC_RPC_PASS,
            port: Number(process.env.BTC_RPC_PORT) || 8332,
            feeEstimateCommand: 'estimateFee'
        },
        BCH: {
            host: process.env.BCH_RPC_HOST || 'http://bch-mainnet-bitcoin-abc',
            user: process.env.BCH_RPC_USER,
            pass: process.env.BCH_RPC_PASS,
            port: Number(process.env.BCH_RPC_PORT) || 8332,
            feeEstimateCommand: 'estimateSmartFee'
        },
        LTC: {
            host: process.env.LTC_RPC_HOST || 'http://ltc-mainnet-litecoin',
            user: process.env.LTC_RPC_USER,
            pass: process.env.LTC_RPC_PASS,
            port: Number(process.env.LTC_RPC_PORT) || 9332,
            feeEstimateCommand: 'estimateSmartFee'
        }
    }
};
