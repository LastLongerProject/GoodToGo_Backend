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
            
/*Data formate for total=
{
    storeID:{
        tradeType:{
            containerType:Number
        }
    }
}
*/
/*Data formate for weekly=
{
    storeID:{
        date:{
            tradeType:{
                containerType:Number
            }
        }
    }
}
*/
module.exports={
    getSignCountByStoreID:(req,res,next)=>{
        if (!req.StoreTotalData){
            let StoreTotalData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreTotalData[element]={}
            });
            req.StoreTotalData=StoreTotalData;
        }//if dataset is null , then init req.dataset.
        req.body.ArrayOfStoreID.forEach(element => {
            if (!req.StoreTotalData[element].Sign){
                req.StoreTotalData[element]['Sign']={
                    '8':0,//小器
                    '9':0//大器
                }
            }
        });
        //This time, the req.StoreTotalData is like follow example.
        /*
        req.StoreTotalData=
        {
            "61":{
                ...
                Sign:{
                    "8":0,
                    "9":0
                }
                ...
            },
            "62":{
                ...
                Sign:{
                    "8":0,
                    "9":0
                }
                ...
            },
            ...
        }
        */
        Trade.find({
            'tradeType.action':'Sign',
            'newUser.storeID':{'$in':req.body.ArrayOfStoreID},
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;//The data we want to get is in response._doc from mongoDB.
                req.StoreTotalData[data.newUser.storeID][data.tradeType.action][data.container.typeCode]++
            })
            next()
        })
    },

    getRentCountByStoreID:(req,res,next)=>{
        if (!req.StoreTotalData){
            let StoreTotalData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreTotalData[element]={}
            });
            req.StoreTotalData=StoreTotalData;
        }//if dataset is null , then init req.dataset.
        req.body.ArrayOfStoreID.forEach(element => {
            if (!req.StoreTotalData[element].Rent){
                req.StoreTotalData[element]['Rent']={
                    '8':0,//小器
                    '9':0//大器
                }
            }
        });
        //This time, the req.StoreTotalData is like follow example.
        /*
        req.StoreTotalData=
        {
            "61":{
                ...
                Sign:{
                    "8":0,
                    "9":0
                }
                ...
            },
            "62":{
                ...
                Sign:{
                    "8":0,
                    "9":0
                }
                ...
            },
            ...
        }
        */
        Trade.find({
            'tradeType.action':'Rent',
            'oriUser.storeID':{'$in':req.body.ArrayOfStoreID},
            'container.typeCode':{'$in':[8,9]},
        },(err,docs)=>{
            if(err) console.log(err)
            docs.forEach(doc=>{
                let data=doc._doc;//The data we want to get is in response._doc from mongoDB.
                req.StoreTotalData[data.oriUser.storeID][data.tradeType.action][data.container.typeCode]++
            })
            next()
        })
    },


    getEveryWeekCountByStoreID:(req,res,next)=>{
        if(!req.StoreWeeklyData) req.StoreWeeklyData={};
        req.body.ArrayOfStoreID.forEach(storeID=>{
            if(!req.StoreWeeklyData[storeID]) req.StoreWeeklyData[storeID]={};
        })
        let thisMonday=req.thisMonday;
        let StartTime=new Date('2019-6-31');
        for(let i=thisMonday;i>=StartTime;i=i-7*Day){
            i=new Date(i)
            let DateString=i.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit' });
            req.body.ArrayOfStoreID.forEach(storeID=>{
                if(!req.StoreWeeklyData[storeID][DateString]){
                    req.StoreWeeklyData[storeID][DateString]={}
                    req.body.typeYouWantToGet.forEach(actionType=>{
                        req.StoreWeeklyData[storeID][DateString][actionType]={
                            '8':0,
                            '9':0
                        }
                    })
                }else{
                    req.body.typeYouWantToGet.forEach(actionType=>{
                        if(!req.StoreWeeklyData[storeID][DateString][actionType]){
                            req.StoreWeeklyData[storeID][DateString][actionType]={
                                '8':0,
                                '9':0
                            }
                        }else if(!req.StoreWeeklyData[storeID][DateString][actionType]['8']){
                            req.StoreWeeklyData[storeID][DateString][actionType]['8']=0;
                        }else if(!req.StoreWeeklyData[storeID][DateString][actionType]['8']){
                            req.StoreWeeklyData[storeID][DateString][actionType]['9']=0;
                        }
                    })
                }
            })
        }
        //This time, the req.StoreTotalData is like follow example.
        /*
        req.StoreTotalData=
        {
            "61":{
                ...
                "2019 M09 16":{
                    Sign:{
                        "8":0,
                        "9":0
                    },
                    Rent:{
                        "8":0,
                        "9":0
                    },
                    Return:{
                        "8":0,
                        "9":0
                    }
                }
                ...
            },
            "62":{
                ...
                "2019 M09 16":{
                    Sign:{
                        "8":0,
                        "9":0
                    },
                    Rent:{
                        "8":0,
                        "9":0
                    },
                    Return:{
                        "8":0,
                        "9":0
                    }
                }
                ...
            },
            ...
        }
        */
        Trade.find({
            '$or':[{'tradeType.action':{'$in':req.body.typeYouWantToGet},'newUser.storeID':{'$in':req.body.ArrayOfStoreID}},
                    {'tradeType.action':'Rent','oriUser.storeID':{'$in':req.body.ArrayOfStoreID}}
                    ],
            'container.typeCode':{'$in':[8,9]},
            'tradeTime':{'$gte':StartTime}
        },(err,docs)=>{
            if(err) next(err);
            docs.forEach(doc=>{
                let data=doc._doc;
                let TradeTime=data.tradeTime;
                let TradeTimeTemp=new Date(TradeTime-(TradeTime.getDay()-1)*Day);
                let TradeTimeTempString=TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit' });
                if(data.tradeType.action==='Rent'){
                    req.StoreWeeklyData[data.oriUser.storeID][TradeTimeTempString][data.tradeType.action][data.container.typeCode]++
                }else{
                    req.StoreWeeklyData[data.newUser.storeID][TradeTimeTempString][data.tradeType.action][data.container.typeCode]++
                }
            })
            next()
        })
    },

