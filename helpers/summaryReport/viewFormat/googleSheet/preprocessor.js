const containerDB = require('../../../../models/DB/containerDB');
const storeDB = require('../../../../models/DB/storeDB');
const DataCacheFactory = require("../../../../models/dataCacheFactory");
const day = 24 * 60 * 60 * 1000;
module.exports = {
    List_Of_Containers_Not_Return_To_Goodtogo: function (dataset) {
        return new Promise(function (resolve, reject) {
            const typeCode = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
            the_First_Row(dataset).then(the_First_Row => {
                let data_list = [the_First_Row];
                data_list[1] = ['未借出但未回收'];
                data_list[2] = ['使用者借出未歸還'];
                data_list[3] = ['已歸還但未回收'];
                data_list[data_list.length] = ['Total'];
                //console.log(dataset);
                Zero_Padding(data_list)
                    .then(data_list => {
                        dataset.forEach(data => {
                            let col = the_First_Row.findIndex(element => element === typeCode[data[2]].name);
                            //console.log("col is "+col);
                            if (data[1] !== 4) {
                                data_list[data[1]][col]++;
                                data_list[data[1]][data_list[0].length - 1]++;
                                data_list[data_list.length - 1][data_list[0].length - 1]++;
                                data_list[data_list.length - 1][col]++;
                            }
                        })
                        resolve(data_list)
                    })
            })
        })
    },
    List_Of_Containers_Be_Used: function (dataset) {
        return new Promise(function (resolve, reject) {
            const typeCode = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
            the_First_Row(dataset)
                .then(the_First_Row => {
                    generate_data_list_for_Date_interval(dataset, the_First_Row)
                        .then(data_list => {
                            Zero_Padding(data_list)
                                .then(data_list => {
                                    dataset.forEach(data => {
                                        for (let index = 0; index < data_list.length; index++) {
                                            if (data[2] === data_list[index][0]) {
                                                let this_Container_Type = typeCode[data[1]].name;
                                                let this_Container_Location = the_First_Row.findIndex(element => element === this_Container_Type)
                                                data_list[index][this_Container_Location]++
                                                data_list[index][data_list[index].length - 1]++
                                                data_list[data_list.length - 1][this_Container_Location]++
                                                data_list[data_list.length - 1][data_list[index].length - 1]++
                                            }
                                        }
                                    })
                                    resolve(data_list)
                                })
                        })
                })
        })
    },
    List_Of_User_Of_Containers: function (dataset) {
        return Date_Time_Phone_ContainerID_ContainerType(dataset)
    },
    List_Of_Not_Return_Users: function (dataset) {
        return Date_Time_Phone_ContainerID_ContainerType(dataset)
    },
    List_Of_Summary_For_Store: function (dataset, startTime) {
        return new Promise(function (resolve, reject) {
            let data_list = [
                [],
                ['週', '登記借出數量', '未登記使用數量', '總使用量', '借出容器已歸還數量', '歸還率', '未歸還數量', '原店歸還(數量)', '原店歸還(%)', 'A店B還(數量)', 'A店借B店還(%)', '自助歸還站(數量)', '自助歸還站(%)', '不重複使用人數'],
                ['TOTAL', 0, 0, 0, 0, null, 0, 0, null, 0, null, 0, null, 0],
                ['TREND', null, null, null, null, null, null, null, null, null, null, null, null, null]
            ];
            let Date_Location_In_datalist = {};
            let Weekly_User = {};
            let Total_User = {};
            let date = new Date(startTime);
            let today = new Date();
            while (date < new Date('2019-12-23')) {
                Date_Location_In_datalist[date.toLocaleDateString('roc', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })] = data_list.length;
                data_list.push([date.toLocaleDateString('roc', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }), 0, 0, 0, 0, null, 0, 0, null, 0, null, 0, null, 0])
                date = new Date((date - 1) + 1 + 7 * day);
            }

            dataset.Rent_Trades.forEach(trade => {
                let tradeTime = new Date(trade[1]);
                if (tradeTime.getDay() === 0) {
                    tradeTime = tradeTime - 6 * day
                } else {
                    tradeTime = tradeTime - (tradeTime.getDay() - 1) * day
                }
                tradeTime = new Date(tradeTime).toLocaleDateString('roc', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
                data_list[Date_Location_In_datalist[tradeTime]][trade[0] - 1]++;
                data_list[Date_Location_In_datalist[tradeTime]][3]++;
                data_list[Date_Location_In_datalist[tradeTime]][6]++;
                data_list[2][trade[0] - 1]++;
                data_list[2][3]++;
                data_list[2][6]++;
                if (!Weekly_User[tradeTime]) {
                    Weekly_User[tradeTime] = {}
                    Weekly_User[tradeTime][trade[2]] = true
                    data_list[Date_Location_In_datalist[tradeTime]][13]++
                } else if (!Weekly_User[tradeTime][trade[2]]) {
                    Weekly_User[tradeTime][trade[2]] = true
                    data_list[Date_Location_In_datalist[tradeTime]][13]++
                }
                if (!Total_User[trade[2]]) {
                    Total_User[trade[2]] = true;
                    data_list[2][13]++
                }
            })
            if (dataset.Date_Return_To_OriStore.length !== 0) {
                dataset.Date_Return_To_OriStore.forEach(date => {
                    date = new Date(date);
                    if (date.getDay() === 0) {
                        date = date - 6 * day
                    } else {
                        date = date - (date.getDay() - 1) * day;
                    }
                    date = new Date(date).toLocaleDateString('roc', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    });
                    data_list[Date_Location_In_datalist[date]][7]++
                    data_list[2][7]++
                    data_list[Date_Location_In_datalist[date]][4]++
                    data_list[2][4]++
                    data_list[Date_Location_In_datalist[date]][6]--
                    data_list[2][6]--
                })
            }
            if (dataset.Date_Return_To_Other_Store.length !== 0) {
                dataset.Date_Return_To_Other_Store.forEach(
                    date => {
                        date = new Date(date);
                        if (date.getDay() === 0) {
                            date = date - 6 * day
                        } else {
                            date = date - (date.getDay() - 1) * day;
                        }
                        date = new Date(date).toLocaleDateString('roc', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                        data_list[Date_Location_In_datalist[date]][9]++
                        data_list[2][9]++
                        data_list[Date_Location_In_datalist[date]][4]++
                        data_list[2][4]++
                        data_list[Date_Location_In_datalist[date]][6]--
                        data_list[2][6]--
                    }
                )
            }
            if (dataset.Date_Return_To_Bot.length !== 0) {
                dataset.Date_Return_To_Bot.forEach(
                    date => {
                        date = new Date(date);
                        if (date.getDay() === 0) {
                            date = date - 6 * day
                        } else {
                            date = date - (date.getDay() - 1) * day;
                        }
                        date = new Date(date).toLocaleDateString('roc', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                        data_list[Date_Location_In_datalist[date]][11]++
                        data_list[2][11]++
                        data_list[Date_Location_In_datalist[date]][4]++
                        data_list[2][4]++
                        data_list[Date_Location_In_datalist[date]][6]--
                        data_list[2][6]--
                    }
                )
            }
            /*
            dataset.the_Date_User_Not_Return.forEach(date=>{
                date=new Date(date);
                date=date-(date.getDay()-1)*day;
                date=new Date(date).toLocaleDateString('roc',{year: 'numeric', month: '2-digit', day: '2-digit'});
                data_list[Date_Location_In_datalist[date]][4]++
                data_list[1][4]++
            })
            */
            console.log(data_list);
            resolve(data_list);
        })
    },
    List_Of_Rent_UnLogRent_Return_For_Store: function (storeID, dataset, startTime) {
        return new Promise(function (resolve, reject) {
            let data_list = [
                ['週', 'TOTAL'],
                ['TOTAL'],
                ['TREND']
            ]
            let Date_Location_In_datalist = {};
            let date = new Date(startTime);
            let today = new Date();
            while (date < new Date('2019-12-23')) {
                Date_Location_In_datalist[date.toLocaleDateString('roc', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })] = data_list.length;
                data_list.push([date.toLocaleDateString('roc', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })])
                date = new Date((date - 1) + 1 + 7 * day);
            }

            let store_list = []
            storeDB.find({
                'id': {
                    '$in': storeID
                }
            }, (err, stores) => {
                if (err) reject(err);
                stores.forEach(store => {
                    store_list[store.id] = store.name
                })
                store_list.forEach(store_Name => {
                    if (store_Name) {
                        data_list[0].push(store_Name)
                        store_list[store_list.indexOf(store_Name)] = data_list[0].length - 1
                    }
                })
                console.log(store_list)
                Zero_Padding(data_list).then(data_list => {
                    console.log(data_list)
                    let Rent_data_list = data_list
                    let Return_data_list = []
                    let UnLog_Rent_data_list = []
                    data_list.forEach(data => {
                        Return_data_list.push(data.slice(0, data.length));
                        UnLog_Rent_data_list.push(data.slice(0, data.length));
                    })
                    dataset.forEach(data => {
                        let TimeStamp = new Date(data[2]);
                        if (TimeStamp.getDay() === 0) {
                            TimeStamp = TimeStamp - 6 * day;
                        } else {
                            TimeStamp = TimeStamp - (TimeStamp.getDay() - 1) * day;
                        }
                        TimeStamp = new Date(TimeStamp).toLocaleDateString('roc', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                        if (data[1] === 'Rent') {
                            Rent_data_list[Date_Location_In_datalist[TimeStamp]][store_list[data[0]]]++
                            Rent_data_list[Date_Location_In_datalist[TimeStamp]][1]++
                            Rent_data_list[1][store_list[data[0]]]++
                            Rent_data_list[1][1]++
                        } else if (data[1] === 'UnLogRent') {
                            UnLog_Rent_data_list[Date_Location_In_datalist[TimeStamp]][store_list[data[0]]]++
                            UnLog_Rent_data_list[Date_Location_In_datalist[TimeStamp]][1]++
                            UnLog_Rent_data_list[1][store_list[data[0]]]++
                            UnLog_Rent_data_list[1][1]++
                        } else {
                            Return_data_list[Date_Location_In_datalist[TimeStamp]][store_list[data[0]]]++
                            Return_data_list[Date_Location_In_datalist[TimeStamp]][1]++
                            Return_data_list[1][store_list[data[0]]]++
                            Return_data_list[1][1]++
                        }
                    })
                    console.log(Rent_data_list)
                    console.log(UnLog_Rent_data_list)
                    console.log(Return_data_list)
                    resolve({
                        'Rent': Rent_data_list,
                        'UnLog': UnLog_Rent_data_list,
                        'Return': Return_data_list
                    })
                })
            })
        })
    }
}





