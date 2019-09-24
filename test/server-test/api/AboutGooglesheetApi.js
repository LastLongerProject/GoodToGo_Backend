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
const ContainerController=require('../../../controllers/containerController')

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
            expect(req.body).to.have.property('ArrayOfStoreID')
            expect(req.body.ArrayOfStoreID).to.eql(
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
    }).timeout(15000);


    it("Get total sign count from TradeDB.",(done)=>{
        let req=mocksHttp.createRequest();
        let res=mocksHttp.createResponse();
        req.body.ArrayOfStoreID=[61];
        TradeController.getSignCountByStoreID(req,res,(err)=>{
            if (err) done(err)
            expect(req.StoreTotalData[61].Sign[8]).to.be.a('number')
            expect(req.StoreTotalData[61].Sign[9]).to.be.a('number')
            done()
        })
    }).timeout(15000);



    it("Get total rent count from TradeDB.",(done)=>{
        let req=mocksHttp.createRequest();
        let res=mocksHttp.createResponse();
        req.body.ArrayOfStoreID=[61];
        TradeController.getRentCountByStoreID(req,res,(err)=>{
            if (err) done(err);
            expect(req.StoreTotalData[61].Rent[8]).to.be.a('number');
            expect(req.StoreTotalData[61].Rent[9]).to.be.a('number');
            done();
        })
    }).timeout(15000);


    it("Get available count from ContainerDB.",(done)=>{
        let req=mocksHttp.createRequest()
        let res=mocksHttp.createResponse()
        req.body.ArrayOfStoreID=[61]
        ContainerController.getAvailableContainerCountByStoreID(req,res,(err)=>{
            if(err) done(err)
            expect(req.StoreTotalData[61].availableCount[8]).to.be.a('number')
            expect(req.StoreTotalData[61].availableCount[9]).to.be.a('number')
            done()
        })
    }).timeout(15000);




    it("Get everyweek null count from UserDB.",(done)=>{
        let req=mocksHttp.createRequest()
        let res=mocksHttp.createResponse()
        req.body.ArrayOfStoreID=[61]
        UserOrderController.getEveryWeekNullCountByStoreID(req,res,(err)=>{
            if(err) done(err)
            expect(req.StoreWeeklyData[61]['2019 M09 2']['nullCount']).to.be.a('number')
            done()
        })
    }).timeout(15000);





    it("Get any type count you want to get from TradeDB",(done)=>{
        let req=mocksHttp.createRequest();
        let res=mocksHttp.createResponse();
        req.body.typeYouWantToGet=['Sign','Rent','Return'];
        req.body.ArrayOfStoreID=[61,62,63]
        TradeController.getEveryWeekCountByStoreID(req,res,err=>{
            if(err) {
                console.log(err)
                done(err)
            }
            expect(req).to.have.property('StoreWeeklyData');
            expect(req.StoreWeeklyData).to.have.property('61');
            expect(req.StoreWeeklyData).to.have.property('62');
            expect(req.StoreWeeklyData).to.have.property('63');
            expect(req.StoreWeeklyData[61]).to.have.property('2019 M09 2');
            expect(req.StoreWeeklyData[61]['2019 M09 2']).to.have.property('Sign');
            expect(req.StoreWeeklyData[61]['2019 M09 2']).to.have.property('Rent');
            expect(req.StoreWeeklyData[61]['2019 M09 2']).to.have.property('Return');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Sign']).to.have.property('8');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Rent']).to.have.property('8');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Return']).to.have.property('8');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Sign']).to.have.property('9');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Rent']).to.have.property('9');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Return']).to.have.property('9');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Sign']['8']).to.be.a('number');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Rent']['8']).to.be.a('number');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Return']['8']).to.be.a('number');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Sign']['9']).to.be.a('number');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Rent']['9']).to.be.a('number');
            expect(req.StoreWeeklyData[61]['2019 M09 2']['Return']['9']).to.be.a('number');
            done()
        })
    }).timeout(15000);




    it('Try to get complete data.',(done)=>{
        let req=mocksHttp.createRequest();
        let res=mocksHttp.createResponse();
        req.body.ArrayOfStoreID=[61,62,63];
        req.body.typeYouWantToGet=['Sign','Rent','Return'];
        TradeController.getSignCountByStoreID(req,res,err=>{
            if (err) {
                console.log(err);
                done(err);
            }
            TradeController.getRentCountByStoreID(req,res,err=>{
                if (err) {
                    console.log(err);
                    done(err);
                }
                TradeController.getEveryWeekCountByStoreID(req,res,err=>{
                    if (err) {
                        console.log(err);
                        done(err);
                    }
                    UserOrderController.getEveryWeekNullCountByStoreID(req,res,err=>{
                        if (err) {
                            console.log(err);
                            done(err);
                        }
                        ContainerController.getAvailableContainerCountByStoreID(req,res,err=>{
                            if (err) {
                                console.log(err);
                                done(err);
                            }
                            expect(req.StoreTotalData[61]['Sign']['8']).to.be.a('number');
                            expect(req.StoreTotalData[61]['Rent']['8']).to.be.a('number');
                            expect(req.StoreTotalData[61]['availableCount']['8']).to.be.a('number');
                            expect(req.StoreWeeklyData[61]['2019 M09 2']['Sign']['8']).to.be.a('number');
                            expect(req.StoreWeeklyData[61]['2019 M09 2']['Rent']['8']).to.be.a('number');
                            expect(req.StoreWeeklyData[61]['2019 M09 2']['Return']['8']).to.be.a('number');
                            expect(req.StoreWeeklyData[61]['2019 M09 2']['nullCount']).to.be.a('number');
                            console.log(req.StoreTotalData[61]);
                            console.log(req.StoreWeeklyData[61]);
                            done();
                        })
                    })
                })
            })
        })
    }).timeout(15000);


    it("Integrate data to the form Google Sheet API can use",(done)=>{
        let req=mocksHttp.createRequest();
        let res=mocksHttp.createResponse();
        req.body.ArrayOfStoreID=[61];
        req.body.typeYouWantToGet=['Sign','Rent','Return'];
        req.StoreTotalData={
            '61':{
                Sign:{'8':980,'9':170},
                Rent:{'8':120,'9':130},
                availableCount: { '8': 28, '9': 3 }
            }
        }
        req.StoreWeeklyData={
            '61':{
                '2019 M09 16': {
                    Sign: { '8': 110, '9': 0 },
                    Rent: { '8': 0, '9': 0 },
                    Return: { '8': 0, '9': 0 },
                    nullCount: 0
                  },
                '2019 M09 9': {
                    Sign: { '8': 10, '9': 0 },
                    Rent: { '8': 2, '9': 0 },
                    Return: { '8': 2, '9': 46 },
                    nullCount: 0
                  },
                '2019 M09 2': {
                    Sign: { '8': 120, '9': 50 },
                    Rent: { '8': 3, '9': 34 },
                    Return: { '8': 1, '9': 17 },
                    nullCount: 2
                  },
                '2019 M08 26': {
                    Sign: { '8': 0, '9': 0 },
                    Rent: { '8': 5, '9': 0 },
                    Return: { '8': 42, '9': 54 },
                    nullCount: 0
                  }
            }
        }
        googleMiddleware.integrateStoreDataToGoogleSheet(req,res,(err)=>{
            if (err) {
                console.error(err);
                done(err);
            }
            googleMiddleware.sendCompleteDataToGoogleSheet(req,res,(err)=>{
                if(err){
                    //console.error(err);
                    done(err);
                }
                expect(res.statusCode).to.equal(200);
                done()

            })
            

        })
    }).timeout(15000);

    it('Connect all function to set complete data to google sheet',(done)=>{
        let req=mocksHttp.createRequest({sheetIDtoGetStoreID:config.google.storeID_sheet_for_Huiqun});
        let res=mocksHttp.createResponse();
        req.body.typeYouWantToGet=['Sign','Rent','Return'];
        googleMiddleware.getStoreID(req,res,err=>{
            TradeController.getSignCountByStoreID(req,res,err=>{
                TradeController.getRentCountByStoreID(req,res,err=>{
                    TradeController.getEveryWeekCountByStoreID(req,res,err=>{
                        UserOrderController.getEveryWeekNullCountByStoreID(req,res,err=>{
                            ContainerController.getAvailableContainerCountByStoreID(req,res,err=>{
                                googleMiddleware.integrateStoreDataToGoogleSheet(req,res,err=>{
                                    googleMiddleware.sendCompleteDataToGoogleSheet(req,res,err=>{
                                        expect(res.statusCode).to.equal(200);
                                        done()
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    }).timeout(50000);


})