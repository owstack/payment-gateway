const sinon = require('sinon');
const chai = require('chai');
chai.should();

const jwt = require('jsonwebtoken');

const Service = require('../lib/service');
const config = require('config');
const service = new Service(config);
const pkg = require('../package.json');

const coins = require('../lib/coins');

const request = require('supertest');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const RpcClient = require('@owstack/bitcoind-rpc');

const Wallet = require('../models/wallet');

async function createWallet(currencyCode) {
    const xpubs = [];
    if (currencyCode === 'BTC') {
        xpubs.push('xpub6DVhME6zTr9hbTxXonFnR8ivJSGgBeWjYU9JNHGmyGqv4FcE8D8v6VCoxXvbady7BzTYtpS6uwSWkzC3fZ7n4zRavj5MAsBc7rsQTxioqdo');
        xpubs.push('xpub6BunPg6rKmoixwdqDZ3jW3TRbuH9NYSV4JUcATag3TY2GTZyA8TVtpom7smUyTyArLzvwG7s1Vpq3RMtazFmwjnKYCZGUcgfTVfCppCfACm');
    } else {
        // from bitcoin.com wallet/server
        // xpubs.push('xpub6CxAGMrgZahq1YAcA6Sx9obphTtz1Qx6U96jm7pZJ4emuUhKwPoV5R8UrsPdkDR6gKJPNmsdTuRz6cfqgarbZdYehH4UFCqQkAfatXUACMw');
        // xpubs.push('xpub6DTKxsGfArmY2wCKqkqFo7xQPLxgZLaXBXU4Ljya6b1N4eLAxv8k9xtAzakzwMc1rDrEvfXTq84src3JTV5DQmxtKKmJYwADL5Dg8xpJL6Q');
        xpubs.push('xpub6BzEZ5dQCqDXyhsf7iELMgtcrT46rCxsmmoTgHrMxy8WpwkkH7LhJUk6FgSCrGt73zQ3419C9y7nCzo2qhDX8CRqKv7hhEcep6NRDiUZ9ee');
        xpubs.push('xpub6CjBNCBNyjhuZfWc8WnrqDezz9h5sweSHZw95GEh7iL9hPc2yBDeQy3wEEFihDxnTLwQpGp9qvD8RGHjMbDuWDLRFr97z6kgDGtdUwfj3Vz');

    }
    // console.log(xpubs);
    const wallet = new Wallet({
        keys: xpubs,
        minSigs: 2,
        basePath: 'm/0',
        addressIndex: 0,
        currency: currencyCode
    });
    // console.log(wallet);
    return wallet.save();
}

