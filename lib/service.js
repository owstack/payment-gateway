const http = require('http');
const Hapi = require('hapi');
const SocketIO = require('socket.io');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const pkg = require('../package.json');
const config = require('config');
const routes = require('./routes');
const HapiMongoose = require('./hapi-mongoose');
const nodemailer = require('nodemailer');

class Service {
    constructor(options) {
        this.server = Hapi.server({
            address: '0.0.0.0',
            autoListen: true,
            listener: http.createServer(),
            port: options.port,
            host: options.externalHostname
        });
        this.server.ext({
            type: 'onRequest',
            method: function (request, h) {
                // TODO: correctly add this mime type to hapi instead of this hack
                if ('application/bitcoin-payment' === request.headers['content-type']) {
                    request.headers['content-type'] = 'application/octet-stream';
                    request.headers['x-content-type'] = 'application/bitcoin-payment';
                } else if ('application/bitcoincash-payment' === request.headers['content-type']) {
                    request.headers['content-type'] = 'application/octet-stream';
                    request.headers['x-content-type'] = 'application/bitcoincash-payment';
                } else if ('application/litecoin-payment' === request.headers['content-type']) {
                    request.headers['content-type'] = 'application/octet-stream';
                    request.headers['x-content-type'] = 'application/litecoin-payment';
                }

                return h.continue;
            }
        });
    }

    async start() {
        let swaggerHost = config.externalHostname;
        if (config.externalPort !== 80) {
            swaggerHost = `${swaggerHost}:${config.externalPort}`;
        }
        const swaggerOptions = {
            info: {
                title: `${pkg.name} API Documentation`,
                version: pkg.version
            },
            host: swaggerHost,
            tags: [
                {
                    name: 'payment',
                    description: 'the payment api'
                }
            ],
            grouping: 'tags',
            proxyPath: config.proxyPath
        };
        await this.server.register([
            Inert,
            Vision,
            {
                plugin: HapiSwagger,
                options: swaggerOptions
            },
            {
                plugin: HapiMongoose,
                options: {
                    uri: config.db
                }
            }
        ]);
        this.server.app.mailService = nodemailer.createTransport(config.smtp);
        this.server.app.io = SocketIO(this.server.listener);
        this.server.route(routes);

        const Payment = require('../models/payment');
        Payment.watch({fullDocument: 'updateLookup'})
            .on('change', (data) => {
                if (data.operationType === 'update') {
                    const paymentRequest = new Payment(data.fullDocument);
                    const paymentRequestObject = paymentRequest.toJSON({virtuals: true});
                    this.server.app.io.emit(`${data.documentKey._id}`, {status: paymentRequestObject.status});
                }
            })
            .on('error', (error) => {
                console.error('Payment watcher error', error);
            })
            .on('end', () => {
                console.log('Payment watcher end');
            })
            .on('close', () => {
                console.log('Payment watcher close');
            });

        return this.server.start();
    }

    stop() {
        return this.server.stop();
    }
}

module.exports = Service;
