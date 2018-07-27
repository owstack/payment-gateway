const https = require('https');
const Hapi = require('hapi');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const pkg = require('../package.json');
const config = require('config');
const routes = require('./routes');
const HapiMongoose = require('./hapi-mongoose');
const nodemailer = require('nodemailer');
const request = require('request-promise-native');

class Service {
    constructor(options) {
        this.server = Hapi.server({
            address: '0.0.0.0',
            autoListen: true,
            listener: https.createServer(config.https),
            port: options.port,
            host: options.externalHostname,
            tls: true
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
        if (config.externalPort !== 443) {
            swaggerHost = `${swaggerHost}:${config.externalPort}`;
        }
        const swaggerOptions = {
            info: {
                title: `${pkg.name} API Documentation`,
                version: pkg.version
            },
            schemes: ['https'],
            host: swaggerHost
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

        this.server.app.identityServicePublicKey = await request({
            method: 'GET',
            uri: `https://${config.identityService}/serverIdentity`,
            json: true
        });
        this.server.route(routes);

        return this.server.start();
    }

    stop() {
        return this.server.stop();
    }
}

module.exports = Service;
