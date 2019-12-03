const DataClass=require("../summaryData/enums/DataClass");
const Summary=require("./summary");
module.exports={
    handle:function(dataClass,timeInterval,storeID){
        switch(dataClass){
            case DataClass.Container_Not_Return:
                let dataObject=Summary.Containers_Not_Return(storeID);
                return dataObject
            case DataClass.Containers_Be_Used:
                let dataObject=Summary.Containers_Be_Used(storeID);
                return dataObject
            case DataClass.User_Of_Containers:
                let dataObject=Summary.User_Of_Containers(storeID);
                return dataObject
            case DataClass.Not_Return_Users:
                let dataObject=Summary.Not_Return_Users(storeID);
                return dataObject
        }
    }
}