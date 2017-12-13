var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var GoogleAuth = require('google-auth-library');
var debug = require('debug')('goodtogo_backend:google_sheet');

var authFactory = new GoogleAuth();
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly', ''];

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
    getContainer: function() {
        googleAuth(function getSheet(auth) {
            var sheets = google.sheets('v4');
            sheets.spreadsheets.values.batchGet({
                auth: auth,
                spreadsheetId: '1wgd6RgTs5TXfFhX6g8DBNFqr_V7tSTyWC9BqAeFVOyQ',
                ranges: ['container_type!A2:C', 'container!A2:C'],
            }, function(err, response) {
                if (err) {
                    debug('The API returned an error: ' + err);
                    return;
                }
                var rows = response.valueRanges[0].values;
                if (rows.length == 0) {
                    debug('No data found.');
                } else {
                    console.log('Name, Major:');
                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        console.log('%s, %s', row[1], row[2]);
                    }
                }
                rows = response.valueRanges[1].values;
                if (rows.length == 0) {
                    debug('No data found.');
                } else {
                    console.log('Name, Major:');
                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        console.log('%s, %s', row[1], row[2]);
                    }
                }
            });
        });
    },
    getStore: function() {
        googleAuth(function getSheet(auth) {
            var sheets = google.sheets('v4');
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: '1FEHPNjY2jITITTxvYkKiicVXddYTqQYvuLRGuC99jFg',
                range: 'container_type!A2:C',
            }, function(err, response) {
                if (err) {
                    debug('The API returned an error: ' + err);
                    return;
                }
                var rows = response.values;
                if (rows.length == 0) {
                    debug('No data found.');
                } else {
                    console.log('Name, Major:');
                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        console.log('%s, %s', row[1], row[2]);
                    }
                }
            });
        });
    }
};