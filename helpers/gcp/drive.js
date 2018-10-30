var fs = require('fs');
var sharp = require('sharp');
var {
    google
} = require('googleapis');
var drive = google.drive('v3');
var debug = require('debug')('goodtogo_backend:google_drive');

var googleAuth = require("./auth");
const configs = require("../../config/config").google;
const GOOGLE_CONTENT_PATH = "./assets/json/googleContent.json";

var connectionCtr = 0;

if (!fs.existsSync("./assets/")) fs.mkdirSync("./assets/");
if (!fs.existsSync("./assets/json")) fs.mkdirSync("./assets/json");
if (!fs.existsSync("./assets/images")) fs.mkdirSync("./assets/images");
if (!fs.existsSync("./assets/images/icon")) fs.mkdirSync("./assets/images/icon");
if (!fs.existsSync("./assets/images/shop")) fs.mkdirSync("./assets/images/shop");

module.exports = {
    getContainer: function (forceRenew, cb) {
        googleAuth(function (auth) {
            drive.files.list({
                auth: auth,
                q: "'" + configs.container_icon_folderID + "' in parents",
                fields: "files(id, name, modifiedTime)"
            }, (err, response) => {
                resFromGoogle(err, response, forceRenew, 'icon', cb);
            });
        });
    },
    getStore: function (forceRenew, cb) {
        googleAuth(function (auth) {
            drive.files.list({
                auth: auth,
                q: "'" + configs.store_img_folderID + "' in parents",
                fields: "files(id, name, modifiedTime)"
            }, (err, response) => {
                resFromGoogle(err, response, forceRenew, 'shop', cb);
            });
        });
    }
};

function resFromGoogle(err, response, forceRenew, type, cb) {
    if (err) return debug('The API returned an error: ' + err);
    var files = response.data.files;
    var fileIdList = files.map(aFile => aFile.id);
    fs.readFile(GOOGLE_CONTENT_PATH, (err, googleContent) => {
        if (err) googleContent = null;
        else googleContent = JSON.parse(googleContent);
        if (!forceRenew && googleContent) {
            var index;
            for (var aWatchedFile in googleContent.file_watchList) {
                index = fileIdList.indexOf(googleContent.file_watchList[aWatchedFile].id);
                if (index >= 0 && files[index].modifiedTime === googleContent.file_watchList[aWatchedFile].modifiedTime) {
                    files.splice(index, 1);
                    fileIdList.splice(index, 1);
                }
            }
        }
        var funcList = files.map(aFile => new Promise((resolve, reject) => {
            downloadFile(aFile, type, resolve, reject);
        }));
        Promise
            .all(funcList)
            .then((data) => {
                var watchedID;
                var newWatchList;
                if (googleContent) {
                    watchedID = googleContent.file_watchList.map(aFile => aFile.id);
                    newWatchList = googleContent.file_watchList;
                } else {
                    googleContent = {};
                    watchedID = [];
                    newWatchList = [];
                }
                var modifiedFile = [];
                var aFile;
                for (var fileIndex in data) {
                    aFile = data[fileIndex];
                    if (aFile === 'error') continue;
                    modifiedFile.push(aFile.name);
                    if (watchedID && watchedID.indexOf(aFile.id) >= 0) {
                        newWatchList[watchedID.indexOf(aFile.id)].name = aFile.name;
                        newWatchList[watchedID.indexOf(aFile.id)].modifiedTime = aFile.modifiedTime;
                    } else {
                        newWatchList.push(aFile);
                    }
                }
                googleContent.file_watchList = newWatchList;
                fs.writeFile(GOOGLE_CONTENT_PATH, JSON.stringify(googleContent), 'utf8', function (err) {
                    if (err) {
                        debug(err);
                        return cb(false, err);
                    }
                    cb(true, modifiedFile);
                });
            })
            .catch((err) => {
                if (err) return cb(false, err);
            });
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