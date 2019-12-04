const config=require("../../../../config/config");
const dbUrl=require("../../../../config/config").dbUrl
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(dbUrl,config.dbOptions);
const {expect}=require('chai');
const googleSheet=require('../../../../helpers/summaryReport/viewFormat/googleSheet/handler');

describe("Test summaryReport/handler.js",(done)=>{
    it('Test the List_Of_Containers_Not_Return_To_Goodtogo',(done)=>{
        googleSheet.List_Of_Containers_Not_Return_To_Goodtogo(21)
    })
})