describe(pkg.name, function () {

    before(function () {
        sinon.stub(RpcClient.prototype, 'estimateFee').callsFake((blocks, cb) => {
            cb(null, {result: 1});
        });
        sinon.stub(RpcClient.prototype, 'estimateSmartFee').callsFake((blocks, cb) => {
            cb(null, {result: 1});
        });
        return service.start();
    });

    after(function () {
        return service.stop();
    });

    let createdId;

    describe('Address Generation:', function () {
        before(async function () {
            try {
                await createWallet('BTC');
                await createWallet('BCH');
                await createWallet('LTC');
            } catch (e) {
                console.error(e);
            }
            // const wallets = await Wallet.find({}).exec();
            // console.log(wallets);
        });

        it('should generate multisig BTC addresses in the same manner as Copay', async function () {
            const copayAddresses = [
                '36xCkmfMgDs5y4gkHpko8ybYFen3SMsgGQ',
                '3KHbi1e8XMSW2UvCmndSfcoKja5owezs6t',
                '39c3Sp8n3yu4biLMqnhkDisY849zcF1FVU'
            ];
            const address0 = await coins.generatePaymentAddress('BTC');
            (address0.address.toString()).should.equal(copayAddresses[0]);
            const address1 = await coins.generatePaymentAddress('BTC');
            (address1.address.toString()).should.equal(copayAddresses[1]);
            const address2 = await coins.generatePaymentAddress('BTC');
            (address2.address.toString()).should.equal(copayAddresses[2]);
        });

        it('should generate multisig BCH addresses in the same manner as Copay', async function () {
            const bitpayCashAddresses = [
                'prxevgrpaxlht9hddsm6c8xah948q9592g4rvxlvhr',
                'pr60t8re5eddc0junjntyxmugglqv9kseyf0cvpwk4',
                'pp4znae60zqlhl3gx5v5x3g2s35plcsthyag7j66qj'
            ];
            const address0 = await coins.generatePaymentAddress('BCH');
            const address1 = await coins.generatePaymentAddress('BCH');
            const address2 = await coins.generatePaymentAddress('BCH');

            (address0.address.toCashaddrString()).should.equal(`bitcoincash:${bitpayCashAddresses[0]}`);
            (address1.address.toCashaddrString()).should.equal(`bitcoincash:${bitpayCashAddresses[1]}`);
            (address2.address.toCashaddrString()).should.equal(`bitcoincash:${bitpayCashAddresses[2]}`);
        });
    });

    describe('Routes:', function () {

        after(function () {
            return Wallet.remove({}).exec();
        });

        describe('POST /', function () {
            it('should create a payment request for the user', function () {
                const token = jwt.sign({sub: 'foo'}, 'test');
                return request(service.server.listener)
                    .post('/')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                        currency: 'USD',
                        amount: '0.50',
                        memo: '$0.50 Test TX',
                        ref: 'inv: 123'
                    })
                    .set('Accept', 'application/json')
                    .expect(200)
                    .then((res) => {
                        (res.body).should.exist;
                        createdId = res.body._id;
                        // console.log(JSON.stringify(res.body, null, 2));
                    });
            });

            it('should provide a 400 error on improper requests', function () {
                const token = jwt.sign({sub: 'foo'}, 'test');
                return request(service.server.listener)
                    .post('/')
                    .set('Authorization', `Bearer ${token}`)
                    .send({})
                    .set('Accept', 'application/json')
                    .expect(400);
            });
        });

        describe('GET /{id}', function () {
            it('should get a payment request in json format', function () {
                return request(service.server.listener)
                    .get(`/${createdId}`)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .then((res) => {
                        res.body.should.exist;
                    });
            });

            it('should get a payment request in bitcoincash-paymentrequest format', function () {
                return request(service.server.listener)
                    .get(`/${createdId}`)
                    .set('Accept', 'application/bitcoincash-paymentrequest')
                    .expect(200)
                    .then((res) => {
                        res.body.should.exist;
                        const body = coins.BCH.paypro.PaymentRequest.decode(res.body);
                        const payReq = new coins.BCH.paypro().makePaymentRequest(body);
                        const verified = payReq.verify();
                        (verified).should.be.true;
                    });
            });

            it('should get a payment request in litecoin-paymentrequest format', function () {
                return request(service.server.listener)
                    .get(`/${createdId}`)
                    .set('Accept', 'application/litecoin-paymentrequest')
                    .expect(200)
                    .then((res) => {
                        res.body.should.exist;
                        const body = coins.LTC.paypro.PaymentRequest.decode(res.body);
                        const payReq = new coins.LTC.paypro().makePaymentRequest(body);
                        const verified = payReq.verify();
                        (verified).should.be.true;
                    });
            });

            it('should get a payment request in bitcoin-paymentrequest format', function () {
                return request(service.server.listener)
                    .get(`/${createdId}`)
                    .set('Accept', 'application/bitcoin-paymentrequest')
                    .expect(200)
                    .then((res) => {
                        res.body.should.exist;
                        const body = coins.BTC.paypro.PaymentRequest.decode(res.body);
                        const payReq = new coins.BTC.paypro().makePaymentRequest(body);
                        const verified = payReq.verify();
                        (verified).should.be.true;
                    });
            });
        });

        describe('POST /{id}', function () {
            it('should accept payment', function () {

            });
        });
    });

});
