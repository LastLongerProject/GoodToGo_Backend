const {
    google
} = require('googleapis');
const sheets = google.sheets('v4');
const debug = require('../../../debugger')('google_sheet');
const googleAuth = require("../../../gcp/auth");

module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(data_List,sheetID){
        return new Promise(function(resolve,reject){

        })
    },//resolve(成功訊息) reject(失敗訊息)
    List_Of_Containers_Be_Used:function(data_List,sheetID){
        return new Promise(function(resolve,reject){
            
        })
    },//resolve(成功訊息) reject(失敗訊息)
    List_Of_User_Of_Containers:function(data_List,sheetID){
        return new Promise(function(resolve,reject){
            
        })
    },//resolve(成功訊息) reject(失敗訊息)
    List_Of_Not_Return_Users:function(data_List,sheetID){
        return new Promise(function(resolve,reject){
            
        })
    },//resolve(成功訊息) reject(失敗訊息)
}