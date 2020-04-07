const debug = require("../../../debugger")("summaryReport_handler");
const DataSummary=require('../../../summaryData/center');
const googleSheet_Preprocessor=require('../googleSheet/preprocessor');
const googleSheet_Sender=require('../googleSheet/sender');
const DataClassEnums=require('../../../summaryData/enums/DataClass');
module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(storeID,sheetID,startTime='2018-01-01',endTime=new Date()){
        return new Promise((resolve,reject)=>{
            let error_messenge;
            const dataClass=DataClassEnums.Containers_Not_Return;
            startTime=new Date(startTime);
            endTime=new Date(endTime);
            DataSummary.get(dataClass,storeID,startTime,endTime).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_Containers_Not_Return_To_Goodtogo(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_Containers_Not_Return_To_Goodtogo(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve([null,success_Messenge])
                    })
                    .catch(err=>{
                        error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err;
                        debug.error(error_messenge)
                        resolve([error_messenge])
                    })
                }).catch(err=>{
                    error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err;
                    debug.error(error_messenge)
                    resolve([error_messenge])
                })
            })
            .catch(err=>{
                error_messenge='Error Messenge from DataSummary.summary: '+err;
                debug.error(error_messenge)
                resolve([error_messenge])
            })
        })
    },
    List_Of_Containers_Be_Used:function(storeID,sheetID,startTime='2018-01-01',endTime=new Date()){
        return new Promise((resolve,reject)=>{
            let error_messenge;
            const dataClass=DataClassEnums.Containers_Be_Used;
            startTime=new Date(startTime);
            endTime=new Date(endTime);
            DataSummary.get(dataClass,storeID,startTime,endTime).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_Containers_Be_Used(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_Containers_Be_Used(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve([null,success_Messenge])
                    })
                    .catch(err=>{
                        error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err;
                        debug.error(error_messenge)
                        resolve([error_messenge])
                    })
                }).catch(err=>{
                    error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err;
                    debug.error(error_messenge)
                    resolve([error_messenge])
                })
            })
            .catch(err=>{
                error_messenge='Error Messenge from DataSummary.summary: '+err;
                debug.error(error_messenge)
                resolve([error_messenge])
            })
        })
    },
    List_Of_User_Of_Containers:function(storeID,sheetID,startTime='2018-01-01',endTime=new Date()){
        return new Promise((resolve,reject)=>{
            let error_messenge;
            const dataClass=DataClassEnums.User_Of_Containers;
            startTime=new Date(startTime);
            endTime=new Date(endTime);
            DataSummary.get(dataClass,storeID,startTime,endTime).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_User_Of_Containers(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_User_Of_Containers(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve([null,success_Messenge])
                    })
                    .catch(err=>{
                        error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err;
                        debug.error(error_messenge)
                        resolve([error_messenge])
                    })
                }).catch(err=>{
                    error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err;
                    debug.error(error_messenge)
                    resolve([error_messenge])
                })
            })
            .catch(err=>{
                error_messenge='Error Messenge from DataSummary.summary: '+err;
                debug.error(error_messenge)
                resolve([error_messenge])
            })
        })
    },
    List_Of_Not_Return_Users:function(storeID,sheetID,startTime='2018-01-01',endTime=new Date()){
        return new Promise((resolve,reject)=>{
            let error_messenge;
            const dataClass=DataClassEnums.Not_Return_Users;
            startTime=new Date(startTime);
            endTime=new Date(endTime);
            DataSummary.get(dataClass,storeID,startTime,endTime).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_Not_Return_Users(ori_data)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_Not_Return_Users(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve([null,success_Messenge])
                    })
                    .catch(err=>{
                        error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err;
                        debug.error(error_messenge)
                        resolve([error_messenge])
                    })
                }).catch(err=>{
                    error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err;
                    debug.error(error_messenge)
                    resolve([error_messenge])
                })
            })
            .catch(err=>{
                error_messenge='Error Messenge from DataSummary.summary: '+err;
                debug.error(error_messenge)
                resolve([error_messenge])
            })
        })
    },
    List_Of_Summary_For_Store:function(storeID,sheetID,startTime='2018-01-01',endTime=new Date()){
        return new Promise((resolve,reject)=>{
            let error_messenge;
            const dataClass_1=DataClassEnums.Summary_Data_For_Store;
            const dataClass_2=DataClassEnums.User_Not_Return_For_Store;
            startTime=new Date(startTime);
            endTime=new Date(endTime);
            DataSummary.get(dataClass_1,storeID,startTime,endTime).then(ori_data_1=>{
                console.log(ori_data_1)
                DataSummary.get(dataClass_2,storeID,startTime,endTime).then(ori_data_2=>{
                    console.log(ori_data_2)
                        let ori_data={
                            'Rent_Trades':ori_data_1.Trades_For_Rent,
                            'Date_Return_To_OriStore':ori_data_1.the_Date_Return_To_OriStore,
                            'the_Date_User_Not_Return':ori_data_2,
                            'Date_Return_To_Other_Store':ori_data_1.the_Date_Return_To_Other_Store,
                            'Date_Return_To_Bot':ori_data_1.the_Date_Return_To_Bot
                        }
                        googleSheet_Preprocessor.List_Of_Summary_For_Store(ori_data,startTime,endTime)
                        .then(data_List=>{
                        //console.log(data_List);
                        googleSheet_Sender.List_Of_Summary_For_Store(data_List,sheetID)
                        .then(success_Messenge=>{
                            resolve([null,success_Messenge])
                        })
                        .catch(err=>{
                            error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err;
                            debug.error(error_messenge)
                            resolve([error_messenge])
                        })
                        }).catch(err=>{
                            error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err;
                            debug.error(error_messenge)
                            resolve([error_messenge])
                        })
                    .catch(err=>{
                        error_messenge='Error Messenge from DataSummary.summary: '+err;
                        debug.error(error_messenge)
                        resolve([error_messenge])
                    })
                })
            })
        })
    },
    List_Of_Rent_UnLogRent_Return_For_Store:function(storeID,sheetID,startTime='2018-01-01',endTime=new Date()){
        return new Promise((resolve,reject)=>{
            let error_messenge;
            const dataClass=DataClassEnums.Rent_UnLogRent_Return_For_Store;
            startTime=new Date(startTime);
            endTime=new Date(endTime);
            DataSummary.get(dataClass,storeID,startTime,endTime).then(ori_data=>{
                googleSheet_Preprocessor.List_Of_Rent_UnLogRent_Return_For_Store(storeID,ori_data,startTime)
                .then(data_List=>{
                    //console.log(data_List);
                    googleSheet_Sender.List_Of_Rent_UnLogRent_Return_For_Store(data_List,sheetID)
                    .then(success_Messenge=>{
                        resolve([null,success_Messenge])
                    })
                    .catch(err=>{
                        error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.Sender :'+err;
                        debug.error(error_messenge)
                        resolve([error_messenge])
                    })
                }).catch(err=>{
                    error_messenge='Error Messenge from DataReport.viewFormat.googleSheet.preprocessor: '+err;
                    debug.error(error_messenge)
                    resolve([error_messenge])
                })
            })
            .catch(err=>{
                error_messenge='Error Messenge from DataSummary.summary: '+err;
                debug.error(error_messenge)
                resolve([error_messenge])
            })
        })
    },
}