const config=require("../../../../config/config");
const dbUrl=require("../../../../config/config").dbUrl
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(dbUrl,config.dbOptions);
const {expect}=require('chai');
const summary=require('../../../../helpers/summaryData/summary')

describe("Test summaryData/center.js",(done)=>{
    it('summary_Container_Not_Return function',(done)=>{
        let Containers_Not_Return=summary.Containers_Not_Return([21]);
        Containers_Not_Return.then(returnValue=>{
            console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);

    it('summary_Container_Not_Return function',(done)=>{
        let Containers_Be_Used=summary.Containers_Be_Used([21]);
        Containers_Be_Used.then(returnValue=>{
            console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);
    it('summary_Container_Not_Return function',(done)=>{
        let User_Of_Containers=summary.User_Of_Containers([21]);
        User_Of_Containers.then(returnValue=>{
            console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);
    it('summary_Container_Not_Return function',(done)=>{
        let Not_Return_Users=summary.Not_Return_Users([21]);
        Not_Return_Users.then(returnValue=>{
            console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);
})