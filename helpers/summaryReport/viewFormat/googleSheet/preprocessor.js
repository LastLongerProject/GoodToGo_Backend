const containerDB=require('../../../../models/DB/containerDB');
const typeCode=require('../../enums/containerTypeCode').typeCode;
const day=24*60*60*1000;
module.exports={
    List_Of_Containers_Not_Return_To_Goodtogo:function(dataset){
        return new Promise(function(resolve,reject){
            the_First_Row(dataset).then(the_First_Row=>{
                let data_list=[the_First_Row];
                data_list[1]=['未借出但未回收'];
                data_list[2]=['使用者借出未歸還'];
                data_list[3]=['已歸還但未回收'];
                data_list[data_list.length]=['Total'];
                //console.log(dataset);
                Zero_Padding(data_list)
                .then(data_list=>{
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
        })
    },
    List_Of_Containers_Be_Used:function(dataset){
        return new Promise(function(resolve,reject){
            the_First_Row(dataset)
            .then(the_First_Row=>{generate_data_list_for_Date_interval(dataset,the_First_Row)
            .then(data_list=>{Zero_Padding(data_list)
            .then(data_list=>{
                dataset.forEach(data=>{
                    for(let index=0;index<data_list.length;index++){
                        if(data[2]===data_list[index][0]){
                            let this_Container_Type=typeCode[data[1]];
                            let this_Container_Location=the_First_Row.findIndex(element=>element===this_Container_Type)
                            data_list[index][this_Container_Location]++
                            data_list[index][data_list[index].length-1]++
                            data_list[data_list.length-1][this_Container_Location]++
                            data_list[data_list.length-1][data_list[index].length-1]++
                        }
                    }
                })
                resolve(data_list)
            })})})
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
            data[2]=data[2].slice(0,4)+'-xxx-'+data[2].slice(7,10);
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
            if(err) reject(err)
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
            the_First_Row[the_First_Row.length]='Total';
            resolve(the_First_Row)
        })
    })
}

function Zero_Padding(data_list){
    return new Promise(function(resolve,reject){
        let the_First_Row=data_list[0];
        for(let j in the_First_Row){
            for(let i in data_list){
                if(!data_list[i][j]){
                    data_list[i][j]=0;
                }
            }
        }
        //console.log(data_list)
        resolve(data_list);
    })
}

function generate_data_list_for_Date_interval(dataset,the_First_Row){
    return new Promise(function(resolve,reject){
        the_First_Row[0]='日期';
        if(dataset.length){
            let the_First_Day=new Date(dataset[0][2]);
            let the_Final_Day=the_First_Day;
            dataset.forEach(data=>{
                let This_Date=new Date(data[2]);
                if(This_Date>the_Final_Day){
                    the_Final_Day=This_Date;
                }
                if(This_Date<the_First_Day){
                    the_First_Day=This_Date;
                }
            })
            let data_list=[the_First_Row];
            let TimeStamp=the_First_Day;
            for(TimeStamp;TimeStamp<=the_Final_Day;TimeStamp=TimeStamp+day){
                let TimeStamp_date=TimeStamp.toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'});
                data_list.push([TimeStamp_date]);
            }
            data_list[data_list.length]=['Total'];
            //console.log(data_list)
            resolve(data_list)
        }else{
            resolve([the_First_Row])
        }
    })
}