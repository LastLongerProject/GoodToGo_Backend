const Container=require("../models/DB/containerDB")

/*Data formate for total=
{
    storeID:{
        tradeType:{
            containerType:Number
        }
    }
}
*/

module.exports={
    getAvailableContainerCountByStoreID:(req,res,next)=>{
        //if dataset is null , then init req.dataset.
        if (!req.StoreTotalData){
            let StoreTotalData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreTotalData[element]={};
            });
            req.StoreTotalData=StoreTotalData;
        }// end of init req.dataset

        // Check every store you want to get data from in req.StoreTotalData
        // And init every object about store in req.StoreTotalData
        req.body.ArrayOfStoreID.forEach(element => {
            if (!req.StoreTotalData[element]['availableCount']){
                req.StoreTotalData[element]['availableCount']={
                    '8':0,
                    '9':0
                };
            }
        });
        //This time, the req.StoreTotalData is like follow example.
        /*
        req.StoreTotalData=
        {
            "61":{
                available:{
                    "8":0,
                    "9":0
                }
            },
            "62":{
                available:{
                    "8":0,
                    "9":0
                }
            },
            .
            .
            .
        }
        */
        Container.find({
            'storeID':{'$in':req.body.ArrayOfStoreID},
            'typeCode':{'$in':[8,9]},
            'statusCode':1
        },(err,docs)=>{
            if (err) next(err);
            docs.forEach(doc=>{
                let data=doc._doc;//The data we want to get is in response._doc from mongoDB.
                req.StoreTotalData[data.storeID]['availableCount'][data.typeCode]++
            })
            next()
        })
    }
}