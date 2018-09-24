const fs = require('fs');
const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || 'development';

const certDir = process.env.CERT_DIR || `${__dirname}/../zerossl`;

const externalHostname = process.env.EXTERNAL_HOSTNAME || 'payments.owstack.org';
const port = Number(process.env.SERVICE_PORT) || 3000;

module.exports = {
    authHeaders: {
        email: process.env.AUTH_HEADER_EMAIL || 'x-user-auth-email',
        id: process.env.AUTH_HEADER_ID || 'x-user-auth-id'
    },
    paymentEmail: process.env.PAYMENT_EMAIL || 'SetPaymentEmailAddressInConfig',
    port,
    db: process.env.DB_CONN_STRING || `mongodb://localhost:27017/payment-gateway-${environment}`,
    externalHostname,
    externalPort: Number(process.env.EXTERNAL_PORT) || port,
    x509: {
        ca: fs.readFileSync(process.env.X509_CA_CERTIFICATE || `${certDir}/${externalHostname}.ca.der`),
        cert: fs.readFileSync(process.env.X509_DER_CERTIFICATE || `${certDir}/${externalHostname}.der`),
        key: fs.readFileSync(process.env.X509_PRIVATE_KEY || `${certDir}/${externalHostname}.key`)
    },
    markup: Number(process.env.MARKUP) || 0.01,
    rates: {
        BTCUSD: process.env.RATES_BTCUSD || 'http://rates.owstack.org/convert/gdax,bitstamp/btcusd',
        BCHUSD: process.env.RATES_BCHUSD || 'http://rates.owstack.org/convert/gdax,bitstamp/bchusd',
        LTCUSD: process.env.RATES_LTCUSD || 'http://rates.owstack.org/convert/gdax,bitstamp/ltcusd'
    },
    currencies: ['USD', 'BTC', 'BCH', 'LTC'],
    https: {
        key: fs.readFileSync(`${certDir}/${externalHostname}.key`),
        cert: fs.readFileSync(`${certDir}/${externalHostname}.crt`)
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USERNAME || 'apikey',
            pass: process.env.SMTP_PASSWORD || 'password'
        }
    },
    explorerAPIs: {
        BTC: process.env.BTC_EXPLORER_API || 'http://btc.livenet.explorer-api.owstack.org/explorer-api',
        BCH: process.env.BCH_EXPLORER_API || 'http://bch.livenet.explorer-api.owstack.org/explorer-api',
        LTC: process.env.LTC_EXPLORER_API || 'http://ltc.livenet.explorer-api.owstack.org/explorer-api'
    }
};
