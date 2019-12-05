const DataClass=require("../summaryData/enums/DataClass");
const tradeDB=require('../../models/DB/tradeDB');
const Summary=this;

module.exports={
    Containers_Not_Return:function(storeID){
        return Containers_Not_Return(storeID)
    },
    Containers_Be_Used:function(storeID){
        return new Promise(function(resolve,reject){
            tradeDB.find({
                'newUser.storeID':storeID,
                'tradeType.newState':3
            },(err,trades_Of_Used_Container)=>{
                if(err)console.log(err)
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
    User_Of_Containers:function(storeID){
        return new Promise(function(resolve,reject){
            tradeDB.find({
                'oriUser.storeID':storeID,
                'tradeType.action':'Rent'
            },(err,trades_Of_User_Rent)=>{
                if(err) console.log(err)
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
    Not_Return_Users:function(storeID){
        return new Promise(function(resolve,reject){
            let this_Containers_Not_Return=Containers_Not_Return(storeID);
            this_Containers_Not_Return.then(Containers=>{
                let Container_User_Not_Return=[]
                Containers.forEach(Container=>{
                    if (Container[1]===2){
                        Container_User_Not_Return.push(Container[0])
                    }
                })
                tradeDB.find({
                    'oriUser.storeID':storeID,
                    'container.id':{'$in':Container_User_Not_Return},
                    'tradeType.newState':2
                },(err,trades_Of_Not_Return_User)=>{
                    if(err)console.log(err);
                    trades_Of_Not_Return_User=trades_Of_Not_Return_User.map(trade=>[
                        trade.tradeTime.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'}),
                        trade.tradeTime.toLocaleTimeString('roc',{hour:'2-digit',minute:'2-digit',second:'2-digit' }),
                        trade.newUser.phone,
                        trade.container.id,
                        trade.container.typeCode
                    ]);
                    resolve(trades_Of_Not_Return_User)
                })
            })
        })
    }
};
function Containers_Not_Return(storeID){
    return new Promise(function(resolve,reject){
        tradeDB.find({
            'newUser.storeID':storeID,
            'tradeType.newState':1
          },(err,Containers_Store_Sign)=>{
              if(err) console.log(err);
              Containers_Store_Sign_And_TimeStamp=Containers_Store_Sign.map(Container_Store_Sign=>[
                  Container_Store_Sign.container.id,
                  Container_Store_Sign.tradeTime,
                  Container_Store_Sign.container.typeCode
                ]);
              //console.log(Containers_Store_Sign_And_TimeStamp);
              ContainersID_Store_Sign=Containers_Store_Sign.map(Container_Store_Sign=>Container_Store_Sign.container.id);
              let Containers_State=[];
              let Containers_State_Time=[];
              let Containers_typeCode=[];
              Containers_Store_Sign_And_TimeStamp.forEach(Container_And_TimeStamp => {
                  if (!Containers_State[Container_And_TimeStamp[0]]){
                      Containers_State[Container_And_TimeStamp[0]]=1;
                      Containers_State_Time[Container_And_TimeStamp[0]]=Container_And_TimeStamp[1];
                      Containers_typeCode[Container_And_TimeStamp[0]]=Container_And_TimeStamp[2];
                  }else if(Containers_State_Time[Container_And_TimeStamp[0]]<Container_And_TimeStamp[1]){
                      Containers_State_Time[Container_And_TimeStamp[0]]=Container_And_TimeStamp[1]
                  }
              });
              //console.log(Containers_State_Time[2227]);
              tradeDB.find({
                  '$or':[
                      {'newUser.storeID':storeID,'tradeType.newState':3},
                      {'oriUser.storeID':storeID,'tradeType.newState':2},
                      {'tradeType.newState':4},
                      {'newUser.storeID':87}
                  ],
                  'container.id':{'$in':ContainersID_Store_Sign}
              },(err,trades_Of_Containers)=>{
                  if(err) console.log(err);
                  ContainerID_TimeStamp_State_Of_trade=trades_Of_Containers.map(trade=>[
                      trade.container.id,
                      trade.tradeTime,
                      trade.tradeType.newState,
                      trade.newUser.storeID
                    ]);
                  //console.log(ContainerID_TimeStamp_State_Of_trade);
                  ContainerID_TimeStamp_State_Of_trade.forEach(ContainerID_TimeStamp_State=>{
                      if(!Containers_State[ContainerID_TimeStamp_State[0]]){
                          Containers_State[ContainerID_TimeStamp_State=ContainerID_TimeStamp_State[2]];
                          Containers_State_Time[ContainerID_TimeStamp_State[0]]=ContainerID_TimeStamp_State[1];
                      }else if(Containers_State_Time[ContainerID_TimeStamp_State[0]]<ContainerID_TimeStamp_State[1]){
                          if(ContainerID_TimeStamp_State[3]===87){
                            Containers_State[ContainerID_TimeStamp_State[0]]=4;
                            Containers_State_Time[ContainerID_TimeStamp_State[0]=ContainerID_TimeStamp_State[1]];
                          }else{
                            Containers_State[ContainerID_TimeStamp_State[0]]=ContainerID_TimeStamp_State[2];
                            Containers_State_Time[ContainerID_TimeStamp_State[0]=ContainerID_TimeStamp_State[1]];
                          }
                      }
                  })
                  let FinalValue=[];
                  for(i in Containers_State){
                      if (Containers_State[i]){
                        FinalValue.push([i,Containers_State[i],Containers_typeCode[i]])
                      }
                  }
                  resolve(FinalValue)
              })
          })
    })
}


