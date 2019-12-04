const DataSummary=require('../../../summaryData/center');
const googleSheet_Preprocessor=require('../googleSheet/preprocessor');
const googleSheet_Sender=require('../googleSheet/sender');
const DataClassEnums=require('../../../summaryData/enums/DataClass');
module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(storeID,sheetID){
        const dataClass=DataClassEnums.Containers_Not_Return;
        DataSummary.get(dataClass,storeID).then(Containers=>{
            googleSheet_Preprocessor.List_Of_Containers_Not_Return_To_Goodtogo(Containers)
            .then(data_List=>{
                console.log(data_List);
            })
        })
    }
}