/*
    getEveryWeekSignCountByStoreID:(req,res,next)=>{
        if (!req.StoreWeeklyData){
            let StoreWeeklyData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreWeeklyData[element]={}
            });
            req.StoreWeeklyData=StoreWeeklyData;
        }//if dataset is null , then init req.dataset.
        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);

        for(let i=thisMonday;i>=new Date('2017-11-01');i=i-7*Day){
            i=new Date(i)
            req.body.ArrayOfStoreID.forEach((storeID)=>{
                if(!req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]){
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]={
                        'Sign':{
                            '8':0,
                            '9':0
                        }
                    }
                }else if(!req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']){
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']={
                            '8':0,
                            '9':0
                        }
                    }
                else{
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']['8']=0;
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Sign']['9']=0;
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
                if(!req.StoreWeeklyData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]) 
                    req.StoreWeeklyData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreWeeklyData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]++
            })
            next()
        })
    },


    getEveryWeekRentCountByStoreID:(req,res,next)=>{
        if (!req.StoreWeeklyData){
            let StoreWeeklyData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreWeeklyData[element]={}
            });
            req.StoreWeeklyData=StoreWeeklyData;
        }//if dataset is null , then init req.dataset.
        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);

        for(let i=thisMonday;i>=new Date('2017-11-01');i=i-7*Day){
            i=new Date(i)
            req.body.ArrayOfStoreID.forEach((storeID)=>{
                if(!req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]){
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]={
                        'Rent':{
                            '8':0,
                            '9':0
                        }
                    }
                }else if(!req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']){
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']={
                            '8':0,
                            '9':0
                        }
                    }
                else{
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']['8']=0;
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Rent']['9']=0;
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
                if(!req.StoreWeeklyData[data.oriUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]) 
                    req.StoreWeeklyData[data.oriUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreWeeklyData[data.oriUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]++
            })
            next()
        })
    },





    getEveryWeekReturnCountByStoreID:(req,res,next)=>{
        if (!req.StoreWeeklyData){
            let StoreWeeklyData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreWeeklyData[element]={}
            });
            req.StoreWeeklyData=StoreWeeklyData;
        }//if dataset is null , then init req.dataset.
        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);
        //cacuulate this week Monday date


        for(let i=thisMonday;i>=new Date('2018-11-01');i=i-7*Day){
            i=new Date(i)
            req.body.ArrayOfStoreID.forEach((storeID)=>{
                if(!req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]){
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]={
                        'Return':{
                            '8':0,
                            '9':0
                        }
                    }
                }else if(!req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']){
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']={
                            '8':0,
                            '9':0
                        }
                    }
                else{
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']['8']=0;
                    req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['Return']['9']=0;
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
                if(!req.StoreWeeklyData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]) 
                    req.StoreWeeklyData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]=1;
                else req.StoreWeeklyData[data.newUser.storeID][TradeTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })][data.tradeType.action][data.container.typeCode]++
            })
            console.log(req.StoreWeeklyData[61]['2019 M09 2'])
            next()
        })
    },

*/
}