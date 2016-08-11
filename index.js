'use strict';

var P2PSpider = require('./lib');
var write2Database = require('./lib/write2Database');

var config = require('./config');

var p2p = P2PSpider({
    nodesMaxSize: 200,   // be careful
    maxConnections: 400, // be careful
    timeout: 5000
});

p2p.ignore(function (infohash, rinfo, callback) {
    // false => always to download the metadata even though the metadata is exists.
    var theInfohashIsExistsInDatabase = false;
    callback(theInfohashIsExistsInDatabase);
});

var count = 0;
var lengthQueue = config.lengthQueue || 10;
var arrayQueue = [];



var getFullName = function (path) {
    var chrPathSplit = "/";
    var textPath = [];
    for (var i = 0; i < path.length; i++) {
        textPath.push(path[i].toString('utf8'));
    }
    return textPath.join(chrPathSplit);
}

p2p.on('metadata', function (metadata) {
    var data = {};
    data.name = metadata.info.name ? metadata.info.name.toString('utf8') : '';
    if (!data.name) { return; }

    data.hash = metadata.infohash;
    data.magnet = metadata.magnet;
    data.length = 0;
    data.fetchedAt = new Date();
    data.files = [];

    arrayQueue.push(data);

    if (metadata.info.files) {

        for (var i = 0; i < metadata.info.files.length; i++) {
            var itemFileinfo = metadata.info.files[i];

            if (itemFileinfo.path) {

                data.files.push({
                    filename: getFullName(itemFileinfo.path),
                    length: itemFileinfo.length

                });
            }
        }
    } else {

        data.files.push({
            filename: getFullName([metadata.info.name]),
            length: metadata.info.length,

        });

    }


    if (data.files) {
        for (var i = 0; i < data.files.length; i++) {
            var itemFileinfo = data.files[i];
            data.length += itemFileinfo.length;

        }

    }

    if (arrayQueue.length >= lengthQueue) {

        console.log(new Date().toUTCString());
        console.log("writting to database.");

        var subArrayQueue = [].concat(arrayQueue);
        arrayQueue = [];
        write2Database(subArrayQueue, config);


    }
});

if (config.p2p_port.length) {
    for (var i = 0; i < config.p2p_port.length; i++) {
        p2p.listen(config.p2p_port[i], config.p2p_listen);

    }
}