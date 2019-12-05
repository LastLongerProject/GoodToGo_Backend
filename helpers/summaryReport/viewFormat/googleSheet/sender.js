const {
    google
} = require('googleapis');
const sheets = google.sheets('v4');
const debug = require('../../../debugger')('google_sheet');
const googleAuth = require("../../../gcp/auth");
const RangeClass=require('../../enums/GoogleSheetRange');

module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(data_List,sheetID){
        return new Promise(function(resolve,reject){
            GoogleSheetRequest_Emit(data_List,sheetID,RangeClass.List_Of_Containers_Not_Return_To_Goodtogo)
            .then(response=>{
                resolve(response)
            })
            .catch(err=>{
                reject(err)
            })
        })
    },
    List_Of_Containers_Be_Used:function(data_List,sheetID){
        return new Promise(function(resolve,reject){
            GoogleSheetRequest_Emit(data_List,sheetID,RangeClass.List_Of_Containers_Be_Used)
            .then(response=>{
                resolve(response)
            })
            .catch(err=>{
                reject(err)
            })
        })
    },//resolve(成功訊息) reject(失敗訊息)
    List_Of_User_Of_Containers:function(data_List,sheetID){
        return new Promise(function(resolve,reject){
            GoogleSheetRequest_Emit(data_List,sheetID,RangeClass.List_Of_User_Of_Containers)
            .then(response=>{
                resolve(response)
            })
            .catch(err=>{
                reject(err)
            })
        })
    },//resolve(成功訊息) reject(失敗訊息)
    List_Of_Not_Return_Users:function(data_List,sheetID){
        return new Promise(function(resolve,reject){
            GoogleSheetRequest_Emit(data_List,sheetID,RangeClass.List_Of_Not_Return_Users)
            .then(response=>{
                resolve(response)
            })
            .catch(err=>{
                reject(err)
            })
        })
    },//resolve(成功訊息) reject(失敗訊息)
}

function GoogleSheetRequest_Emit(data_List,sheetID,Range){
    return new Promise(function(resolve,reject){
        let request_data=[]
        let request_data_item={
            "majorDimension":"ROWS",
            "range":Range,
            "values":data_List
        }
        request_data.push(request_data_item)
        googleAuth(auth=>{
            let request={
                auth,
                spreadsheetId:sheetID,
                resource:{
                    "valueInputOption":"RAW",
                    "data":request_data
                }
            }
            sheets.spreadsheets.values.batchUpdate(request,(err,response)=>{
                if (err){
                    //console.log(err);
                    reject(err)
                } 
                //console.log(response);
                resolve(response)
            })
        })
    })
}//resolve(成功訊息) reject(失敗訊息)