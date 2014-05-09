/**
 * Created by christophermina on 5/9/14.
 */


/**
 * Module dependencies.
 */

var assert = require('assert')
    , session = require('express-session')
    , CouchbaseStore = require('./')(session);

var store = new CouchbaseStore({host:"127.0.0.1:8091", bucket:"default"});

store.on('connect', function(){
    // #set()
    store.set('123', { cookie: { maxAge: 2000 }, name: 'cm' }, function(err, ok){
        assert.ok(!err, '#set() got an error');
        assert.ok(ok, '#set() is not ok');

        // #get()
        store.get('123', function(err, data){
            console.log("RETRIEVED: " + data.name);
            assert.ok(!err, '#get() got an error');
            assert.deepEqual({ cookie: { maxAge: 2000 }, name: 'cm' }, data);

            // #set null
            store.set('123', { cookie: { maxAge: 2000 }, name: 'cm' }, function(err){
                if (err) {
                    console.log("AN ERROR OCCURRED SETTING SESSION: " + err);
                }

                store.destroy('123', function(err){
                    if (err) {
                        console.log("AN ERROR OCCURRED DESTROYING SESSION: " + err);
                    }

                    console.log('done');
                    store.client.shutdown();
                    process.exit(0);
                });
            });
            throw new Error('Error in fn');
        });
    });
});

process.once('uncaughtException', function (err) {
    assert.ok(err.message === 'Error in fn', '#get() catch wrong error');
});
