const containerDB=require('../../../../models/DB/containerDB');
const typeCode=require('../../enums/containerTypeCode').typeCode;
module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(dataset){
        return new Promise(function(resolve,reject){
            the_First_Row(dataset).then(the_First_Row=>{
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
                    if(data[1]!==4){
                        data_list[data[1]][col]++;
                        data_list[data[1]][data_list[0].length-1]++;
                        data_list[data_list.length-1][data_list[0].length-1]++;
                        data_list[data_list.length-1][col]++;
                    }
                })
                resolve(data_list)
            })
        })
    },
    List_Of_Containers_Be_Used:function(dataset){
        return new Promise(function(resolve,reject){

        })
    },
    List_Of_User_Of_Containers:function(dataset){
        return Date_Time_Phone_ContainerID_ContainerType(dataset)
    },
    List_Of_Not_Return_Users:function(dataset){
        return Date_Time_Phone_ContainerID_ContainerType(dataset)
    }
}


function Date_Time_Phone_ContainerID_ContainerType(dataset){
    return new Promise(function(resolve,reject){
        let data_list=[];
        data_list.push(['借出日期','借出時間','使用者手機','容器ID','容器類別']);
        dataset.forEach(data=>{
            let containerTypeCode=data[4];
            data[4]=typeCode[containerTypeCode];
            data_list.push(data);
        })
        resolve(data_list);
    })
}

function the_First_Row(dataset){
    return new Promise(function(resolve,reject){
        let dataID_Set=dataset.map(data=>data[0]);
        containerDB.find({
            'ID':{'$in':dataID_Set}
        },(err,Containers)=>{
            if(err) console.log(err);
            let container_array=[];
            Containers.forEach(container=>{
                container_array[container.typeCode]=1;
            })
            let the_First_Row=[' '];
            for(let index in container_array){
                if(container_array[index]){
                    the_First_Row.push(typeCode[index])
                }
            }
            resolve(the_First_Row)
        })
    })
}