function Date_Time_Phone_ContainerID_ContainerType(dataset) {
    return new Promise(function (resolve, reject) {
        const typeCode = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
        let data_list = [];
        data_list.push(['借出日期', '借出時間', '使用者手機', '容器ID', '容器類別', 'storeID']);
        dataset.forEach(data => {
            data[2] = data[2].slice(0, 4) + '-xxx-' + data[2].slice(7, 10);
            let containerTypeCode = data[4];
            data[4] = typeCode[containerTypeCode].name;
            data_list.push(data);
        })
        resolve(data_list);
    })
}

function the_First_Row(dataset) {
    return new Promise(function (resolve, reject) {
        const typeCode = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
        let dataID_Set = dataset.map(data => data[0]);
        containerDB.find({
            'ID': {
                '$in': dataID_Set
            }
        }, (err, Containers) => {
            if (err) reject(err)
            let container_array = [];
            Containers.forEach(container => {
                container_array[container.typeCode] = 1;
            })
            let the_First_Row = [' '];
            for (let index in container_array) {
                if (container_array[index]) {
                    the_First_Row.push(typeCode[index].name)
                }
            }
            the_First_Row[the_First_Row.length] = 'Total';
            resolve(the_First_Row)
        })
    })
}

function Zero_Padding(data_list) {
    return new Promise(function (resolve, reject) {
        let the_First_Row = data_list[0];
        for (let j in the_First_Row) {
            for (let i in data_list) {
                if (!data_list[i][j]) {
                    data_list[i][j] = 0;
                }
            }
        }
        //console.log(data_list)
        resolve(data_list);
    })
}

function generate_data_list_for_Date_interval(dataset, the_First_Row) {
    return new Promise(function (resolve, reject) {
        the_First_Row[0] = '日期';
        if (dataset.length) {
            let the_First_Day = new Date(dataset[0][2]);
            let the_Final_Day = the_First_Day;
            dataset.forEach(data => {
                let This_Date = new Date(data[2]);
                if (This_Date > the_Final_Day) {
                    the_Final_Day = This_Date;
                }
                if (This_Date < the_First_Day) {
                    the_First_Day = This_Date;
                }
            })
            let data_list = [the_First_Row];
            let TimeStamp = the_First_Day;
            for (TimeStamp; TimeStamp <= the_Final_Day; TimeStamp = TimeStamp + day) {
                let TimeStamp_date = TimeStamp.toLocaleDateString('roc', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                data_list.push([TimeStamp_date]);
            }
            data_list[data_list.length] = ['Total'];
            //console.log(data_list)
            resolve(data_list)
        } else {
            resolve([the_First_Row])
        }
    })
}