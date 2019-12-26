const config=require("../../../../config/config");
const dbUrl=require("../../../../config/config").dbUrl
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(dbUrl,config.dbOptions);
const {expect}=require('chai');
const summary=require('../../../../helpers/summaryData/summary')

describe("Test summaryData/center.js",(done)=>{
    it('summary_Container_Not_Return function',(done)=>{
        let Containers_Not_Return=summary.Containers_Not_Return([157]);
        Containers_Not_Return.then(returnValue=>{
            //console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);

    it('summary_Containers_Be_Used function',(done)=>{
        let Containers_Be_Used=summary.Containers_Be_Used([157]);
        Containers_Be_Used.then(returnValue=>{
            //console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);
    it('summary_User_Of_Containers function',(done)=>{
        let User_Of_Containers=summary.User_Of_Containers([157]);
        User_Of_Containers.then(returnValue=>{
            //console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);
    it('summary_Not_Return_Users function',(done)=>{
        let Not_Return_Users=summary.Not_Return_Users([157]);
        Not_Return_Users.then(returnValue=>{
            //console.log(returnValue);
            expect(returnValue).to.be.a('Array');
            done()
        })
    }).timeout(20000);
    it('Summary_Data_For_Store function',done=>{
        let summaryData=summary.Summary_Data_For_Store([157,134],new Date('2019-11-30'))
        summaryData.then(data=>{
            console.log(data.the_Date_Return_To_OriUser);
            console.log(data.Trades_For_Rent);
        })
    });
    it('User_Not_Return_For_Store function',done=>{
        let summaryData=summary.User_Not_Return_For_Store([157,134],new Date('2019-11-30'))
        summaryData.then(data=>{
            console.log(data);
        })
    });
    it('Rent_UnLogRent_Return_For_Store function',done=>{
        let summaryData=summary.Rent_UnLogRent_Return_For_Store([157,134],new Date('2019-11-30'))
        summaryData.then(data=>{
            console.log(data);
        })
    })
})