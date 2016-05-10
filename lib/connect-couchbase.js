/*!
 * Connect - Couchbase
 * Copyright(c) 2014 Christopher Mina <christopher.mina@gmail.com>
 *
 * MIT Licensed
 *
 * This is an adaption from connect-redis, see:
 * https://github.com/visionmedia/connect-redis
 */

'use strict'

/**
 * Module dependencies.
 */

var debug = require('debug')('connect:couchbase');

/**
 * One day in seconds.
 */

var oneDay = 86400;

/**
 * No op
 */
var noop = function () {};

/**
 * Return the `CouchbaseStore` extending `express`'s session Store.
 *
 * @param {object} express session
 * @return {Function}
 * @api public
 */

module.exports = function(session){

    /**
     * Express's session Store.
     */

    var Store = session.Store;

    /**
     * Initialize CouchbaseStore with the given `options`.
     *
     * @param {Object} options
     *      {
     *          host: 127.0.0.1:8091 (default) -- Can be one or more address:ports, separated by semi-colon, or an array
     *          username: '',   -- Should be same as bucket name, if provided
     *          password: '',
     *          bucket: 'default' (default)
     *          cachefile: ''
     *          ttl: 86400,
     *          prefix: 'sess',
     *          operationTimeout:2000,
                connectionTimeout:2000,
     *      }
     * @api public
     */

    function CouchbaseStore(options) {
        var self = this;

        options = options || {};
        Store.call(this, options);
        this.prefix = null == options.prefix
            ? 'sess:'
            : options.prefix;

        var connectOptions = {};
        if (options.hasOwnProperty("host")) {
            connectOptions.host = options.host;
        } else if (options.hasOwnProperty("hosts")) {
            connectOptions.host = options.hosts;
        }

        if (options.hasOwnProperty("username")) {
            connectOptions.username = options.username;
        }

        if (options.hasOwnProperty("password")) {
            connectOptions.password = options.password;
        }

        if (options.hasOwnProperty("bucket")) {
            connectOptions.bucket = options.bucket;
        }

        if (options.hasOwnProperty("cachefile")) {
            connectOptions.cachefile = options.cachefile;
        }

        if (options.hasOwnProperty("connectionTimeout")) {
            connectOptions.connectionTimeout = options.connectionTimeout;
        }

        if (options.hasOwnProperty("operationTimeout")) {
            connectOptions.operationTimeout = options.operationTimeout;
        }

        if (options.hasOwnProperty("db")) {
            connectOptions.db = options.db; // DB Instance
        }

        if ( typeof(connectOptions.db) != 'undefined' ) {
            this.client = connectOptions.db;
        } else {
            var Couchbase = require('couchbase');
            var cluster = new Couchbase.Cluster(connectOptions.host);

            this.client = cluster.openBucket(connectOptions.bucket, connectOptions.password, function(err) {
                if (err) {
                    console.log("Could not connect to couchbase with bucket: " + connectOptions.bucket);
                    self.emit('disconnect');
                } else {
                    self.emit('connect');
                }
            });
        }

        this.client.connectionTimeout = connectOptions.connectionTimeout || 10000;
        this.client.operationTimeout = connectOptions.operationTimeout || 10000;

        this.ttl = options.ttl || null;
    }

    /**
     * Inherit from `Store`.
     */

    CouchbaseStore.prototype.__proto__ = Store.prototype;

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {String} sid
     * @param {Function} fn
     * @api public
     */

    CouchbaseStore.prototype.get = function(sid, fn){
        if ('function' !== typeof fn) { fn = noop; }
        sid = this.prefix + sid;
        debug('GET "%s"', sid);
        this.client.get(sid, function(err, data){
            //Handle Key Not Found error
            if (err && err.code == 13) {
                return fn();
            }
            if (err) return fn(err);
            if (!data || !data.value) return fn();
            var result;
            data = data.value.toString();
            debug('GOT %s', data);
            try {
                result = JSON.parse(data);
            } catch (err) {
                return fn(err);
            }
            return fn(null, result);
        });
    };

    /**
     * Commit the given `sess` object associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

    CouchbaseStore.prototype.set = function(sid, sess, fn){
        if ('function' !== typeof fn) { fn = noop; }
        sid = this.prefix + sid;
        try {

            var maxAge = sess.cookie.maxAge
                , ttl = this.ttl || ('number' == typeof maxAge
                    ? maxAge / 1000 | 0
                    : oneDay)
                ;

            if (ttl > 0) {
                sess.lastModified = new Date();
            }

            sess = JSON.stringify(sess);

            debug('SETEX "%s" ttl:%s %s', sid, ttl, sess);
            this.client.upsert(sid, sess, {expiry:ttl}, function(err){
                err || debug('Session Set complete');
                fn && fn.apply(this, arguments);
            });
        } catch (err) {
            fn && fn(err);
        }
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {String} sid
     * @api public
     */

    CouchbaseStore.prototype.destroy = function(sid, fn){
        if ('function' !== typeof fn) { fn = noop; }
        sid = this.prefix + sid;
        this.client.remove(sid, fn);
    };


    /**
     * Refresh the time-to-live for the session with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} sess
     * @param {Function} fn
     * @api public
     */

    CouchbaseStore.prototype.touch = function (sid, sess, fn) {
        if ('function' !== typeof fn) { fn = noop; }

        var sid = this.prefix + sid
            , maxAge = sess.cookie.maxAge
            , ttl = this.ttl || ('number' == typeof maxAge
                ? maxAge / 1000 | 0
                : oneDay)
            , currentDate = new Date()
            , lastModified = sess.lastModified ? new Date(sess.lastModified).getTime() : 0;

        // if the given options has a touchAfter property, check if the
        // current timestamp - lastModified timestamp is bigger than
        // the specified, if it's not, don't touch the session
        if (ttl > 0 && lastModified > 0) {

            var timeElapsed = currentDate.getTime() - lastModified;

            if (timeElapsed > ttl) {
                sess.lastModified = currentDate;
            }
        }

        sess = JSON.stringify(sess);
        this.client.upsert(sid, sess, {expiry:ttl}, function(err){
            err || debug('Session Touch complete');
            fn && fn.apply(this, arguments);
        });
    };

    return CouchbaseStore;
};
