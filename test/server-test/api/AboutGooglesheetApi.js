const Trade=require('../../../models/DB/tradeDB');
const {google}=require('googleapis');
const sheets=google.sheets('v4');
const request=require('supertest');
const should=require('should');
const makeHexString = require('../tool.js').makeHexString;
const jwt = require('jwt-simple');
const {expect}=require('chai');
const mocksHttp=require('node-mocks-http');
const googleMiddleware=require("../../../helpers/gcp/sheet");
const config=require("../../../config/config");

describe('Test',(done)=>{
    //before((done)=>{
        it('login',(done)=>{
            request('http://localhost:3030/').post('users/login')
            .set('Content-Type', 'application/json')
            .set('reqID','Postman_Testing')
            .set('reqTime', Date.now())
            .send({
                'phone':'0985895611',
                'password':'0723'
            })
            .expect(200)
            .end((err,res)=>{
                    console.log(res.body);
                    expect(res.status).to.equal(200);
                    done();
                })
        })
})

describe('Get data from Google Sheet.',(done)=>{

    it("Get storeID that can be read by Store Manager.",(done)=>{
        let req=mocksHttp.createRequest({sheetIDtoGetStoreID:config.google.storeID_sheet_for_Huiqun});
        let res=mocksHttp.createResponse();
        googleMiddleware.getStoreID(req,res,(err)=>{
            if (err) done(err);
            expect(req).to.have.property('ArrayOfStoreID')
            expect(req.ArrayOfStoreID).to.eql(
                [
                    '61',
                    '62',
                    '63',
                    '64',
                    '65',
                    '66',
                    '68',
                    '69',
                    '70',
                    '75',
                    '76',
                    '84',
                    '85',
                    '86',
                    '88',
                    '89',
                    '93',
                    '94',
                    '96',
                    '97',
                    '98'
                        ])
            done()
        })
    }).timeout(5000);
    it("Get detail data from TradeDB.",(done)=>{
        
        done()
    });
    it("Get detail data from UserOrderDB.",(done)=>{

        done()
    });
    it("Set complete dataset to google sheet.",(done)=>{

        done()
    });

})