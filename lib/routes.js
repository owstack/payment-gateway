const Joi = require('joi');
const config = require('config');

const controller = require('./controller');

const joiObjectAuthHeader = {};
joiObjectAuthHeader[config.authHeaders.id] = Joi.string().required().description('The unique id for the user. This header is set by the auth service.');

const routes = [
    {
        method: 'POST',
        path: '/',
        config: {
            handler: controller.createPaymentRequest,
            description: 'Create a payment request',
            notes: 'Requires a bearer token',
            tags: ['api', 'payment'],
            validate: {
                headers: Joi.object(joiObjectAuthHeader).options({allowUnknown: true}),
                payload: Joi.object({
                    currency: Joi.string().required().valid(config.currencies).description('The requested currency'),
                    amount: Joi.string().required().description('The requested amount'),
                    memo: Joi.string().optional().description('Optionally add a note to describe this request'),
                    ref: Joi.string().optional().description('Optionally provide a reference to an external resource (id)')
                }),
                failAction: async (request, h, err) => {
                    if (err.isJoi) {
                        console.log(err.message);
                    }
                    throw err;
                }
            }
        }
    },
    {
        method: 'GET',
        path: '/{id}',
        config: {
            handler: controller.viewPaymentRequest,
            description: 'Get a payment request',
            notes: 'Returned in multiple formats, depending on client headers',
            tags: ['api', 'payment'],
            validate: {
                headers: Joi.object({
                    accept: Joi.string()
                        .valid([
                            'application/json',
                            'application/bitcoin-paymentrequest', // BIP 71 MIME type
                            'application/bitcoincash-paymentrequest', // BIP 71 MIME type modified for bitcoincash
                            'application/litecoin-paymentrequest', // BIP 71 MIME type modified for litecoin
                            // 'application/payment-request', // BitPay jsonPaymentProtocol format (currency agnostic)
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
            notes: 'The server will broadcast this tx and send an acknowledgement',
            tags: ['api', 'payment']
        }
    }
];

module.exports = routes;
