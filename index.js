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
    data.length = 0;
    data.fetchedAt = new Date();
    data.files = [];

    arrayQueue.push(data);



    if (metadata.info.files) {

        for (var i = 0; i < metadata.info.files.length; i++) {
            var itemFileinfo = metadata.info.files[i];

            if (itemFileinfo.path) {
                data.files.push({
                    filename: itemFileinfo.path[0].toString('utf8'),
                    length: itemFileinfo.length

                })
            }
        }
    } else {

        data.files.push({
            filename: data.name,
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

        pool.getConnection(function (err, conn) {

            conn.beginTransaction(function (err) {
                if (err) { throw err; }
                var subCount = 0;

                var arrayPost = [];
                var arrayQuery = [];
                var completed = 0;

                for (var i = 0; i < subArrayQueue.length; i++) {
                    var data = subArrayQueue[i];
                    completed += data.files.length;
                }
                for (var i = 0; i < subArrayQueue.length; i++) {

                    var data = subArrayQueue[i];


                    var post = [data.hash, data.name, data.length, data.magnet, data.fetchedAt, data.hash];
                    var query = 'insert into p2pspider (hash,name,length,magnet,fetched) select * from ( select ?,?,?,?,? ) as temp where not exists (select * from p2pspider where hash=?);';

                    conn.query(query, post, function (err, result) {
                        console.log(1)
                        if (!err) {

                            if (result.affectedRows) {
                                subCount += result.affectedRows;

                                if (data.files.length === 0) { console.log(metadata); }

                                var completed = data.files.length;
                                for (var j = 0; j < data.files.length; j++) {
                                    var itemFileinfo = data.files[j];
                                    var post = [data.hash, itemFileinfo.filename, itemFileinfo.length];
                                    var query = 'insert into p2pspider_files (hash,filename,length) values ( ?,?,? ) ;';

                                    conn.query(query, post, function (err, result) {
                                        console.log(2);
                                        completed -= 1;

                                        if (completed === 0) {

                                            conn.commit(function (err) {
                                                console.log(3);
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



                                        }
                                        if (err) {
                                            console.log(query, post);
                                            throw err;
                                        }

                                        if (result.affectedRows === 0) {

                                            console.log(metadata);
                                        }
                                    })

                                }




                            }

                        }
                    });
                }


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