const typeCode=require('../../enums/containerTypeCode').typeCode;
module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(dataset){
        return new Promise(function(resolve,reject){
            let ContainerTypes=[];
            dataset.forEach(data=>{
                ContainerTypes[data[2]]=1;
            })
            let the_First_Row=[];
            the_First_Row.push('');
            for(index in ContainerTypes){
                if(ContainerTypes[index]){
                    the_First_Row.push(typeCode[index])
                }
            }
            let data_list=[the_First_Row];
            data_list[1]=['未被借出'];
            data_list[2]=['使用者為歸還'];
            data_list[3]=['已歸還'];
            dataset.forEach(data=>{
                let the_Location_Of_data=data_list[data[1]][the_First_Row.findIndex(element=>element===typeCode[data[2]])];
                if(!the_Location_Of_data){
                    the_Location_Of_data=1;
                }else{
                    the_Location_Of_data++
                }
            })
            console.log(data_list)
            resolve(data_list)
        })
    }
}