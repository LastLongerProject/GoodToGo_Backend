const UserOrder=require("../models/DB/userOrderDB")
const Day=24*60*60*1000;
const Hour=60*60*1000;
const Minute=60*1000;
const Second=1000;
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
    getEveryWeekNullCountByStoreID:(req,res,next)=>{
        if (!req.StoreWeeklyData){
            let StoreWeeklyData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreWeeklyData[element]={};
            });
            req.StoreWeeklyData=StoreWeeklyData;
        }//if dataset is null , then init req.dataset.
        let thisMonday=req.thisMonday;
        let StartTime=new Date('2019-06-31')
        for(let i=thisMonday;i>=StartTime;i=i-7*Day){
            i=new Date(i)
            req.body.ArrayOfStoreID.forEach((storeID)=>{
            if(!req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]){
                req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]={
                    'nullCount':0
                }
            }
            else{
                req.StoreWeeklyData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['nullCount']=0
            }
            })
        }
        //This time, the req.StoreTotalData is like follow example.
        /*
        req.StoreTotalData=
        {
            "61":{
                "2019 M09 16":{
                    nullCount:{
                        "8":0,
                        "9":0
                    },
                    ...
                }
                ...
            },
            "62":{
                "2019 M09 16":{
                    nullCount:{
                        "8":0,
                        "9":0
                    },
                    ...
                }
                ...
            },
            ...
        }
        */

        UserOrder.find({
            'storeID':{'$in':req.body.ArrayOfStoreID},
            'containerID':null,
            'orderTime':{'$gte':StartTime}
        },(err,docs)=>{
            if(err) next(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                let OrderTime=data.orderTime
                let OrderTimeTemp=new Date(OrderTime-(OrderTime.getDay()-1)*Day)
                req.StoreWeeklyData[data.storeID][OrderTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['nullCount']++
            })
            next()
        })
    }
}