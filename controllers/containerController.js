const Container=require("../models/DB/containerDB")
module.exports={
    getAvailableContainerCountByStoreID:(req,res,next)=>{
        if (!req.StoreTotalData){
            let StoreTotalData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreTotalData[element]={};
            });
            req.StoreTotalData=StoreTotalData;
        }//if dataset is null , then init req.dataset.
        req.body.ArrayOfStoreID.forEach(element => {
            if (!req.StoreTotalData[element]['availableCount']){
                req.StoreTotalData[element]['availableCount']={
                    '8':0,
                    '9':0
                };
            }
        });
        Container.find({
            'storeID':{'$in':req.body.ArrayOfStoreID},
            'typeCode':{'$in':[8,9]},
            'statusCode':1
        },(err,docs)=>{
            if (err) next(err);
            docs.forEach(doc=>{
                let data=doc._doc;
                req.StoreTotalData[data.storeID]['availableCount'][data.typeCode]++
            })
            next()
        })
    }
}