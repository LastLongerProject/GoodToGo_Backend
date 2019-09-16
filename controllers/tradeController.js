const Trade=require('../models/DB/tradeDB');
module.exports={
    getSignCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        req.ArrayOfStoreID.forEach(element => {
            if (!req.StoreData[element].Sign){
                req.StoreData[element]['Sign']={
                    '8':0,//小器
                    '9':0//大器
                }
            }
        });
        Trade.find({
            '$or':[
                    {'tradeType.action':'Sign','newUser.storeID':{'$in':req.ArrayOfStoreID}},
                    ],
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                if(!req.StoreData[data.newUser.storeID][data.tradeType.action])  req.StoreData[data.newUser.storeID][data.tradeType.action]={}
                if(!req.StoreData[data.newUser.storeID][data.tradeType.action][data.container.typeCode]) 
                    req.StoreData[data.newUser.storeID][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreData[data.newUser.storeID][data.tradeType.action][data.container.typeCode]++
            })
            console.log(req.StoreData)
            next()
        })
    },

    getRentCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        req.ArrayOfStoreID.forEach(element => {
            if (!req.StoreData[element].Rent){
                req.StoreData[element]['Rent']={
                    '8':0,
                    '9':0
                }
            }
        });
        Trade.find({
            '$or':[
                    {'tradeType.action':'Rent','oriUser.storeID':{'$in':req.ArrayOfStoreID}},
                    ],
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                if(!req.StoreData[data.oriUser.storeID][data.tradeType.action])  req.StoreData[data.oriUser.storeID][data.tradeType.action]={}
                if(!req.StoreData[data.oriUser.storeID][data.tradeType.action][data.container.typeCode]) 
                    req.StoreData[data.oriUser.storeID][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreData[data.oriUser.storeID][data.tradeType.action][data.container.typeCode]++
            })
            console.log(req.StoreData)
            next()
        })
    },

    getReturnCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        req.ArrayOfStoreID.forEach(element => {
            if (!req.StoreData[element].Return){
                req.StoreData[element]['Return']={
                    '8':0,
                    '9':0
                }
            }
        });
        Trade.find({
            '$or':[
                    {'tradeType.action':'Return','newUser.storeID':{'$in':req.ArrayOfStoreID}},
                    ],
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                if(!req.StoreData[data.newUser.storeID][data.tradeType.action])  req.StoreData[data.newUser.storeID][data.tradeType.action]={}
                if(!req.StoreData[data.newUser.storeID][data.tradeType.action][data.container.typeCode]) 
                    req.StoreData[data.newUser.storeID][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreData[data.newUser.storeID][data.tradeType.action][data.container.typeCode]++
            })
            console.log(req.StoreData)
            next()
        })
    }
}