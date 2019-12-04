const DataClass=require("../summaryData/enums/DataClass");
const Summary=require("./summary");
module.exports={
    get:function(dataClass,storeID){
        let dataObject;
        switch(dataClass){
            case DataClass.Containers_Not_Return:
                dataObject=Summary.Containers_Not_Return(storeID);
                return dataObject;
            case DataClass.Containers_Be_Used:
                dataObject=Summary.Containers_Be_Used(storeID);
                return dataObject;
            case DataClass.User_Of_Containers:
                dataObject=Summary.User_Of_Containers(storeID);
                return dataObject;
            case DataClass.Not_Return_Users:
                dataObject=Summary.Not_Return_Users(storeID);
                return dataObject;
        }
    }
}