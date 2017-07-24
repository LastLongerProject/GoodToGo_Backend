
# coding: utf-8

# In[1]:

import json
import requests
import time
import datetime

with open('./config/config.json') as data_file:
    api_keyTmp = json.load(data_file)
api_key = api_keyTmp["google_place"]

with open('./assets/json/googlePlaceIDs.json') as data_file:
    data = json.load(data_file)
    
for store in data["IDlist"]:
    print str(store["id"]) + ": " + store["name"] + " " + store["placeID"]

    res = requests.get("https://maps.googleapis.com/maps/api/place/details/json?placeid=" + store["placeID"]
                       + "&key=" + api_key + "&language=zh-TW")
    res.close()
    resData = res.json()
    if res.status_code == 200:
        print 'Get ' + store["name"] + ' success\n'
        
    with open( './tmp/json/' + str(store["id"]+1) +'.json', 'w+') as f:
        json.dump(resData, f)


# In[2]:

store_Google = []
for i in range(9):
    with open('./tmp/json/' + str(i+1) + '.json') as data_file:
        tmp = json.load(data_file)
        store_Google.append(tmp)
with open('./assets/json/translater.json') as data_file:
    translater = json.load(data_file)
with open('./assets/json/stores.json') as data_file:
    store_Origin = json.load(data_file)


# In[3]:

t = time.time()
store_Origin["updated_time"] = datetime.datetime.fromtimestamp(t).strftime('%Y-%m-%d %H:%M:%S').decode('unicode-escape')
print store_Origin["updated_time"]
print ""

for i in range(9):
#     GPS
    store_Origin["shop_data"][i]["location"] = store_Google[i]["result"]["geometry"]["location"]
    
#     address
    store_Origin["shop_data"][0]["address"] = u"台南市" + store_Google[i]["result"]["vicinity"]

#     time
    if (i != 7):
        timeTmp = store_Google[i]["result"]["opening_hours"]["periods"]
        if len(timeTmp[0]["close"]["time"]) == 4:
            for day in timeTmp:
                day["close"]["time"] = day["close"]["time"][:2] + u':' + day["close"]["time"][2:]
                day["open"]["time"] = day["open"]["time"][:2] + u':' + day["open"]["time"][2:]
    else:
        for day in timeTmp:
            day["close"]["time"] = u'21:00'
            day["open"]["time"] = u'09:00'
    store_Origin["shop_data"][i]["opening_hours"] = timeTmp
    
#     type
    typeTmp = []
    for typeCtr in range(len(store_Google[i]["result"]["types"])-2):
        typeTmp.append(translater[store_Google[i]["result"]["types"][typeCtr]])
    store_Origin["shop_data"][i]["type"] = typeTmp
    
#     print
    print str(store_Origin["shop_data"][i]["id"]) + " " + store_Origin["shop_data"][i]["name"]
    print store_Origin["shop_data"][i]["location"]
    print store_Origin["shop_data"][i]["address"]
    for day in store_Origin["shop_data"][i]["opening_hours"]:
        print day["open"]["time"] + " " + day["close"]["time"]
    for typeZH in store_Origin["shop_data"][i]["type"]:
        print typeZH
    print ""


# In[4]:

with open( './assets/json/stores.json', 'w') as f:
    json.dump(store_Origin, f)

print "Done!"