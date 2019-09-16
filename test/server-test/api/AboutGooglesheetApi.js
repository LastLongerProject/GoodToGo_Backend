const config=require("../../../config/config");
const dbUrl=require("../../../config/config").dbUrl
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(dbUrl,config.dbOptions)
const request=require('supertest');
const {expect}=require('chai');
const mocksHttp=require('node-mocks-http');
const googleMiddleware=require("../../../helpers/gcp/sheet");
const TradeController=require('../../../controllers/tradeController');
const UserOrderController=require('../../../controllers/userOrderController')

/*
describe('Test',(done)=>{
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
*/
describe('Get data from Google Sheet.',(done)=>{

    it("Get storeID that can be read by Store Manager.",(done)=>{
        let req=mocksHttp.createRequest({sheetIDtoGetStoreID:config.google.storeID_sheet_for_Huiqun});
        let res=mocksHttp.createResponse();
        googleMiddleware.getStoreID(req,res,(err)=>{
            if (err) done(err);
            expect(req).to.have.property('ArrayOfStoreID')
            expect(req.ArrayOfStoreID).to.eql(
                [
                    61,
                    62,
                    63,
                    64,
                    65,
                    66,
                    68,
                    69,
                    70,
                    75,
                    76,
                    84,
                    85,
                    86,
                    88,
                    89,
                    93,
                    94,
                    96,
                    97,
                    98
                        ])
            done()
        })
    }).timeout(50000);


    it("Get sign count from TradeDB.",(done)=>{
        let req=mocksHttp.createRequest({ArrayOfStoreID:[62]})
        let res=mocksHttp.createResponse()
        TradeController.getSignCountByStoreID(req,res,(err)=>{
            if (err) done(err)
            expect(req.StoreData[62].Sign[8]).to.be.a('number')
            expect(req.StoreData[62].Sign[9]).to.be.a('number')
            done()
        })
    }).timeout(15000);



    it("Get rent count from TradeDB.",(done)=>{
        let req=mocksHttp.createRequest({ArrayOfStoreID:[61,62]})
        let res=mocksHttp.createResponse()
        TradeController.getRentCountByStoreID(req,res,(err)=>{
            if (err) done(err)
            expect(req.StoreData[61].Rent[8]).to.be.a('number')
            expect(req.StoreData[61].Rent[9]).to.be.a('number')
            done()
        })
    }).timeout(15000);



    it("Get return count from TradeDB.",(done)=>{
        let req=mocksHttp.createRequest({ArrayOfStoreID:[61,62]})
        let res=mocksHttp.createResponse()
        TradeController.getReturnCountByStoreID(req,res,(err)=>{
            if (err) done(err)
            expect(req.StoreData[61].Return[8]).to.be.a('number')
            expect(req.StoreData[61].Return[9]).to.be.a('number')
            done()
        })
    }).timeout(15000);

    it("Get null count from UserDB.",(done)=>{
        let req=mocksHttp.createRequest({ArrayOfStoreID:[61,62]})
        let res=mocksHttp.createResponse()
        UserOrderController.getNullCountByStoreID(req,res,(err)=>{
            if(err) done(err)
            expect(req.StoreData[61].nullCount).to.be.a('number')
            done()
        })
    })
})