const UserOrder=require("../models/DB/userOrderDB")
const Day=24*60*60*1000;
const Hour=60*60*1000;
const Minute=60*1000;
const Second=1000;

module.exports={
    getNullCountByStoreID:(req,res,next)=>{
        if (!req.StoreData){
            let StoreData={};
            req.body.ArrayOfStoreID.forEach(element => {
                StoreData[element]={};
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
                        'nullCount':0
                    }
                }
            else{
                req.StoreData[storeID][i.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['nullCount']=0
            }
            })
        }


        UserOrder.find({
            'storeID':{'$in':req.body.ArrayOfStoreID},
            'containerID':null
        },(err,docs)=>{
            if(err) next(err)
            docs.forEach(doc=>{
                let data=doc._doc;
                let OrderTime=data.orderTime
                let OrderTimeTemp=new Date(OrderTime-(OrderTime.getDay()-1)*Day)
                req.StoreData[data.storeID][OrderTimeTemp.toLocaleDateString('roc',{year: 'numeric', month: 'long', day: 'numeric' })]['nullCount']++
            })
            next()
        })
    }
}