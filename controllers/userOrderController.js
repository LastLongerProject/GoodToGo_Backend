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
        const today=new Date();
        let thisMonday;
        if(today.getDay()!==0){
             thisMonday=new Date(today-(today.getDay()-1)*Day-today.getHours()*Hour-today.getMinutes()*Minute-today.getSeconds()*Second-today.getMilliseconds());
        }else  thisMonday=new Date(today-7*Day);

        for(let i=thisMonday;i>=new Date('2019-7-01');i=i-7*Day){
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
            'containerID':null
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