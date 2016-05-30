connect-couchbase
=================

NodeJS Session Store for Couchbase backed applications.

````
npm install connect-couchbase
````

This is based off of connect-redis, found at https://github.com/visionmedia/connect-redis.
You can use like so, when setting up your Express 4.x app:

````
var debug = require('debug')('Couchbase Session Store Example)
var session = require('express-session');
var CouchbaseStore = require('connect-couchbase')(session);
var couchbaseStore = new CouchbaseStore({
    bucket:"default",               //optional
    host:"127.0.0.1:8091",          //optional
    connectionTimeout: 2000,        //optional
    operationTimeout: 2000,         //optional
    cachefile: '',                  //optional
    ttl: 86400,                     //optional
    prefix: 'sess'                  //optional
});

/*
     *          cachefile: ''
     *          ttl: 86400,
     *          prefix: 'sess',
     *          operationTimeout:2000,
                connectionTimeout:2000,*/

couchbaseStore.on('connect', function() {
    debug("Couchbase Session store is ready for use");
});


couchbaseStore.on('disconnect', function() {
    debug("An error occurred connecting to Couchbase Session Storage");
});


var app = express();
app.use(session({
    store: couchbaseStore,
    secret: 'your secret',
    cookie: {maxAge:24*60*60*1000} //stay open for 1 day of inactivity
}));
````

Please file any bugs at https://github.com/christophermina/connect-couchbase/issues
