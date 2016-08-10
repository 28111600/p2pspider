'use strict';

var P2PSpider = require('./lib');
var mysql = require('mysql');

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

var pool = mysql.createPool({
    host: config.db_host,
    user: config.db_user,
    password: config.db_password,
    database: config.db_database,
    port: config.db_port
});

var writetodatabase = function (arrayMetadata, pool) {


}

p2p.on('metadata', function (metadata) {
    var data = {};
    data.name = metadata.info.name ? metadata.info.name.toString('utf8') : '';
    if (!data.name) { return; }

    data.hash = metadata.infohash;
    data.magnet = metadata.magnet;
    data.length = metadata.info.length;
    data.fetchedAt = new Date();
    data.files = [];

    // console.log("add to queue.");
    console.log(data.length);

    return ;
    arrayQueue.push(data);

    if (!metadata.info.files) {
        data.files.push({
            filename: data.name,
            length: data.length,

        });

    }


    if (metadata.info.files) {

        for (var i = 0; i < metadata.info.files.length; i++) {
            var itemFileInfo = metadata.info.files[i];

            if (itemFileInfo.path) {
                data.files.push({
                    filename: itemFileInfo.path[0].toString('utf8'),
                    length: itemFileInfo.length

                })
            }
        }
    }
    console.log(data);


    if (arrayQueue.length >= lengthQueue) {

        console.log(new Date().toUTCString());
        console.log("writting to database.");

        var subArrayQueue = [].concat(arrayQueue);
        arrayQueue = [];



        pool.getConnection(function (err, conn) {

            conn.beginTransaction(function (err) {
                if (err) { throw err; }
                var subCount = 0;

                var arrayPost = [];
                var arrayQuery = [];
                for (var i = 0; i < subArrayQueue.length; i++) {

                    var data = subArrayQueue[i];


                    var post = [data.hash, data.name, data.magnet, data.fetchedAt, data.hash];

                    conn.query('insert into p2pspider (hash,name,magnet,fetched) select * from ( select ?,?,?,? ) as temp where not exists (select * from p2pspider where hash=?);', post, function (err, result) {

                        if (!err) {

                            if (result.affectedRows) {
                                subCount += result.affectedRows;

                                var subPost = [];
                                var subQuery = [];


                                for (var j = 0; j < data.files.length; j++) {
                                    var itemFileinfo = data.files[j];
                                    subPost.push(data.hash, itemFileInfo.filename, itemFileInfo.length);
                                    subQuery.push('insert into p2pspider_files (hash,filename,length) values ( ?,?,? ) ;');

                                }

                                conn.query(subQuery.join(''), subPost, function (err, result) {


                                })

                            }

                        }
                    });
                }

                conn.commit(function (err) {

                    if (err) {
                        conn.rollback(function () {
                            throw err;
                        });
                    }
                    count += subCount;
                    console.log(subCount + ' / ' + count);
                    console.log('success!');

                    conn.release();

                });

            });
        })
    }
});

/*
{ info: 
   { files: [ [Object], [Object] ],
     name: 'VNDS-3070',
     'piece length': 2097152,
     pieces: <Buffer 69 25 00 32 11 a9 83 3e 1f 51 5e 86 b9 08 1b e0 cd da 5d 5c 05 a3 3b 2f 08 4b 1a b4 3d 55 e1 5c 14 1e e2 5e c3 ee 5d 2e 4b a0 05 e0 fe be e2 c8 f6 41 ... > },
  address: '125.205.199.222',
  port: 22695,
  infohash: '598373d041d9378cfa28e3cbda4305767477ff4d',
  magnet: 'magnet:?xt=urn:btih:598373d041d9378cfa28e3cbda4305767477ff4d' }

 */
if (config.p2p_port.length) {
    for (var i = 0; i < config.p2p_port.length; i++) {
        p2p.listen(config.p2p_port[i], config.p2p_listen);

    }
}