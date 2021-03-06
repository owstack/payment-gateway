# Payment Gateway

The Payment Gateway allows creation of Payment Requests, and accepts payments in BCH, BTC, and LTC.

Payment Requests can be priced in USD and conversion rates will be provided by the [Rate Service](https://github.com/owstack/rate-service).

Transactions are broadcast through the Explorer API for each currency. The Explorer API also provides confirmations.

### Address Generation

This system allows for multiple "wallets" to be registered, each of which is a set of HD Public Keys and Path to use for generating addresses for a particular currency.

To support multisig addresses, this system allows multiple public keys to be used with a number of signatures required. These settings should be compatible with Copay based wallets.
