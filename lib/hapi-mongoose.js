const pkg = require('../package.json');
const mongoose = require( 'mongoose');
mongoose.Promise = global.Promise;

module.exports.plugin = {
    name: `${pkg.name}-storage`,
    version: '1.0.0',
    register: async function (server, options) {
        server.ext({
            type: 'onPreStart',
            method: async () => {
                await mongoose.connect(options.uri, {
                    socketTimeoutMS: 0,
                    keepAlive: true,
                    reconnectTries: 30
                });
            }
        });

        server.ext({
            type: 'onPreStop',
            method: async () => {
                await mongoose.disconnect();
            }
        });
        return Promise.resolve();
    }
};
