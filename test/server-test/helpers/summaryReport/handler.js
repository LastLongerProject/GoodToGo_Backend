const config=require("../../../../config/config");
const dbUrl=require("../../../../config/config").dbUrl
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(dbUrl,config.dbOptions);
const {expect}=require('chai');
const googleSheet=require('../../../../helpers/summaryReport/viewFormat/googleSheet/handler');

describe("Test summaryReport/handler.js",(done)=>{

    it('Test the List_Of_Containers_Not_Return_To_Goodtogo',(done)=>{
        googleSheet.List_Of_Containers_Not_Return_To_Goodtogo([92],'1uVe1sq6JZivJGC6yH7-UQz3f-5_Wo1xFralldAPtxTA','2019-09-01','2019-12-31')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(30000)

    it('Test the List_Of_Containers_Be_Used',done=>{
        googleSheet.List_Of_Containers_Be_Used([92],'1uVe1sq6JZivJGC6yH7-UQz3f-5_Wo1xFralldAPtxTA','2019-09-01')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })

    }).timeout(10000)

       it('Test the List_Of_User_Of_Containers',done=>{
        googleSheet.List_Of_User_Of_Containers([92],'1uVe1sq6JZivJGC6yH7-UQz3f-5_Wo1xFralldAPtxTA','2019-09-01','2019-12-31')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000)

    it('Test the List_Of_Not_Return_Users',done=>{
        googleSheet.List_Of_Not_Return_Users([92],'1uVe1sq6JZivJGC6yH7-UQz3f-5_Wo1xFralldAPtxTA','2019-09-01','2019-12-31')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000)
    it('Test the List_Of_StatusCode_1_Container',done=>{
        googleSheet.List_Of_StatusCode_1_Container([92],'1uVe1sq6JZivJGC6yH7-UQz3f-5_Wo1xFralldAPtxTA','2019-09-01','2019-12-31')
        .then(res=>{
            console.log(res)
            expect(res[1].status).to.equal(200);
            done()
        })
    }).timeout(10000)
    it('Test the List_Of_StatusCode_3_Container',done=>{
        googleSheet.List_Of_StatusCode_3_Container([92],'1uVe1sq6JZivJGC6yH7-UQz3f-5_Wo1xFralldAPtxTA','2019-09-01','2019-12-31')
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