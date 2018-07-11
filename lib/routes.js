const Joi = require('joi');
const config = require('config');

const controller = require('./controller');

const routes = [
    {
        method: 'POST',
        path: '/',
        config: {
            handler: controller.createPaymentRequest,
            description: 'Create a payment request',
            tags: ['api'],
            validate: {
                headers: Joi.object({
                    authorization: Joi.string()
                        .required()
                        .description('Supply a Bearer token prefixed with the word Bearer and a single space')
                }).options({allowUnknown: true}),
                payload: Joi.object({
                    currency: Joi.string().required().valid(config.currencies).description('The requested currency'),
                    amount: Joi.number().positive().required().description('The requested amount'),
                    memo: Joi.string().optional().description('Optionally add a note to describe this request'),
                    ref: Joi.string().optional().description('Optionally provide a reference to an external resource (id)')
                })
            }
        }
    },
    {
        method: 'GET',
        path: '/{id}',
        config: {
            handler: controller.viewPaymentRequest,
            description: 'Get a payment request',
            tags: ['api'],
            validate: {
                headers: Joi.object({
                    accept: Joi.string()
                        .valid([
                            'application/json',
                            'application/bitcoin-paymentrequest', // BIP 71 MIME type
                            'application/bitcoincash-paymentrequest', // BIP 71 MIME type modified for bitcoincash
                            'application/litecoin-paymentrequest', // BIP 71 MIME type modified for litecoin
                            'application/payment-request', // BitPay jsonPaymentProtocol format (currency agnostic)
                        ])
                        .required()
                        .description('Set the accept header to specify the format of the payment request')
                }).options({allowUnknown: true}),
                params: {
                    id: Joi.string().required().description('The id for the payment request')
                }
            }
        }
    },
    {
        method: 'POST',
        path: '/{id}',
        config: {
            handler: controller.receivePayment,
            description: 'Send a payment to an open payment request',
            tags: ['api'],
            validate: {
                headers: Joi.object({
                    'Content-Type': Joi.string().valid([
                        'application/bitcoin-payment', // BIP 71 Mime Type
                        'application/bitcoincash-payment', // BIP 71 MIME type modified for bitcoincash
                        'application/litecoin-payment', // BIP 71 MIME type modified for litecoin
                        'application/payment' // BitPay jsonPaymentProtocol format (json)
                    ]).required().description('The incoming payment format')
                }).options({allowUnknown: true}),
                payload: Joi.alternatives().try(Joi.binary(), Joi.object({
                    currency: Joi.string().optional().description('The payment currency'),
                    transactions: Joi.array().items(Joi.string().required().description('The signed tx')).min(1).unique().required()
                })).required().description('Either a binary BIP70 style payment message, or a JSON object containing payment')
            }
        }
    }
];

module.exports = routes;
