require("should");
var PurchaseRequest = require("../../../data-util/purchasing/purchase-request-data-util");
var helper = require("../../../helper");
var moment = require('moment');

var PurchaseRequestManager = require("../../../../src/managers/purchasing/purchasing-request-manager");
var purchaseRequestManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    PurchaseRequest.getNewData()
        .then((data) => purchaseRequestManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
           
        }).then(() => done(), done)
        .catch((e) => {
            done(e);
        });
});

it('#02. should success when create pdf', function (done) {
    purchaseRequestManager.pdf(createdId, 7)
        .then(pdfData => {
            
        }).then(() => done(), done)
        .catch(e => {
            done(e);
        });
});

it("#03. should success when destroy all unit test data", function (done) {
    purchaseRequestManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            
        }).then(() => done(), done)
        .catch((e) => {
            done(e);
        });
});