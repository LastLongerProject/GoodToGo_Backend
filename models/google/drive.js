var fs = require('fs');
var google = require('googleapis');
var GoogleAuth = require('google-auth-library');
var debug = require('debug')('goodtogo_backend:google_drive');

var intReLength = require('../toolKit').intReLength;
var PlaceID = require('../DB/placeIdDB');
var Store = require('../DB/storeDB');
var ContainerType = require('../DB/containerTypeDB');
var Container = require('../DB/containerDB');

var authFactory = new GoogleAuth();
var SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
var connectionCtr = 0;

function googleAuth(callback) {
    authFactory.getApplicationDefault(function(err, authClient) {
        if (err) {
            debug('Authentication failed because of ', err);
            return;
        }
        if (authClient.createScopedRequired && authClient.createScopedRequired()) {
            authClient = authClient.createScoped(SCOPES);
        }

        callback(authClient);
    });
}

module.exports = {
    getContainer: function(forceRenew, cb) {
        var googleContent;
        fs.readFile("./assets/json/googleContent.json", 'utf8', function(err, data) {
            if (err) return cb(false, err);
            googleContent = JSON.parse(data);
            googleAuth(function(auth) {
                var drive = google.drive('v3');
                drive.files.list({
                    auth: auth,
                    q: "'" + googleContent.container_icon_folderID + "' in parents",
                    fields: "files(id, name, modifiedTime)"
                }, (err, response) => { resFromGoogle(err, response, googleContent, forceRenew, 'icon', cb); });
            });
        });
    },
    getStore: function(forceRenew, cb) {
        var googleContent;
        fs.readFile("./assets/json/googleContent.json", 'utf8', function(err, data) {
            if (err) return cb(false, err);
            googleContent = JSON.parse(data);
            googleAuth(function(auth) {
                var drive = google.drive('v3');
                drive.files.list({
                    auth: auth,
                    q: "'" + googleContent.store_img_folderID + "' in parents",
                    fields: "files(id, name, modifiedTime)"
                }, (err, response) => { resFromGoogle(err, response, googleContent, forceRenew, 'shop', cb); });
            });
        });

    }
};

function resFromGoogle(err, response, googleContent, forceRenew, type, cb) {
    if (err) {
        debug('The API returned an error: ' + err);
        return;
    }
    var files = response.files;
    var fileIdList = [];
    for (var i = 0; i < files.length; i++) {
        fileIdList.push(files[i].id);
    }
    if (!forceRenew) {
        var index;
        for (var aWatchedFile in googleContent.file_watchList) {
            index = fileIdList.indexOf(googleContent.file_watchList[aWatchedFile].id);
            if (index >= 0 && files[index].modifiedTime === googleContent.file_watchList[aWatchedFile].modifiedTime) {
                files.splice(index, 1);
                fileIdList.splice(index, 1);
            }
        }
    }
    var funcList = [];
    for (var aFile in files) {
        // if (aFile < 1)
        funcList.push(new Promise((resolve, reject) => {
            downloadFile(files[aFile], type, resolve, reject);
        }));
    }
    Promise
        .all(funcList)
        .then((data) => {
            var watchedID = [];
            for (var i = 0; i < googleContent.file_watchList.length; i++) {
                watchedID.push(googleContent.file_watchList[i].id);
            }
            var modifiedFile = [];
            var newWatchList = googleContent.file_watchList;
            var aFile;
            for (var fileIndex in data) {
                aFile = data[fileIndex];
                if (aFile === 'error') continue;
                modifiedFile.push(aFile.name);
                if (watchedID.indexOf(aFile.id) >= 0) {
                    newWatchList[watchedID.indexOf(aFile.id)].modifiedTime = aFile.modifiedTime;
                } else {
                    newWatchList.push(aFile);
                }
            }
            googleContent.file_watchList = newWatchList;
            fs.writeFile("./assets/json/googleContent.json", JSON.stringify(googleContent), 'utf8', function(err) {
                if (err) return cb(false, err);
                cb(true, modifiedFile);
            });
        })
        .catch((err) => {
            if (err) return cb(false, err);
        });
}

function downloadFile(aFile, type, resolve, reject) {
    if (connectionCtr < 6) {
        connectionCtr++;
        googleAuth(function(auth) {
            var drive = google.drive('v2');
            var fileName = aFile.name.replace('@', '_');
            if (type === 'shop') fileName = fileName.slice(0, 2) + '_ori.jpg';
            drive.files.get({
                auth: auth,
                fileId: aFile.id,
                alt: 'media'
            }, {
                encoding: null
            }, function(err, buffer) {
                connectionCtr--;
                if (err) {
                    debug('Error during downloading file: ' + aFile.name + ' err: ' + err);
                    resolve('error');
                    return;
                }
                fs.writeFile('./assets/images/' + type + '/' + fileName, buffer, 'binary', function(err) {
                    if (err) {
                        debug('Error during saving file: ' + aFile.name + ' err: ' + err);
                        reject(err);
                    } else {
                        resolve(aFile);
                    }
                });
            });
        });
    } else {
        setImmediate(downloadFile, aFile, type, resolve, reject);
    }
}