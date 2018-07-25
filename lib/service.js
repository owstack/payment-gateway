const https = require('https');
const Hapi = require('hapi');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const pkg = require('../package.json');
const config = require('config');
const routes = require('./routes');
const HapiMongoose = require('./hapi-mongoose');

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
                if ('application/bitcoin-payment' === request.headers['content-type']) {
                    request.headers['content-type'] = 'application/octet-stream';
                    request.headers['x-content-type'] = 'application/bitcoin-payment';
                }

                return h.continue;
            }
        });
    }

    async start() {
        const swaggerOptions = {
            info: {
                title: `${pkg.name} API Documentation`,
                version: pkg.version
            },
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
        this.server.route(routes);

        return this.server.start();
    }

    stop() {
        return this.server.stop();
    }
}

module.exports = Service;
