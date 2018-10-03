var fs = require('fs');
var sharp = require('sharp');
var {
    google
} = require('googleapis');
var drive = google.drive('v3');
var debug = require('debug')('goodtogo_backend:google_drive');

var googleAuth = require("./auth");
const GOOGLE_CONTENT_PATH = "./assets/json/googleContent.json";

var connectionCtr = 0;

module.exports = {
    getContainer: function (forceRenew, cb) {
        var googleContent;
        fs.readFile(GOOGLE_CONTENT_PATH, 'utf8', function (err, data) {
            if (err) return cb(false, err);
            googleContent = JSON.parse(data);
            googleAuth(function (auth) {
                drive.files.list({
                    auth: auth,
                    q: "'" + googleContent.container_icon_folderID + "' in parents",
                    fields: "files(id, name, modifiedTime)"
                }, (err, response) => {
                    resFromGoogle(err, response, googleContent, forceRenew, 'icon', cb);
                });
            });
        });
    },
    getStore: function (forceRenew, cb) {
        var googleContent;
        fs.readFile(GOOGLE_CONTENT_PATH, 'utf8', function (err, data) {
            if (err) return cb(false, err);
            googleContent = JSON.parse(data);
            googleAuth(function (auth) {
                drive.files.list({
                    auth: auth,
                    q: "'" + googleContent.store_img_folderID + "' in parents",
                    fields: "files(id, name, modifiedTime)"
                }, (err, response) => {
                    resFromGoogle(err, response, googleContent, forceRenew, 'shop', cb);
                });
            });
        });

    }
};

function resFromGoogle(err, response, googleContent, forceRenew, type, cb) {
    if (err) {
        debug('The API returned an error: ' + err);
        return;
    }
    var files = response.data.files;
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
            fs.writeFile(GOOGLE_CONTENT_PATH, JSON.stringify(googleContent), 'utf8', function (err) {
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
        googleAuth(function (auth) {
            var fileName = aFile.name.replace('@', '_');
            var compressedFileName = fileName;
            var bufs = [];
            if (type === 'shop') fileName = fileName.slice(0, 5) + '_ori.jpg';
            drive.files.get({
                auth: auth,
                fileId: aFile.id,
                alt: 'media'
            }, {
                responseType: 'stream'
            }).then((res) => {
                res.data
                    .on('data', d => bufs.push(d))
                    .on('err', err => {
                        debug('Error during downloading file: ' + aFile.name + ' err: ' + err);
                        resolve('error');
                        return;
                    })
                    .on('end', () => {
                        connectionCtr--;
                        var buffer = Buffer.concat(bufs);
                        if (type === 'shop') {
                            sharp(buffer)
                                .resize(500)
                                .toFile('./assets/images/' + type + '/' + compressedFileName)
                                .then(function () {
                                    resolve(aFile);
                                });
                        } else {
                            resolve(aFile);
                        }
                    })
                    .pipe(fs.createWriteStream('./assets/images/' + type + '/' + fileName));
            }).catch(err => {
                if (err) return reject(err);
            });
        });
    } else {
        setImmediate(downloadFile, aFile, type, resolve, reject);
    }
}