const debug = require('../debugger')('google_img_downloader');
const fs = require("fs");
const request = require("axios");
const intReLength = require("../toolkit").intReLength;
const ROOT_DIR = require("../../config/config").staticFileDir;
const PLACE_API_KEY = require("../../config/config").google.apikeys.place;

let downloadingCtr = 0;
let taskQueue = [];

const CONCURRENT_LIMIT = 5;
const BASE_URL = "https://maps.googleapis.com/maps/api/place/photo";

module.exports = {
    downloadImg: function (task) {
        if (Array.isArray(task)) taskQueue = taskQueue.concat(task);
        else taskQueue.push(task);
        startDownloading();
    }
}

function startDownloading() {
    if (taskQueue.length > 0 && downloadingCtr <= CONCURRENT_LIMIT) {
        let theTask = taskQueue.shift();
        downloadingCtr++;
        downloadImg(theTask);
        if (downloadingCtr <= CONCURRENT_LIMIT) startDownloading();
    }
}

function finishDownloading() {
    downloadingCtr--;
    startDownloading();
}

function downloadImg(theTask) {
    const storeID = theTask.storeID;
    const ref = theTask.ref;
    const fileName = intReLength(storeID, 5) + '_google.jpg';
    request({
            method: 'get',
            url: BASE_URL,
            responseType: 'stream',
            params: {
                key: PLACE_API_KEY,
                photoreference: ref,
                maxwidth: 200
            }
        })
        .then(function (response) {
            response.data.pipe(fs.createWriteStream(`${ROOT_DIR}/assets/images/shop/${fileName}`));
        })
        .catch(debug.error)
        .finally(finishDownloading);
}