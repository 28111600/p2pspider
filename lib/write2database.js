
var mysql = require('mysql');

var write2Database = function (arrayQueue, config) {
    var conn = mysql.createConnection({
        host: config.db_host,
        user: config.db_user,
        password: config.db_password,
        database: config.db_database,
        port: config.db_port
    });

    conn.beginTransaction(function (err) {
        if (err) { throw err; }
        var subCount = 0;

        var arrayPost = [];
        var arrayQuery = [];



        for (var i = 0; i < subArrayQueue.length; i++) {

            var data = subArrayQueue[i];


            for (var j = 0; j < data.files.length; j++) {

                var itemFileinfo = data.files[j];
                var post = [data.hash, itemFileinfo.filename, itemFileinfo.length, data.hash];
                var query = 'insert into p2pspider_files (hash,filename,length) select * from ( select ?,?,? ) as temp where not exists (select * from p2pspider where hash=?);';

                conn.query(query, post, function (err, result) {

                });
            };


            var post = [data.hash, data.name, data.length, data.magnet, data.fetchedAt, data.hash];
            var query = 'insert into p2pspider (hash,name,length,magnet,fetched) select * from ( select ?,?,?,?,? ) as temp where not exists (select * from p2pspider where hash=?);';

            conn.query(query, post, function (err, result) {

                if (!err) {

                    if (result.affectedRows) {
                        subCount += result.affectedRows;

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

            conn.end();

        });



    });

}

module.exports = write2Database;