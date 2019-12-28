const DataClass=require("../summaryData/enums/DataClass");
const tradeDB=require('../../models/DB/tradeDB');
const UserOrderDB=require('../../models/DB/userOrderDB');
const UserDB=require('../../models/DB/userDB');
const ContainerDB=require('../../models/DB/containerDB')
const Summary=this;

module.exports={
    Containers_Not_Return:function(storeID,startTime,endTime){
        return Containers_Not_Return(storeID,startTime,endTime)
    },
    Containers_Be_Used:function(storeID,startTime,endTime){
        return new Promise(function(resolve,reject){
            tradeDB.find({
                '$or':[
                        {'newUser.storeID':{'$in':storeID},'tradeType.oriState':1,'tradeType.newState':3},
                        {'oriUser.storeID':{'$in':storeID},'tradeType.newState':2}
                    ],
                    'tradeTime':{'$gte':startTime,'$lt':endTime},
            },(err,trades_Of_Used_Container)=>{
                if(err)reject(err)
                trades_Of_Used_Container=trades_Of_Used_Container.map(trade=>[
                    trade.container.id,
                    trade.container.typeCode,
                    trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}),
                    trade.tradeTime.toLocaleTimeString('roc',{hour:'2-digit',minute:'2-digit',second:'2-digit' })
                ])
                resolve(trades_Of_Used_Container)
            })
        })
    },
    User_Of_Containers:function(storeID,startTime,endTime){
        return new Promise(function(resolve,reject){
            tradeDB.find({
                'oriUser.storeID':{'$in':storeID},
                'tradeType.action':'Rent',
                'tradeTime':{'$gte':startTime,'$lt':endTime},
            },(err,trades_Of_User_Rent)=>{
                if(err) reject(err)
                let returnValue=trades_Of_User_Rent.map(trade=>[
                    trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}),
                    trade.tradeTime.toLocaleTimeString('roc',{hour:'2-digit',minute:'2-digit',second:'2-digit' }),
                    trade.newUser.phone,
                    trade.container.id,
                    trade.container.typeCode,
                ]);
                resolve(returnValue)
            })
        })
    },
    Not_Return_Users:function(storeID,startTime,endTime){
        return new Promise(function(resolve,reject){
                console.log(endTime)
                UserOrderDB.find({
                    'storeID':{'$in':storeID},
                    'orderTime':{'$gte':startTime,'$lt':endTime},
                    'archived':false
                },(err,orders)=>{
                    let NotReturn_orders=[]
                    console.log(err)
                    orders.forEach(order=>{
                        if(order.containerID){
                            NotReturn_orders.push(
                                [
                                    order.orderTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}),
                                    order.orderTime.toLocaleTimeString('roc',{hour:'2-digit',minute:'2-digit',second:'2-digit' }),
                                    order.user,
                                    order.containerID,
                                    order.containerID,
                                    order.storeID
                                ]
                            )
                        }
                    })
                    let Users=[]
                    let Containers=[]
                    orders.forEach(order=>{
                        Users.push(order.user)
                        Containers.push(order.containerID)
                    })
                    UserDB.find({
                        '_id':{'$in':Users}
                    },(err,users)=>{
                        if (err) reject(err);
                        let User_Phone={}
                        users.forEach(user=>{
                            User_Phone[user._id]=user.user.phone
                        })
                        ContainerDB.find({
                            'ID':{'$in':Containers}
                        },(err,containers)=>{
                            if(err)reject(err);
                            let container_typeCode=[];
                            containers.forEach(container=>{
                                container_typeCode[container.ID]=container.typeCode
                            })
                            NotReturn_orders.forEach(order=>{
                                let user=order[2];
                                order[2]=User_Phone[user];
                                let container_id=order[4];
                                order[4]=container_typeCode[container_id]
                            })
                            console.log(NotReturn_orders)
                            resolve(NotReturn_orders)
                        })
                    })
                })
        })
    },
    Summary_Data_For_Store:function(storeID,startTime,endTime){
        return new Promise(function(resolve,reject){
            tradeDB.find({
                '$or':[
                    {'oriUser.storeID':{'$in':storeID},'tradeType.newState':2,'tradeType.oriState':1},
                    {'oriUser.storeID':{'$in':storeID},'tradeType.newState':3,'tradeType.oriState':1},
                ],
                'tradeTime':{'$gte':startTime,'$lt':endTime}
            },(err,trades)=>{
                if(err) reject(err);
                let Containers_ID=trades.map(trade=>trade.container.id);
                let Trades_For_Rent=trades.map(trade=>[
                    trade.tradeType.newState,
                    trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}),
                    trade.newUser.phone
                ])
                //console.log(Trades_For_Rent)
                tradeDB.find({
                    '$or':[
                        {'oriUser.storeID':{'$in':storeID},'tradeType.newState':2,'tradeType.oriState':1},
                        {'tradeType.newState':3,'tradeType.oriState':2},
                        {'oriUser.storeID':{'$in':storeID},'tradeType.newState':3,'tradeType.oriState':1}
                    ],
                    'tradeTime':{'$gte':startTime,'$lt':endTime},
                    'container.id':{'$in':Containers_ID}
                },(err,trades)=>{
                    if(err) reject(err);
                    let the_Date_Return_To_OriStore=[];
                    let the_Date_Return_To_Other_Store=[];
                    let the_Date_Return_To_Bot=[];
                    let Container_TradeList=[];
                    trades.sort((a,b)=>{
                        return b.tradeTime-a.tradeTime
                    })
                    trades.forEach(trade=>{
                        if(trade.tradeType.oriState===1&&trade.tradeType.newState===3){
                            if(trade.oriUser.storeID===trade.newUser.storeID){
                                the_Date_Return_To_OriStore.push(trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}));
                            }else if(trade.newUser.phone.slice(0,3)==='bot'){
                                the_Date_Return_To_Bot.push(trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}))
                            }else{
                                the_Date_Return_To_Other_Store.push(trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}))
                            }
                        }else if(trade.tradeType.action==='Rent'){
                            if(!Container_TradeList[trade.container.id]){
                                Container_TradeList[trade.container.id]=[]
                            }
                            Container_TradeList[trade.container.id].push([trade.tradeType.action,trade.oriUser.storeID,trade.oriUser.phone.slice(0,3),trade.tradeTime]);
                        }else{
                            if(!Container_TradeList[trade.container.id]){
                                Container_TradeList[trade.container.id]=[]
                            }
                            Container_TradeList[trade.container.id].push([trade.tradeType.action,trade.newUser.storeID,trade.newUser.phone.slice(0,3),trade.tradeTime])
                        }
                    })
                    Container_TradeList.forEach(Container_Trades=>{
                        while(Container_Trades.length>=2){
                            let Trade=Container_Trades.pop();
                            if(Trade[0]==='Rent'){
                                let Rent_Trade=Trade;
                                let Return_Trade=Container_Trades.pop();
                                while(Return_Trade[0]!=='Return'){
                                    Rent_Trade=Return_Trade;
                                    Return_Trade=Container_Trades.pop();
                                }
                                if(Rent_Trade[1]===Return_Trade[1]){
                                    the_Date_Return_To_OriStore.push(Rent_Trade[3].toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}));
                                }else if(Return_Trade[2]!=='bot'){
                                    the_Date_Return_To_Other_Store.push(Rent_Trade[3].toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}))
                                }else{
                                    the_Date_Return_To_Bot.push(Rent_Trade[3].toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}))
                                }
                            }
                        }
                    })
                    resolve({
                        'Trades_For_Rent':Trades_For_Rent,
                        'the_Date_Return_To_OriStore':the_Date_Return_To_OriStore,
                        'the_Date_Return_To_Other_Store':the_Date_Return_To_Other_Store,
                        'the_Date_Return_To_Bot':the_Date_Return_To_Bot
                    })
                })
            })
        })
    },
    User_Not_Return_For_Store:function(storeID,startTime,endTime){
        return new Promise(function(resolve,reject){
            UserOrderDB.find({
                'storeID':{'$in':storeID},
                'orderTime':{'$gte':startTime},
                'archived':false
            },(err,UserOrders)=>{
                if(err)reject(err)
                let the_Date_User_Not_Return=UserOrders.map(Order=>Order.orderTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}));
                resolve(the_Date_User_Not_Return);
            })
        })
    },
    Rent_UnLogRent_Return_For_Store:function(storeID,startTime,endTime){
        return new Promise(function(resolve,reject){
            tradeDB.find({
                '$or':[
                    {'oriUser.storeID':{'$in':storeID},'tradeType.newState':2,'tradeType.oriState':1},
                    {'newUser.storeID':{'$in':storeID},'tradeType.newState':3,'tradeType.oriState':2},
                    {'newUser.storeID':{'$in':storeID},'tradeType.newState':3,'tradeType.oriState':1},
                ],
                'tradeTime':{'$gte':startTime,'$lt':endTime},
            },(err,trades)=>{
                if(err) reject(err);
                let Trades=[]
                trades.forEach(trade=>{
                    let tradeTime=trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'});
                    if(trade.tradeType.action==='Return'){
                        Trades.push([trade.newUser.storeID,'Return',tradeTime]);
                    }else{
                        Trades.push([trade.oriUser.storeID,'Rent',tradeTime]);
                    }
                })
                tradeDB.find({
                    'oriUser.storeID':{'$in':storeID},
                    'tradeType.newState':3,
                    'tradeType.oriState':1,
                    'tradeTime':{'$gte':startTime,'$lt':endTime},
                },(err,trades)=>{
                    if(err) reject(err)
                    trades.forEach(trade=>{
                        let tradeTime=trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'});
                        Trades.push([trade.oriUser.storeID,'UnLogRent',tradeTime])
                        resolve(Trades);
                    })
                })
            })
        })
    }
};
function Containers_Not_Return(storeID,startTime,endTime){
    return new Promise(function(resolve,reject){
        tradeDB.find({
            'newUser.storeID':{'$in':storeID},
            'tradeType.newState':1,
            'tradeTime':{'$gte':startTime,'$lt':endTime},
          },(err,Containers_Store_Sign)=>{
              if(err) reject(err);
              let Containers_Store_Sign_And_TimeStamp=Containers_Store_Sign.map(Container_Store_Sign=>[
                  Container_Store_Sign.container.id,
                  Container_Store_Sign.tradeTime,
                  Container_Store_Sign.container.typeCode
                ]);
              //console.log(Containers_Store_Sign_And_TimeStamp);
              let ContainersID_Store_Sign=Containers_Store_Sign.map(Container_Store_Sign=>Container_Store_Sign.container.id);
              let Containers_State=[];
              let Containers_State_Time=[];
              let Containers_typeCode=[];
              let the_first_day;
              Containers_Store_Sign_And_TimeStamp.forEach(Container_And_TimeStamp => {
                  if (!Containers_State[Container_And_TimeStamp[0]]){
                      Containers_State[Container_And_TimeStamp[0]]=1;
                      Containers_State_Time[Container_And_TimeStamp[0]]=Container_And_TimeStamp[1];
                      Containers_typeCode[Container_And_TimeStamp[0]]=Container_And_TimeStamp[2];
                  }else if(Containers_State_Time[Container_And_TimeStamp[0]]<Container_And_TimeStamp[1]){
                      Containers_State_Time[Container_And_TimeStamp[0]]=Container_And_TimeStamp[1]
                  }
              });
              Containers_State_Time.forEach(State_Time=>{
                if(State_Time){
                    if(!the_first_day){
                        the_first_day=State_Time;
                    }else if(State_Time<the_first_day){
                        the_first_day=State_Time;
                    }
                }
              })
              tradeDB.find({
                  '$or':[
                      {'newUser.storeID':{'$in':storeID},'tradeType.newState':3},
                      {'oriUser.storeID':{'$in':storeID},'tradeType.newState':2},
                      {'tradeType.newState':4},
                      {'newUser.storeID':87},
                      {'tradeType.oriState':1,'tradeType.newState':5}
                  ],
                  'container.id':{'$in':ContainersID_Store_Sign},
                  'tradeTime':{'$gt':the_first_day}
              },(err,trades_Of_Containers)=>{
                  if(err) reject(err)
                  let ContainerID_TimeStamp_State_Of_trade=trades_Of_Containers.map(trade=>[
                      trade.container.id,
                      trade.tradeTime,
                      trade.tradeType.newState,
                      trade.newUser.storeID
                    ]);
                  ContainerID_TimeStamp_State_Of_trade.forEach(ContainerID_TimeStamp_State=>{
                      let ContainerID=ContainerID_TimeStamp_State[0];
                      let tradeTime=ContainerID_TimeStamp_State[1];
                      let state=ContainerID_TimeStamp_State[2];
                      if(!Containers_State[ContainerID]){
                          Containers_State[ContainerID]=state;
                          Containers_State_Time[ContainerID]=tradeTime;
                      }else if(Containers_State_Time[ContainerID]<tradeTime){
                          if(ContainerID_TimeStamp_State[3]===87){
                            Containers_State[ContainerID]=4;
                            Containers_State_Time[ContainerID]=tradeTime;
                          }else if(state===5){
                            Containers_State[ContainerID]=4;
                            Containers_State_Time[ContainerID]=false;
                          }else{
                            Containers_State[ContainerID]=state;
                            Containers_State_Time[ContainerID]=tradeTime;
                          }
                      }
                  })
                  let FinalValue=[];
                  for(let i in Containers_State){
                      let ContainerID=Containers_State[i];
                      if (ContainerID){
                        FinalValue.push([i,ContainerID,Containers_typeCode[i]])
                      }
                  }
                  
                  resolve(FinalValue)
              })
          })
    })
}


