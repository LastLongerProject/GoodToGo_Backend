const config=require("../../../../config/config");
const dbUrl=require("../../../../config/config").dbUrl
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(dbUrl,config.dbOptions);
const {expect}=require('chai');
const googleSheet=require('../../../../helpers/summaryReport/viewFormat/googleSheet/handler');

describe("Test summaryReport/handler.js",(done)=>{
    it('Test the List_Of_Containers_Not_Return_To_Goodtogo',(done)=>{
        googleSheet.List_Of_Containers_Not_Return_To_Goodtogo(95,'1x8Sb6HJ8PCrOujFc_TCFcxZflBpcMWZfUUehJhaGSfc')
        .then(res=>{
            expect(res.status).to.equal(200);
            done()
        })
    }).timeout(30000)
    it('Test the List_Of_Containers_Be_Used',done=>{
        googleSheet.List_Of_Containers_Be_Used(95,'1x8Sb6HJ8PCrOujFc_TCFcxZflBpcMWZfUUehJhaGSfc')
        .then(res=>{
            expect(res.status).to.equal(200);
            done()
        })
    }).timeout(10000)
    it('Test the List_Of_User_Of_Containers',done=>{
        googleSheet.List_Of_User_Of_Containers(95,'1x8Sb6HJ8PCrOujFc_TCFcxZflBpcMWZfUUehJhaGSfc')
        .then(res=>{
            expect(res.status).to.equal(200);
            done()
        })
    }).timeout(10000)
    it('Test the List_Of_Not_Return_Users',done=>{
        googleSheet.List_Of_Not_Return_Users(95,'1x8Sb6HJ8PCrOujFc_TCFcxZflBpcMWZfUUehJhaGSfc')
        .then(res=>{
            expect(res.status).to.equal(200);
            done()
        })
    }).timeout(30000)
})