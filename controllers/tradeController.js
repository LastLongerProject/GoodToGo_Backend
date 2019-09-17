const Trade=require('../models/DB/tradeDB');
const Day=24*60*60*1000;
const Hour=60*60*1000;
const Minute=60*1000;
const Second=1000;
const TypeOfAction=[
                    "ReadyToClean",
                    "Sign",
                    "Rent",
                    "Return",
                    "Boxing",
                    "CancelDelivery",
                    "Delivery",
                    "UnSign",
                    "Unboxing",
                    "UndoReadyToClean",
                    "UndoReturn"
                    ]
            

module.exports={
    getSignCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        req.body.ArrayOfStoreID.forEach(element => {
            if (!req.StoreData[element].Sign){
                req.StoreData[element]['Sign']={
                    '8':0,//小器
                    '9':0//大器
                }
            }
        });
        Trade.find({
            '$or':[
                    {'tradeType.action':'Sign','newUser.storeID':{'$in':req.body.ArrayOfStoreID}},
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
            req.body.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        req.body.ArrayOfStoreID.forEach(element => {
            if (!req.StoreData[element].Rent){
                req.StoreData[element]['Rent']={
                    '8':0,
                    '9':0
                }
            }
        });
        Trade.find({
            '$or':[
                    {'tradeType.action':'Rent','oriUser.storeID':{'$in':req.body.ArrayOfStoreID}},
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


    getEveryWeekSignCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);

        for(let i=thisMonday;i>=new Date('2017-11-01');i=i-7*Day){
            i=new Date(i)
            req.body.ArrayOfStoreID.forEach((storeID)=>{
                if(!req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]){
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]={
                        'Sign':{
                            '8':0,
                            '9':0
                        }
                    }
                }else if(!req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']){
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']={
                            '8':0,
                            '9':0
                        }
                    }
                else{
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']['8']=0;
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']['9']=0;
                }
            })
        }
        Trade.find({
            '$or':[
                    {'tradeType.action':'Sign','newUser.storeID':{'$in':req.body.ArrayOfStoreID}},
                    ],
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                let TradeTime=data.tradeTime
                let TradeTimeTemp=new Date(TradeTime-(TradeTime.getDay()-1)*Day)
                if(!req.StoreData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]) 
                    req.StoreData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]++
            })
            next()
        })
    },


    getEveryWeekRentCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);

        for(let i=thisMonday;i>=new Date('2017-11-01');i=i-7*Day){
            i=new Date(i)
            req.body.ArrayOfStoreID.forEach((storeID)=>{
                if(!req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]){
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]={
                        'Rent':{
                            '8':0,
                            '9':0
                        }
                    }
                }else if(!req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']){
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']={
                            '8':0,
                            '9':0
                        }
                    }
                else{
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']['8']=0;
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']['9']=0;
                }
            })
        }
        Trade.find({
            '$or':[
                    {'tradeType.action':'Rent','oriUser.storeID':{'$in':req.body.ArrayOfStoreID}},
                    ],
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                let TradeTime=data.tradeTime
                let TradeTimeTemp=new Date(TradeTime-(TradeTime.getDay()-1)*Day)
                if(!req.StoreData[data.oriUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]) 
                    req.StoreData[data.oriUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreData[data.oriUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]++
            })
            next()
        })
    },





    getEveryWeekReturnCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreData[element]={}
            });
            req.StoreData=StoreData;
        }//if dataset is null , then init req.dataset.
        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);
        //cacuulate this week Monday date


        for(let i=thisMonday;i>=new Date('2017-11-01');i=i-7*Day){
            i=new Date(i)
            req.body.ArrayOfStoreID.forEach((storeID)=>{
                if(!req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]){
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]={
                        'Return':{
                            '8':0,
                            '9':0
                        }
                    }
                }else if(!req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']){
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']={
                            '8':0,
                            '9':0
                        }
                    }
                else{
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']['8']=0;
                    req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']['9']=0;
                }
            })
        }
        Trade.find({
            '$or':[
                    {'tradeType.action':'Return','newUser.storeID':{'$in':req.body.ArrayOfStoreID}},
                    ],
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                let TradeTime=data.tradeTime
                let TradeTimeTemp=new Date(TradeTime-(TradeTime.getDay()-1)*Day)
                if(!req.StoreData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]) 
                    req.StoreData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]++
            })
            console.log(req.StoreData[61]['2019 M09 2'])
            next()
        })
    },

    getEveryWeekCountByStoreID:(req,res,next)=>{
        if(!req.StoreData) req.StoreData={};
        req.body.ArrayOfStoreID.forEach(storeID=>{
            if(!req.StoreData[storeID]) req.StoreData[storeID]={};
        })


        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);
        //cacuulate this week Monday date


        for(let i=thisMonday;i>=new Date('2017-11-01');i=i-7*Day){
            i=new Date(i)
            let DateString=i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' });
            req.body.ArrayOfStoreID.forEach(storeID=>{
                if(!req.StoreData[storeID][DateString]){
                    req.StoreData[storeID][DateString]={}
                    req.body.typeYouWantToGet.forEach(actionType=>{
                        req.StoreData[storeID][DateString][actionType]={
                            '8':0,
                            '9':0
                        }
                    })
                }else{
                    req.body.typeYouWantToGet.forEach(actionType=>{
                        if(!req.StoreData[storeID][DateString][actionType]){
                            req.StoreData[storeID][DateString][actionType]={
                                '8':0,
                                '9':0
                            }
                        }else if(!req.StoreData[storeID][DateString][actionType]['8']){
                            req.StoreData[storeID][DateString][actionType]['8']=0;
                        }else if(!req.StoreData[storeID][DateString][actionType]['8']){
                            req.StoreData[storeID][DateString][actionType]['9']=0;
                        }
                    })
                }
            })
        }

        Trade.find({
            '$or':[{'tradeType.action':{'$in':req.body.typeYouWantToGet},'newUser.storeID':{'$in':req.body.ArrayOfStoreID}},
                    {'tradeType.action':'Rent','oriUser.storeID':{'$in':req.body.ArrayOfStoreID}}
                    ],
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) next(err);
            docs.forEach(doc=>{
                let data=doc._doc;
                let TradeTime=data.tradeTime;
                let TradeTimeTemp=new Date(TradeTime-(TradeTime.getDay()-1)*Day);
                let TradeTimeTempString=TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' });
                if(data.tradeType.action==='Rent'){
                    req.StoreData[data.oriUser.storeID][TradeTimeTempString][data.tradeType.action][data.container.typeCode]++
                }else{
                    req.StoreData[data.newUser.storeID][TradeTimeTempString][data.tradeType.action][data.container.typeCode]++
                }
            })
            console.log(req.StoreData[61])
            next()
        })
    }
}