const config = require('../config/config');

const debug = require('../helpers/debugger')('mongo');
const appInit = require('../helpers/appInit');

const Box = require('./DB/boxDB');
const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const getDeliveryContent = require('../helpers/tools').getDeliverContent;
const hash = require('object-hash');

function migrateDeliveryListBox() {
    Box.find({})
        .exec((err, boxes)=>{
            if (err) return
            boxes.forEach(box=>{
                if (box.deliveringDate === undefined) {
                    let action = box.action.slice().reverse().find(action => action.boxAction === BoxAction.Deliver)

                    if (!action) {
                        action = box.action.slice().reverse().find(action => action.boxStatus === BoxStatus.Delivering)
                    }

                    const date = action && action.timestamps
                    box.deliveringDate = date
                }

                if (box.containerList.length) {
                    let content = getDeliveryContent(box.containerList)
                    box.containerHash = hash(content)
                } else {
                    const object = box.boxOrderContent.map(content=>({amount: content.amount, containerType: content.containerType}))
                    box.containerHash = hash(object, { excludeKeys: (key) => '_id' === key, unorderedArrays: true, ignoreUnknown: true})
                }

                box.save()
            })
        })
}

module.exports = function (mongoose, done) {
    mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
        if (err) throw err;
        debug.log('mongoDB connect succeed');
        // require('../tmp/checkUserPoint.js')
        appInit.beforeStartUp(() => {
            done();
            migrateDeliveryListBox();
            appInit.afterStartUp();
        });
    });
};
