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

    describe('Routes:', function () {
        describe('POST /', function () {
            it('should create a payment request for the user', function () {
                const token = jwt.sign({sub: 'foo'}, 'test');
                return request(service.server.listener)
                    .post('/')
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                        currency: 'USD',
                        amount: 5.00,
                        memo: 'Test TX',
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
                        // console.log(JSON.stringify(res.body, null, 2));
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
