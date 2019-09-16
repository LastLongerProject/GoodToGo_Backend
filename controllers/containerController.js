const Container=require("../models/DB/containerDB")
module.exports={
    getAvailableContainerCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.ArrayOfStoreID.forEach(element => {
                StoreData[element]={};
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        req.ArrayOfStoreID.forEach(element => {
            if (!req.StoreData[element]['availableCount']){
                req.StoreData[element]['availableCount']={
                    '8':0,
                    '9':0
                };
            }
        });
        Container.find({
            'storeID':{'$in':req.ArrayOfStoreID},
            'typeCode':{'$in':[8,9]},
            'statusCode':1
        },(err,docs)=>{
            docs.forEach(doc=>{
                let data=doc._doc;
                req.StoreData[data.storeID]['availableCount'][data.typeCode]++
            })
            console.log(req.StoreData)
            next()
        })
    }
}