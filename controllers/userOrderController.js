const UserOrder=require("../models/DB/userOrderDB")

module.exports={
    getNullCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.ArrayOfStoreID.forEach(element => {
                StoreData[element]={};
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        req.ArrayOfStoreID.forEach(element => {
            if (!req.StoreData[element].nullCount){
                req.StoreData[element]['nullCount']=0;
            }
        });
        UserOrder.find({
            'storeID':{'$in':req.ArrayOfStoreID},
            'containerID':null
        },(err,docs)=>{
            if(err) next(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                req.StoreData[data.storeID]['nullCount']++
            })
            console.log(req.StoreData)
            next()
        })
    }
}