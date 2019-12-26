const DataClass=require("../summaryData/enums/DataClass");
const Summary=require("./summary");
module.exports={
    get:function(dataClass,storeID,startTime){
        let dataObject;
        switch(dataClass){
            case DataClass.Containers_Not_Return:
                dataObject=Summary.Containers_Not_Return(storeID,startTime);
                return dataObject;
            case DataClass.Containers_Be_Used:
                dataObject=Summary.Containers_Be_Used(storeID,startTime);
                return dataObject;
            case DataClass.User_Of_Containers:
                dataObject=Summary.User_Of_Containers(storeID,startTime);
                return dataObject;
            case DataClass.Not_Return_Users:
                dataObject=Summary.Not_Return_Users(storeID,startTime);
                return dataObject;
            case DataClass.Summary_Data_For_Store:
                dataObject=Summary.Summary_Data_For_Store(storeID,startTime);
                return dataObject;
            case DataClass.User_Not_Return_For_Store:
                dataObject=Summary.User_Not_Return_For_Store(storeID,startTime);
                return dataObject;
            case DataClass.Rent_UnLogRent_Return_For_Store:
                dataObject=Summary.Rent_UnLogRent_Return_For_Store(storeID,startTime);
                return dataObject;
        }
    }
}