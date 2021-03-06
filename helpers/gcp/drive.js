const fs = require('fs');
const sharp = require('sharp');
const {
    google
} = require('googleapis');
const drive = google.drive('v3');
const debug = require('../debugger')('google_drive');

const googleAuth = require("./auth");
const configs = require("../../config/config").google;
const ROOT_DIR = require("../../config/config").staticFileDir;
const GOOGLE_CONTENT_PATH = `${ROOT_DIR}/assets/json/googleContent.json`;

let connectionCtr = 0;

if (!fs.existsSync(`${ROOT_DIR}/assets/`)) fs.mkdirSync(`${ROOT_DIR}/assets/`);
if (!fs.existsSync(`${ROOT_DIR}/assets/json`)) fs.mkdirSync(`${ROOT_DIR}/assets/json`);
if (!fs.existsSync(`${ROOT_DIR}/assets/images`)) fs.mkdirSync(`${ROOT_DIR}/assets/images`);
if (!fs.existsSync(`${ROOT_DIR}/assets/images/icon`)) fs.mkdirSync(`${ROOT_DIR}/assets/images/icon`);
if (!fs.existsSync(`${ROOT_DIR}/assets/images/shop`)) fs.mkdirSync(`${ROOT_DIR}/assets/images/shop`);
if (!fs.existsSync(`${ROOT_DIR}/assets/images/coupon`)) fs.mkdirSync(`${ROOT_DIR}/assets/images/coupon`);

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
    },
    getCoupon: function (forceRenew, cb) {
        googleAuth(function (auth) {
            drive.files.list({
                auth: auth,
                q: "'" + configs.coupon_img_folderID + "' in parents",
                fields: "files(id, name, modifiedTime)"
            }, (err, response) => {
                resFromGoogle(err, response, forceRenew, 'coupon', cb);
            });
        });
    }
};

if (!fs.existsSync(GOOGLE_CONTENT_PATH)) {
    const tmpCb = function (initType) {
        return function tmpCb(success, data) {
            if (!success) {
                debug.error(`[${initType}] Initial Static File Not Success: `, data);
            } else {
                debug.log(`[${initType}] Initial Static File Success!`);
            }
        };
    };
    module.exports.getContainer(true, tmpCb("Container Icon"));
    module.exports.getStore(true, tmpCb("Store Picture"));
    module.exports.getCoupon(true, tmpCb("Coupon Image"));
}

function resFromGoogle(err, response, forceRenew, type, cb) {
    if (err) return debug.error('The API returned an error: ' + err);
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
                        debug.error(err);
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
                        debug.error('Error during downloading file: ' + aFile.name + ' err: ' + err);
                        resolve('error');
                        return;
                    })
                    .on('end', () => {
                        connectionCtr--;
                        var buffer = Buffer.concat(bufs);
                        if (type === 'shop') {
                            sharp(buffer)
                                .resize(500)
                                .toFile(ROOT_DIR + '/assets/images/' + type + '/' + compressedFileName)
                                .then(function () {
                                    resolve(aFile);
                                });
                        } else {
                            resolve(aFile);
                        }
                    })
                    .pipe(fs.createWriteStream(ROOT_DIR + '/assets/images/' + type + '/' + fileName));
            }).catch(err => {
                if (err) return reject(err);
            });
        });
    } else {
        setTimeout(downloadFile, 1000, aFile, type, resolve, reject);
    }
}