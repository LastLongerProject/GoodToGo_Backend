const config=require("../../../../config/config");
const dbUrl=require("../../../../config/config").dbUrl
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(dbUrl,config.dbOptions);
const {expect}=require('chai');
const googleSheet=require('../../../../helpers/summaryReport/viewFormat/googleSheet/handler');

describe("Test summaryReport/handler.js",(done)=>{
/*
    it('Test the List_Of_Containers_Not_Return_To_Goodtogo',(done)=>{
        googleSheet.List_Of_Containers_Not_Return_To_Goodtogo(157,'1_vtmYplfvF90i5wIqCd5m1OVPyakWNAWksUb4SMU4ik')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(30000)
    it('Test the List_Of_Containers_Be_Used',done=>{
        googleSheet.List_Of_Containers_Be_Used(157,'1_vtmYplfvF90i5wIqCd5m1OVPyakWNAWksUb4SMU4ik')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000)
    it('Test the List_Of_User_Of_Containers',done=>{
        googleSheet.List_Of_User_Of_Containers(157,'1_vtmYplfvF90i5wIqCd5m1OVPyakWNAWksUb4SMU4ik')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000)
    */
    it('Test the List_Of_Not_Return_Users',done=>{
        googleSheet.List_Of_Not_Return_Users([61,62,63,64,65,66,68,69,70,75,76,84,85,86,88,89,93,94,96,97,98,99,100,103],'1mf7tWw_bXQGZol1ksU9UTEYQN2BnyKHUrzb1onVFMM8')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000)
/*
    it('Test the List_Of_Summary_For_Store',done=>{
        googleSheet.List_Of_Summary_For_Store([61,62,63,64,65,66,68,69,70,75,76,84,85,86,88,89,93,94,96,97,98,99,100,103],'1vP0B6HGX-wcOvgq9njAIFjAXSQC5RnQwBw8L5lvuTx4','2019-10-21')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000);
    it('Test the List_Of_Rent_UnLogRent_Return_For_Store',done=>{
        googleSheet.List_Of_Rent_UnLogRent_Return_For_Store([61,62,63,64,65,66,68,69,70,75,76,84,85,86,88,89,93,94,96,97,98,99,100,103],'1vP0B6HGX-wcOvgq9njAIFjAXSQC5RnQwBw8L5lvuTx4','2019-10-21')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000);
    */
})