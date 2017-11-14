function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp;
}

module.exports = function(req, res, next) {
    var hashID = req.headers['reqid'];
    var reqTime = req.headers['reqtime'];

    if (!hashID || !reqTime)
        return res.status(401).json({ type: 'validatingDefault', message: 'Req Invalid' });
    if (reqTime <= iatGetDate(-3) || reqTime >= iatGetDate(3))
        return res.status(400).json({ type: 'validatingDefault', message: 'Req Expired' });
    // check reply attack
    next();
};