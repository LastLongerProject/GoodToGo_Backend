const debug = require("../debugger")("summaryReport_handler");
const DataSummary=require('../../../summaryData/center');
const googleSheet_Preprocessor=require('../googleSheet/preprocessor');
const googleSheet_Sender=require('../googleSheet/sender');
const DataClassEnums=require('../../../summaryData/enums/DataClass');
module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(storeID,sheetID){
        return new Promise((resolve,reject)=>{
            const dataClass=DataClassEnums.Containers_Not_Return;
            DataSummary.get(dataClass,storeID).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_Containers_Not_Return_To_Goodtogo(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_Containers_Not_Return_To_Goodtogo(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve(success_Messenge)
                    })
                    .catch(err=>{
                        debug.error('Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err)
                        reject(err)
                    })
                }).catch(err=>{
                    debug.error('Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err)
                    reject(err)
                })
            })
            .catch(err=>{
                debug.error('Error Messenge from DataSummary.summary: '+err)
                reject(err)
            })
        })
    },
    List_Of_Containers_Be_Used:function(storeID,sheetID){
        return new Promise((resolve,reject)=>{
            const dataClass=DataClassEnums.Containers_Be_Used;
            DataSummary.get(dataClass,storeID).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_Containers_Be_Used(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_Containers_Be_Used(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve(success_Messenge)
                    })
                    .catch(err=>{
                        debug.error('Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err)
                        reject(err)
                    })
                })
                .catch(err=>{
                    debug.error('Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err)
                    reject(err)
                })
            })
            .catch(err=>{
                debug.error('Error Messenge from DataSummary.summary: '+err)
                reject(err)
            })
        })
    },
    List_Of_User_Of_Containers:function(storeID,sheetID){
        return new Promise((resolve,reject)=>{
            const dataClass=DataClassEnums.User_Of_Containers;
            DataSummary.get(dataClass,storeID).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_User_Of_Containers(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_User_Of_Containers(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve(success_Messenge)
                    })
                    .catch(err=>{
                        debug.error('Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err)
                        reject(err)
                    })
                })
                .catch(err=>{
                    debug.error('Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err)
                    reject(err)
                })
            })
            .catch(err=>{
                debug.error('Error Messenge from DataSummary.summary: '+err)
                reject(err)
            })
        })
    },
    List_Of_Not_Return_Users:function(storeID,sheetID){
        return new Promise((resolve,reject)=>{
            const dataClass=DataClassEnums.Not_Return_Users;
            DataSummary.get(dataClass,storeID).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_Not_Return_Users(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_Not_Return_Users(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve(success_Messenge)
                    })
                    .catch(err=>{
                        debug.error('Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err)
                        reject(err)
                    })
                })
                .catch(err=>{
                    debug.error('Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err)
                    reject(err)
                })
            })
            .catch(err=>{
                debug.error('Error Messenge from DataSummary.summary: '+err)
                reject(err)
            })
        })
    }
}