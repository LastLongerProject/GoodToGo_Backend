const typeCode=require('../../enums/containerTypeCode').typeCode;
module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(dataset){
        return new Promise(function(resolve,reject){
            let ContainerTypes=[];
            dataset.forEach(data=>{
                ContainerTypes[data[2]]=1;
            })
            let the_First_Row=[];
            the_First_Row.push(' ');
            for(index in ContainerTypes){
                if(ContainerTypes[index]){
                    the_First_Row.push(typeCode[index])
                }
            }
            the_First_Row[the_First_Row.length]='Total';
            let data_list=[the_First_Row];
            data_list[1]=['未借出但未回收'];
            data_list[2]=['使用者借出未歸還'];
            data_list[3]=['已歸還但未回收'];
            data_list[data_list.length]=['Total'];
            //console.log(dataset);
            for(j in the_First_Row){
                for(i in data_list){
                    if(!data_list[i][j]){
                        data_list[i][j]=0;
                    }
                }
            }
            dataset.forEach(data=>{
                let col=the_First_Row.findIndex(element=>element===typeCode[data[2]]);
                //console.log("col is "+col);
                data_list[data[1]][col]++;
                data_list[data[1]][data_list[0].length-1]++;
                data_list[data_list.length-1][data_list[0].length-1]++;
                data_list[data_list.length-1][col]++;
            })
            resolve(data_list)
        })
    },
    List_Of_Containers_Be_Used:function(dataset){

    },
    List_Of_User_Of_Containers:function(dataset){

    },
    List_Of_Not_Return_Users:function(dataset){

    }
}