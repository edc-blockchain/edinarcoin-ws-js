(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.grapheneWS = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// var { List } = require("immutable");
var ChainWebSocket = require("./ChainWebSocket");
var GrapheneApi = require("./GrapheneApi");
var ChainConfig = require("./ChainConfig");

var inst;

/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/

module.exports = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        if (inst) {
            inst.close();
            inst = null;
        }
        inst = new ApisInstance();
        inst.setRpcConnectionStatusCallback(this.statusCb);

        if (inst && connect) {
            inst.connect(cs);
        }

        return inst;
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs);
        }

        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            inst.close();
            inst = null;
        }
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    _createClass(ApisInstance, [{
        key: "connect",


        /** @arg {string} connection .. */
        value: function connect(cs) {
            var _this = this;

            // console.log("INFO\tApiInstances\tconnect\t", cs);

            var rpc_user = "",
                rpc_password = "";
            if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
                throw new Error("Secure domains require wss connection");
            }

            this.ws_rpc = new ChainWebSocket(cs, this.statusCb);

            this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
                // console.log("Login done");
                _this._db = new GrapheneApi(_this.ws_rpc, "database");
                _this._net = new GrapheneApi(_this.ws_rpc, "network_broadcast");
                _this._hist = new GrapheneApi(_this.ws_rpc, "history");
                _this._crypt = new GrapheneApi(_this.ws_rpc, "crypto");
                var db_promise = _this._db.init().then(function () {
                    //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                    return _this._db.exec("get_chain_id", []).then(function (_chain_id) {
                        _this.chain_id = _chain_id;
                        return ChainConfig.setChainId(_chain_id);
                        //DEBUG console.log("chain_id1",this.chain_id)
                    });
                });
                _this.ws_rpc.on_reconnect = function () {
                    _this.ws_rpc.login("", "").then(function () {
                        _this._db.init().then(function () {
                            if (_this.statusCb) _this.statusCb("reconnect");
                        });
                        _this._net.init();
                        _this._hist.init();
                        _this._crypt.init();
                    });
                };
                return Promise.all([db_promise, _this._net.init(), _this._hist.init(), _this._crypt.init()
                // Temporary squash crypto API error until the API is upgraded everywhere
                .catch(function (e) {
                    return console.error("ApiInstance\tCrypto API Error", e);
                })]);
            });
        }
    }, {
        key: "close",
        value: function close() {
            if (this.ws_rpc) this.ws_rpc.close();
            this.ws_rpc = null;
        }
    }, {
        key: "db_api",
        value: function db_api() {
            return this._db;
        }
    }, {
        key: "network_api",
        value: function network_api() {
            return this._net;
        }
    }, {
        key: "history_api",
        value: function history_api() {
            return this._hist;
        }
    }, {
        key: "crypto_api",
        value: function crypto_api() {
            return this._crypt;
        }
    }, {
        key: "setRpcConnectionStatusCallback",
        value: function setRpcConnectionStatusCallback(callback) {
            this.statusCb = callback;
        }
    }]);

    return ApisInstance;
}();
},{"./ChainConfig":2,"./ChainWebSocket":3,"./GrapheneApi":4}],2:[function(require,module,exports){
(function (process){
"use strict";

var _this;

var ecc_config = {
	address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "EDC"
};

module.exports = _this = {
	core_asset: "EDC",
	address_prefix: "EDC",
	expire_in_secs: 15,
	expire_in_secs_proposal: 24 * 60 * 60,
	networks: {
		Edinar: {
			core_asset: "EDC",
			address_prefix: "EDC",
			chain_id: "979b29912e5546dbf47604692aafc94519f486c56221a5705f0c7f5f294df126"
		}
	},

	/** Set a few properties for known chain IDs. */
	setChainId: function setChainId(chain_id) {

		var i, len, network, network_name, ref;
		ref = Object.keys(_this.networks);

		for (i = 0, len = ref.length; i < len; i++) {

			network_name = ref[i];
			network = _this.networks[network_name];

			if (network.chain_id === chain_id) {

				_this.network_name = network_name;

				if (network.address_prefix) {
					_this.address_prefix = network.address_prefix;
					ecc_config.address_prefix = network.address_prefix;
				}

				// console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

				return {
					network_name: network_name,
					network: network
				};
			}
		}

		if (!_this.network_name) {
			console.log("Unknown chain id (this may be a testnet)", chain_id);
		}
	},

	reset: function reset() {
		_this.core_asset = "EDC";
		_this.address_prefix = "EDC";
		ecc_config.address_prefix = "EDC";
		_this.expire_in_secs = 15;
		_this.expire_in_secs_proposal = 24 * 60 * 60;

		console.log("Chain config reset");
	},

	setPrefix: function setPrefix() {
		var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "EDC";

		_this.address_prefix = prefix;
		ecc_config.address_prefix = prefix;
	}
};
}).call(this,require('_process'))

},{"_process":7}],3:[function(require,module,exports){
(function (process){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = void 0;
if (typeof WebSocket === "undefined" && !process.env.browser) {
    WebSocketClient = require("ws");
} else if (typeof WebSocket !== "undefined") {
    WebSocketClient = require("ReconnectingWebSocket");
}

var SOCKET_DEBUG = false;

var ChainWebSocket = function () {
    function ChainWebSocket(ws_server, statusCb) {
        var _this = this;

        _classCallCheck(this, ChainWebSocket);

        this.statusCb = statusCb;

        try {
            this.ws = new WebSocketClient(ws_server);
        } catch (error) {
            console.error("invalid websocket URL:", error);
            this.ws = new WebSocketClient("wss://127.0.0.1:8080");
        }
        this.ws.timeoutInterval = 5000;
        this.current_reject = null;
        this.on_reconnect = null;
        this.connect_promise = new Promise(function (resolve, reject) {
            _this.current_reject = reject;
            _this.ws.onopen = function () {
                if (_this.statusCb) _this.statusCb("open");
                if (_this.on_reconnect) _this.on_reconnect();
                resolve();
            };
            _this.ws.onerror = function (error) {
                if (_this.statusCb) _this.statusCb("error");

                if (_this.current_reject) {
                    _this.current_reject(error);
                }
            };
            _this.ws.onmessage = function (message) {
                return _this.listener(JSON.parse(message.data));
            };
            _this.ws.onclose = function () {
                if (_this.statusCb) _this.statusCb("closed");
            };
        });
        this.cbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    _createClass(ChainWebSocket, [{
        key: "call",
        value: function call(params) {
            var _this2 = this;

            var method = params[1];
            if (SOCKET_DEBUG) console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

            this.cbId += 1;

            if (method === "set_subscribe_callback" || method === "subscribe_to_market" || method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback") {
                // Store callback in subs map
                this.subs[this.cbId] = {
                    callback: params[2][0]
                };

                // Replace callback with the callback id
                params[2][0] = this.cbId;
            }

            if (method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
                if (typeof params[2][0] !== "function") {
                    throw new Error("First parameter of unsub must be the original callback");
                }

                var unSubCb = params[2].splice(0, 1)[0];

                // Find the corresponding subscription
                for (var id in this.subs) {
                    if (this.subs[id].callback === unSubCb) {
                        this.unsub[this.cbId] = id;
                        break;
                    }
                }
            }

            var request = {
                method: "call",
                params: params
            };
            request.id = this.cbId;

            return new Promise(function (resolve, reject) {
                _this2.cbs[_this2.cbId] = {
                    time: new Date(),
                    resolve: resolve,
                    reject: reject
                };
                _this2.ws.onerror = function (error) {
                    console.log("!!! ChainWebSocket Error ", error);
                    reject(error);
                };
                _this2.ws.send(JSON.stringify(request));
            });
        }
    }, {
        key: "listener",
        value: function listener(response) {
            if (SOCKET_DEBUG) console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

            var sub = false,
                callback = null;

            if (response.method === "notice") {
                sub = true;
                response.id = response.params[0];
            }

            if (!sub) {
                callback = this.cbs[response.id];
            } else {
                callback = this.subs[response.id].callback;
            }

            if (callback && !sub) {
                if (response.error) {
                    callback.reject(response.error);
                } else {
                    callback.resolve(response.result);
                }
                delete this.cbs[response.id];

                if (this.unsub[response.id]) {
                    delete this.subs[this.unsub[response.id]];
                    delete this.unsub[response.id];
                }
            } else if (callback && sub) {
                callback(response.params[1]);
            } else {
                console.log("Warning: unknown websocket response: ", response);
            }
        }
    }, {
        key: "login",
        value: function login(user, password) {
            var _this3 = this;

            return this.connect_promise.then(function () {
                return _this3.call([1, "login", [user, password]]);
            });
        }
    }, {
        key: "close",
        value: function close() {
            this.ws.close();
        }
    }]);

    return ChainWebSocket;
}();

module.exports = ChainWebSocket;
}).call(this,require('_process'))

},{"ReconnectingWebSocket":5,"_process":7,"ws":6}],4:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
    function GrapheneApi(ws_rpc, api_name) {
        _classCallCheck(this, GrapheneApi);

        this.ws_rpc = ws_rpc;
        this.api_name = api_name;
    }

    _createClass(GrapheneApi, [{
        key: "init",
        value: function init() {
            var self = this;
            return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
                //console.log("[GrapheneApi.js:11] ----- GrapheneApi.init ----->", this.api_name, response);
                self.api_id = response;
                return self;
            });
        }
    }, {
        key: "exec",
        value: function exec(method, params) {
            return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
                console.log("!!! GrapheneApi error: ", method, params, error, JSON.stringify(error));
                throw error;
            });
        }
    }]);

    return GrapheneApi;
}();

module.exports = GrapheneApi;
},{}],5:[function(require,module,exports){
// MIT License:
//
// Copyright (c) 2010-2012, Joe Walnes
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it successfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new ReconnectingWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API, apart from the following members:
 *
 * - `bufferedAmount`
 * - `extensions`
 * - `binaryType`
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 *
 * Syntax
 * ======
 * var socket = new ReconnectingWebSocket(url, protocols, options);
 *
 * Parameters
 * ==========
 * url - The url you are connecting to.
 * protocols - Optional string or array of protocols.
 * options - See below
 *
 * Options
 * =======
 * Options can either be passed upon instantiation or set after instantiation:
 *
 * var socket = new ReconnectingWebSocket(url, null, { debug: true, reconnectInterval: 4000 });
 *
 * or
 *
 * var socket = new ReconnectingWebSocket(url);
 * socket.debug = true;
 * socket.reconnectInterval = 4000;
 *
 * debug
 * - Whether this instance should log debug messages. Accepts true or false. Default: false.
 *
 * automaticOpen
 * - Whether or not the websocket should attempt to connect immediately upon instantiation. The socket can be manually opened or closed at any time using ws.open() and ws.close().
 *
 * reconnectInterval
 * - The number of milliseconds to delay before attempting to reconnect. Accepts integer. Default: 1000.
 *
 * maxReconnectInterval
 * - The maximum number of milliseconds to delay a reconnection attempt. Accepts integer. Default: 30000.
 *
 * reconnectDecay
 * - The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. Accepts integer or float. Default: 1.5.
 *
 * timeoutInterval
 * - The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. Accepts integer. Default: 2000.
 *
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module !== 'undefined' && module.exports){
        module.exports = factory();
    } else {
        global.ReconnectingWebSocket = factory();
    }
})(this, function () {

    if (typeof window === "undefined" || !('WebSocket' in window)) {
        return;
    }

    function ReconnectingWebSocket(url, protocols, options) {

        // Default settings
        var settings = {

            /** Whether this instance should log debug messages. */
            debug: false,

            /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
            automaticOpen: true,

            /** The number of milliseconds to delay before attempting to reconnect. */
            reconnectInterval: 1000,
            /** The maximum number of milliseconds to delay a reconnection attempt. */
            maxReconnectInterval: 30000,
            /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
            reconnectDecay: 1.5,

            /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
            timeoutInterval: 2000,

            /** The maximum number of reconnection attempts to make. Unlimited if null. */
            maxReconnectAttempts: null,

            /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
            binaryType: 'blob'
        }
        if (!options) { options = {}; }

        // Overwrite and define settings with options if they exist.
        for (var key in settings) {
            if (typeof options[key] !== 'undefined') {
                this[key] = options[key];
            } else {
                this[key] = settings[key];
            }
        }

        // These should be treated as read-only properties

        /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
        this.url = url;

        /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
        this.reconnectAttempts = 0;

        /**
         * The current state of the connection.
         * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
         * Read only.
         */
        this.readyState = WebSocket.CONNECTING;

        /**
         * A string indicating the name of the sub-protocol the server selected; this will be one of
         * the strings specified in the protocols parameter when creating the WebSocket object.
         * Read only.
         */
        this.protocol = null;

        // Private state variables

        var self = this;
        var ws;
        var forcedClose = false;
        var timedOut = false;
        var t = null;
        var eventTarget = document.createElement('div');

        // Wire up "on*" properties as event handlers

        eventTarget.addEventListener('open',       function(event) { self.onopen(event); });
        eventTarget.addEventListener('close',      function(event) { self.onclose(event); });
        eventTarget.addEventListener('connecting', function(event) { self.onconnecting(event); });
        eventTarget.addEventListener('message',    function(event) { self.onmessage(event); });
        eventTarget.addEventListener('error',      function(event) { self.onerror(event); });

        // Expose the API required by EventTarget

        this.addEventListener = eventTarget.addEventListener.bind(eventTarget);
        this.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
        this.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);

        /**
         * This function generates an event that is compatible with standard
         * compliant browsers and IE9 - IE11
         *
         * This will prevent the error:
         * Object doesn't support this action
         *
         * http://stackoverflow.com/questions/19345392/why-arent-my-parameters-getting-passed-through-to-a-dispatched-event/19345563#19345563
         * @param s String The name that the event should use
         * @param args Object an optional object that the event will use
         */
        function generateEvent(s, args) {
        	var evt = document.createEvent("CustomEvent");
        	evt.initCustomEvent(s, false, false, args);
        	return evt;
        };

        this.open = function (reconnectAttempt) {
            ws = new WebSocket(self.url, protocols || []);
            ws.binaryType = this.binaryType;

            if (reconnectAttempt) {
                if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
                    return;
                }
            } else {
                eventTarget.dispatchEvent(generateEvent('connecting'));
                this.reconnectAttempts = 0;
            }

            if (self.debug || ReconnectingWebSocket.debugAll) {
                console.debug('ReconnectingWebSocket', 'attempt-connect', self.url);
            }

            var localWs = ws;
            var timeout = setTimeout(function() {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'connection-timeout', self.url);
                }
                timedOut = true;
                localWs.close();
                timedOut = false;
            }, self.timeoutInterval);

            ws.onopen = function(event) {
                clearTimeout(timeout);
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onopen', self.url);
                }
                self.protocol = ws.protocol;
                self.readyState = WebSocket.OPEN;
                self.reconnectAttempts = 0;
                var e = generateEvent('open');
                e.isReconnect = reconnectAttempt;
                reconnectAttempt = false;
                eventTarget.dispatchEvent(e);
            };

            ws.onclose = function(event) {
                clearTimeout(timeout);
                ws = null;
                if (forcedClose) {
                    self.readyState = WebSocket.CLOSED;
                    eventTarget.dispatchEvent(generateEvent('close'));
                } else {
                    self.readyState = WebSocket.CONNECTING;
                    var e = generateEvent('connecting');
                    e.code = event.code;
                    e.reason = event.reason;
                    e.wasClean = event.wasClean;
                    eventTarget.dispatchEvent(e);
                    if (!reconnectAttempt && !timedOut) {
                        if (self.debug || ReconnectingWebSocket.debugAll) {
                            console.debug('ReconnectingWebSocket', 'onclose', self.url);
                        }
                        eventTarget.dispatchEvent(generateEvent('close'));
                    }

                    var timeout = self.reconnectInterval * Math.pow(self.reconnectDecay, self.reconnectAttempts);
                    t = setTimeout(function() {
                        self.reconnectAttempts++;
                        self.open(true);
                    }, timeout > self.maxReconnectInterval ? self.maxReconnectInterval : timeout);
                }
            };
            ws.onmessage = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
                }
                var e = generateEvent('message');
                e.data = event.data;
                eventTarget.dispatchEvent(e);
            };
            ws.onerror = function(event) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'onerror', self.url, event);
                }
                eventTarget.dispatchEvent(generateEvent('error'));
            };
        }

        // Whether or not to create a websocket upon instantiation
        if (this.automaticOpen == true) {
            this.open(false);
        }

        /**
         * Transmits data to the server over the WebSocket connection.
         *
         * @param data a text string, ArrayBuffer or Blob to send to the server.
         */
        this.send = function(data) {
            if (ws) {
                if (self.debug || ReconnectingWebSocket.debugAll) {
                    console.debug('ReconnectingWebSocket', 'send', self.url, data);
                }
                return ws.send(data);
            } else {
                throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
            }
        };

        /**
         * Closes the WebSocket connection or connection attempt, if any.
         * If the connection is already CLOSED, this method does nothing.
         */
        this.close = function(code, reason) {
            // Default CLOSE_NORMAL code
            if (typeof code == 'undefined') {
                code = 1000;
            }
            forcedClose = true;
            if (ws) {
                ws.close(code, reason);
            }
            if (t) {
                clearTimeout(t);
                t = null;
            }
        };

        /**
         * Additional public API method to refresh the connection if still open (close, re-open).
         * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
         */
        this.refresh = function() {
            if (ws) {
                ws.close();
            }
        };
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data.
     */
    ReconnectingWebSocket.prototype.onopen = function(event) {};
    /** An event listener to be called when the WebSocket connection's readyState changes to CLOSED. */
    ReconnectingWebSocket.prototype.onclose = function(event) {};
    /** An event listener to be called when a connection begins being attempted. */
    ReconnectingWebSocket.prototype.onconnecting = function(event) {};
    /** An event listener to be called when a message is received from the server. */
    ReconnectingWebSocket.prototype.onmessage = function(event) {};
    /** An event listener to be called when an error occurs. */
    ReconnectingWebSocket.prototype.onerror = function(event) {};

    /**
     * Whether all instances of ReconnectingWebSocket should log debug messages.
     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
     */
    ReconnectingWebSocket.debugAll = false;

    ReconnectingWebSocket.CONNECTING = WebSocket.CONNECTING;
    ReconnectingWebSocket.OPEN = WebSocket.OPEN;
    ReconnectingWebSocket.CLOSING = WebSocket.CLOSING;
    ReconnectingWebSocket.CLOSED = WebSocket.CLOSED;

    return ReconnectingWebSocket;
});

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L3NyYy9BcGlJbnN0YW5jZXMuanMiLCJkaXN0L3NyYy9DaGFpbkNvbmZpZy5qcyIsImRpc3Qvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiZGlzdC9zcmMvR3JhcGhlbmVBcGkuanMiLCJub2RlX21vZHVsZXMvUmVjb25uZWN0aW5nV2ViU29ja2V0L3JlY29ubmVjdGluZy13ZWJzb2NrZXQuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFhBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG4vLyB2YXIgeyBMaXN0IH0gPSByZXF1aXJlKFwiaW1tdXRhYmxlXCIpO1xudmFyIENoYWluV2ViU29ja2V0ID0gcmVxdWlyZShcIi4vQ2hhaW5XZWJTb2NrZXRcIik7XG52YXIgR3JhcGhlbmVBcGkgPSByZXF1aXJlKFwiLi9HcmFwaGVuZUFwaVwiKTtcbnZhciBDaGFpbkNvbmZpZyA9IHJlcXVpcmUoXCIuL0NoYWluQ29uZmlnXCIpO1xuXG52YXIgaW5zdDtcblxuLyoqXG4gICAgQ29uZmlndXJlOiBjb25maWd1cmUgYXMgZm9sbG93cyBgQXBpcy5pbnN0YW5jZShcIndzOi8vbG9jYWxob3N0OjgwOTBcIikuaW5pdF9wcm9taXNlYC4gIFRoaXMgcmV0dXJucyBhIHByb21pc2UsIG9uY2UgcmVzb2x2ZWQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkuXG5cbiAgICBJbXBvcnQ6IGltcG9ydCB7IEFwaXMgfSBmcm9tIFwiQGdyYXBoZW5lL2NoYWluXCJcblxuICAgIFNob3J0LWhhbmQ6IEFwaXMuZGIoXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi4pLiAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuXG4gICAgQWRkaXRpb25hbCB1c2FnZTogQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMoXCJtZXRob2RcIiwgW1wibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uXSkuICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjazogZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKGluc3QpIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICAgIEBhcmcge3N0cmluZ30gY3MgaXMgb25seSBwcm92aWRlZCBpbiB0aGUgZmlyc3QgY2FsbFxuICAgICAgICBAcmV0dXJuIHtBcGlzfSBzaW5nbGV0b24gLi4gQ2hlY2sgQXBpcy5pbnN0YW5jZSgpLmluaXRfcHJvbWlzZSB0byBrbm93IHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWRcbiAgICAqL1xuICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG5cbiAgICAgICAgaWYgKGluc3QpIHtcbiAgICAgICAgICAgIGluc3QuY2xvc2UoKTtcbiAgICAgICAgICAgIGluc3QgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKHRoaXMuc3RhdHVzQ2IpO1xuXG4gICAgICAgIGlmIChpbnN0ICYmIGNvbm5lY3QpIHtcbiAgICAgICAgICAgIGluc3QuY29ubmVjdChjcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9LFxuICAgIGluc3RhbmNlOiBmdW5jdGlvbiBpbnN0YW5jZSgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG5cbiAgICAgICAgaWYgKCFpbnN0KSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEFwaXNJbnN0YW5jZSgpO1xuICAgICAgICAgICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICAgICAgICBpbnN0LmNvbm5lY3QoY3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfSxcbiAgICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgICAgICByZXR1cm4gQXBpcy5pbnN0YW5jZSgpLmNoYWluX2lkO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIGlmIChpbnN0KSB7XG4gICAgICAgICAgICBpbnN0LmNsb3NlKCk7XG4gICAgICAgICAgICBpbnN0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBkYjogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIG5ldHdvcms6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5uZXR3b3JrX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGhpc3Rvcnk6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5oaXN0b3J5X2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAgIC8vIGNyeXB0bzogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmNyeXB0b19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKVxufTtcblxudmFyIEFwaXNJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBcGlzSW5zdGFuY2UoKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBBcGlzSW5zdGFuY2UpO1xuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhBcGlzSW5zdGFuY2UsIFt7XG4gICAgICAgIGtleTogXCJjb25uZWN0XCIsXG5cblxuICAgICAgICAvKiogQGFyZyB7c3RyaW5nfSBjb25uZWN0aW9uIC4uICovXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBjb25uZWN0KGNzKSB7XG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIklORk9cXHRBcGlJbnN0YW5jZXNcXHRjb25uZWN0XFx0XCIsIGNzKTtcblxuICAgICAgICAgICAgdmFyIHJwY191c2VyID0gXCJcIixcbiAgICAgICAgICAgICAgICBycGNfcGFzc3dvcmQgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiBjcy5pbmRleE9mKFwid3NzOi8vXCIpIDwgMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY3VyZSBkb21haW5zIHJlcXVpcmUgd3NzIGNvbm5lY3Rpb25cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMud3NfcnBjID0gbmV3IENoYWluV2ViU29ja2V0KGNzLCB0aGlzLnN0YXR1c0NiKTtcblxuICAgICAgICAgICAgdGhpcy5pbml0X3Byb21pc2UgPSB0aGlzLndzX3JwYy5sb2dpbihycGNfdXNlciwgcnBjX3Bhc3N3b3JkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkxvZ2luIGRvbmVcIik7XG4gICAgICAgICAgICAgICAgX3RoaXMuX2RiID0gbmV3IEdyYXBoZW5lQXBpKF90aGlzLndzX3JwYywgXCJkYXRhYmFzZVwiKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5fbmV0ID0gbmV3IEdyYXBoZW5lQXBpKF90aGlzLndzX3JwYywgXCJuZXR3b3JrX2Jyb2FkY2FzdFwiKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5faGlzdCA9IG5ldyBHcmFwaGVuZUFwaShfdGhpcy53c19ycGMsIFwiaGlzdG9yeVwiKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5fY3J5cHQgPSBuZXcgR3JhcGhlbmVBcGkoX3RoaXMud3NfcnBjLCBcImNyeXB0b1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgZGJfcHJvbWlzZSA9IF90aGlzLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL2NyeXB0b25vbWV4L2dyYXBoZW5lL3dpa2kvY2hhaW4tbG9ja2VkLXR4XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fZGIuZXhlYyhcImdldF9jaGFpbl9pZFwiLCBbXSkudGhlbihmdW5jdGlvbiAoX2NoYWluX2lkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5jaGFpbl9pZCA9IF9jaGFpbl9pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBDaGFpbkNvbmZpZy5zZXRDaGFpbklkKF9jaGFpbl9pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL0RFQlVHIGNvbnNvbGUubG9nKFwiY2hhaW5faWQxXCIsdGhpcy5jaGFpbl9pZClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgX3RoaXMud3NfcnBjLm9uX3JlY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMud3NfcnBjLmxvZ2luKFwiXCIsIFwiXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwicmVjb25uZWN0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fbmV0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9oaXN0LmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9jcnlwdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtkYl9wcm9taXNlLCBfdGhpcy5fbmV0LmluaXQoKSwgX3RoaXMuX2hpc3QuaW5pdCgpLCBfdGhpcy5fY3J5cHQuaW5pdCgpXG4gICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJ5IHNxdWFzaCBjcnlwdG8gQVBJIGVycm9yIHVudGlsIHRoZSBBUEkgaXMgdXBncmFkZWQgZXZlcnl3aGVyZVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uc29sZS5lcnJvcihcIkFwaUluc3RhbmNlXFx0Q3J5cHRvIEFQSSBFcnJvclwiLCBlKTtcbiAgICAgICAgICAgICAgICB9KV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJjbG9zZVwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy53c19ycGMpIHRoaXMud3NfcnBjLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLndzX3JwYyA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJkYl9hcGlcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGRiX2FwaSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kYjtcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAga2V5OiBcIm5ldHdvcmtfYXBpXCIsXG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiBuZXR3b3JrX2FwaSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9uZXQ7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJoaXN0b3J5X2FwaVwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gaGlzdG9yeV9hcGkoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faGlzdDtcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAga2V5OiBcImNyeXB0b19hcGlcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNyeXB0b19hcGkoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY3J5cHQ7XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2tcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEFwaXNJbnN0YW5jZTtcbn0oKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF90aGlzO1xuXG52YXIgZWNjX2NvbmZpZyA9IHtcblx0YWRkcmVzc19wcmVmaXg6IHByb2Nlc3MuZW52Lm5wbV9jb25maWdfX2dyYXBoZW5lX2VjY19kZWZhdWx0X2FkZHJlc3NfcHJlZml4IHx8IFwiRURDXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3RoaXMgPSB7XG5cdGNvcmVfYXNzZXQ6IFwiRURDXCIsXG5cdGFkZHJlc3NfcHJlZml4OiBcIkVEQ1wiLFxuXHRleHBpcmVfaW5fc2VjczogMTUsXG5cdGV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsOiAyNCAqIDYwICogNjAsXG5cdG5ldHdvcmtzOiB7XG5cdFx0RWRpbmFyOiB7XG5cdFx0XHRjb3JlX2Fzc2V0OiBcIkVEQ1wiLFxuXHRcdFx0YWRkcmVzc19wcmVmaXg6IFwiRURDXCIsXG5cdFx0XHRjaGFpbl9pZDogXCI5NzliMjk5MTJlNTU0NmRiZjQ3NjA0NjkyYWFmYzk0NTE5ZjQ4NmM1NjIyMWE1NzA1ZjBjN2Y1ZjI5NGRmMTI2XCJcblx0XHR9XG5cdH0sXG5cblx0LyoqIFNldCBhIGZldyBwcm9wZXJ0aWVzIGZvciBrbm93biBjaGFpbiBJRHMuICovXG5cdHNldENoYWluSWQ6IGZ1bmN0aW9uIHNldENoYWluSWQoY2hhaW5faWQpIHtcblxuXHRcdHZhciBpLCBsZW4sIG5ldHdvcmssIG5ldHdvcmtfbmFtZSwgcmVmO1xuXHRcdHJlZiA9IE9iamVjdC5rZXlzKF90aGlzLm5ldHdvcmtzKTtcblxuXHRcdGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXG5cdFx0XHRuZXR3b3JrX25hbWUgPSByZWZbaV07XG5cdFx0XHRuZXR3b3JrID0gX3RoaXMubmV0d29ya3NbbmV0d29ya19uYW1lXTtcblxuXHRcdFx0aWYgKG5ldHdvcmsuY2hhaW5faWQgPT09IGNoYWluX2lkKSB7XG5cblx0XHRcdFx0X3RoaXMubmV0d29ya19uYW1lID0gbmV0d29ya19uYW1lO1xuXG5cdFx0XHRcdGlmIChuZXR3b3JrLmFkZHJlc3NfcHJlZml4KSB7XG5cdFx0XHRcdFx0X3RoaXMuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuXHRcdFx0XHRcdGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJJTkZPICAgIENvbmZpZ3VyZWQgZm9yXCIsIG5ldHdvcmtfbmFtZSwgXCI6XCIsIG5ldHdvcmsuY29yZV9hc3NldCwgXCJcXG5cIik7XG5cblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRuZXR3b3JrX25hbWU6IG5ldHdvcmtfbmFtZSxcblx0XHRcdFx0XHRuZXR3b3JrOiBuZXR3b3JrXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCFfdGhpcy5uZXR3b3JrX25hbWUpIHtcblx0XHRcdGNvbnNvbGUubG9nKFwiVW5rbm93biBjaGFpbiBpZCAodGhpcyBtYXkgYmUgYSB0ZXN0bmV0KVwiLCBjaGFpbl9pZCk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcblx0XHRfdGhpcy5jb3JlX2Fzc2V0ID0gXCJFRENcIjtcblx0XHRfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IFwiRURDXCI7XG5cdFx0ZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IFwiRURDXCI7XG5cdFx0X3RoaXMuZXhwaXJlX2luX3NlY3MgPSAxNTtcblx0XHRfdGhpcy5leHBpcmVfaW5fc2Vjc19wcm9wb3NhbCA9IDI0ICogNjAgKiA2MDtcblxuXHRcdGNvbnNvbGUubG9nKFwiQ2hhaW4gY29uZmlnIHJlc2V0XCIpO1xuXHR9LFxuXG5cdHNldFByZWZpeDogZnVuY3Rpb24gc2V0UHJlZml4KCkge1xuXHRcdHZhciBwcmVmaXggPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwiRURDXCI7XG5cblx0XHRfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IHByZWZpeDtcblx0XHRlY2NfY29uZmlnLmFkZHJlc3NfcHJlZml4ID0gcHJlZml4O1xuXHR9XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgV2ViU29ja2V0Q2xpZW50ID0gdm9pZCAwO1xuaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09IFwidW5kZWZpbmVkXCIgJiYgIXByb2Nlc3MuZW52LmJyb3dzZXIpIHtcbiAgICBXZWJTb2NrZXRDbGllbnQgPSByZXF1aXJlKFwid3NcIik7XG59IGVsc2UgaWYgKHR5cGVvZiBXZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBXZWJTb2NrZXRDbGllbnQgPSByZXF1aXJlKFwiUmVjb25uZWN0aW5nV2ViU29ja2V0XCIpO1xufVxuXG52YXIgU09DS0VUX0RFQlVHID0gZmFsc2U7XG5cbnZhciBDaGFpbldlYlNvY2tldCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDaGFpbldlYlNvY2tldCh3c19zZXJ2ZXIsIHN0YXR1c0NiKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENoYWluV2ViU29ja2V0KTtcblxuICAgICAgICB0aGlzLnN0YXR1c0NiID0gc3RhdHVzQ2I7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMud3MgPSBuZXcgV2ViU29ja2V0Q2xpZW50KHdzX3NlcnZlcik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiaW52YWxpZCB3ZWJzb2NrZXQgVVJMOlwiLCBlcnJvcik7XG4gICAgICAgICAgICB0aGlzLndzID0gbmV3IFdlYlNvY2tldENsaWVudChcIndzczovLzEyNy4wLjAuMTo4MDgwXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3MudGltZW91dEludGVydmFsID0gNTAwMDtcbiAgICAgICAgdGhpcy5jdXJyZW50X3JlamVjdCA9IG51bGw7XG4gICAgICAgIHRoaXMub25fcmVjb25uZWN0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5jb25uZWN0X3Byb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBfdGhpcy5jdXJyZW50X3JlamVjdCA9IHJlamVjdDtcbiAgICAgICAgICAgIF90aGlzLndzLm9ub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwib3BlblwiKTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMub25fcmVjb25uZWN0KSBfdGhpcy5vbl9yZWNvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25lcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zdGF0dXNDYikgX3RoaXMuc3RhdHVzQ2IoXCJlcnJvclwiKTtcblxuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5jdXJyZW50X3JlamVjdCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5jdXJyZW50X3JlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIF90aGlzLndzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLmxpc3RlbmVyKEpTT04ucGFyc2UobWVzc2FnZS5kYXRhKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwiY2xvc2VkXCIpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuY2JJZCA9IDA7XG4gICAgICAgIHRoaXMuY2JzID0ge307XG4gICAgICAgIHRoaXMuc3VicyA9IHt9O1xuICAgICAgICB0aGlzLnVuc3ViID0ge307XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKENoYWluV2ViU29ja2V0LCBbe1xuICAgICAgICBrZXk6IFwiY2FsbFwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gY2FsbChwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gcGFyYW1zWzFdO1xuICAgICAgICAgICAgaWYgKFNPQ0tFVF9ERUJVRykgY29uc29sZS5sb2coXCJbQ2hhaW5XZWJTb2NrZXRdID4tLS0tIGNhbGwgLS0tLS0+ICBcXFwiaWRcXFwiOlwiICsgKHRoaXMuY2JJZCArIDEpLCBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcblxuICAgICAgICAgICAgdGhpcy5jYklkICs9IDE7XG5cbiAgICAgICAgICAgIGlmIChtZXRob2QgPT09IFwic2V0X3N1YnNjcmliZV9jYWxsYmFja1wiIHx8IG1ldGhvZCA9PT0gXCJzdWJzY3JpYmVfdG9fbWFya2V0XCIgfHwgbWV0aG9kID09PSBcImJyb2FkY2FzdF90cmFuc2FjdGlvbl93aXRoX2NhbGxiYWNrXCIgfHwgbWV0aG9kID09PSBcInNldF9wZW5kaW5nX3RyYW5zYWN0aW9uX2NhbGxiYWNrXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBjYWxsYmFjayBpbiBzdWJzIG1hcFxuICAgICAgICAgICAgICAgIHRoaXMuc3Vic1t0aGlzLmNiSWRdID0ge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogcGFyYW1zWzJdWzBdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgY2FsbGJhY2sgd2l0aCB0aGUgY2FsbGJhY2sgaWRcbiAgICAgICAgICAgICAgICBwYXJhbXNbMl1bMF0gPSB0aGlzLmNiSWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtZXRob2QgPT09IFwidW5zdWJzY3JpYmVfZnJvbV9tYXJrZXRcIiB8fCBtZXRob2QgPT09IFwidW5zdWJzY3JpYmVfZnJvbV9hY2NvdW50c1wiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXNbMl1bMF0gIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgb2YgdW5zdWIgbXVzdCBiZSB0aGUgb3JpZ2luYWwgY2FsbGJhY2tcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHVuU3ViQ2IgPSBwYXJhbXNbMl0uc3BsaWNlKDAsIDEpWzBdO1xuXG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLnN1YnMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3Vic1tpZF0uY2FsbGJhY2sgPT09IHVuU3ViQ2IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJbdGhpcy5jYklkXSA9IGlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogXCJjYWxsXCIsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXF1ZXN0LmlkID0gdGhpcy5jYklkO1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIF90aGlzMi5jYnNbX3RoaXMyLmNiSWRdID0ge1xuICAgICAgICAgICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiByZXNvbHZlLFxuICAgICAgICAgICAgICAgICAgICByZWplY3Q6IHJlamVjdFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgX3RoaXMyLndzLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCIhISEgQ2hhaW5XZWJTb2NrZXQgRXJyb3IgXCIsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIF90aGlzMi53cy5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICBrZXk6IFwibGlzdGVuZXJcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGxpc3RlbmVyKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAoU09DS0VUX0RFQlVHKSBjb25zb2xlLmxvZyhcIltDaGFpbldlYlNvY2tldF0gPC0tLS0gcmVwbHkgLS0tLTxcIiwgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcblxuICAgICAgICAgICAgdmFyIHN1YiA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1ldGhvZCA9PT0gXCJub3RpY2VcIikge1xuICAgICAgICAgICAgICAgIHN1YiA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuaWQgPSByZXNwb25zZS5wYXJhbXNbMF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghc3ViKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gdGhpcy5zdWJzW3Jlc3BvbnNlLmlkXS5jYWxsYmFjaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmICFzdWIpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sucmVqZWN0KHJlc3BvbnNlLmVycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5yZXNvbHZlKHJlc3BvbnNlLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy51bnN1YltyZXNwb25zZS5pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc3Vic1t0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrICYmIHN1Yikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLnBhcmFtc1sxXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV2FybmluZzogdW5rbm93biB3ZWJzb2NrZXQgcmVzcG9uc2U6IFwiLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LCB7XG4gICAgICAgIGtleTogXCJsb2dpblwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gbG9naW4odXNlciwgcGFzc3dvcmQpIHtcbiAgICAgICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25uZWN0X3Byb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzMy5jYWxsKFsxLCBcImxvZ2luXCIsIFt1c2VyLCBwYXNzd29yZF1dKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSwge1xuICAgICAgICBrZXk6IFwiY2xvc2VcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgICAgICAgICAgdGhpcy53cy5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIENoYWluV2ViU29ja2V0O1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoYWluV2ViU29ja2V0OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpIHsgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykgeyB2YXIgZGVzY3JpcHRvciA9IHByb3BzW2ldOyBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBkZXNjcmlwdG9yLmVudW1lcmFibGUgfHwgZmFsc2U7IGRlc2NyaXB0b3IuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKFwidmFsdWVcIiBpbiBkZXNjcmlwdG9yKSBkZXNjcmlwdG9yLndyaXRhYmxlID0gdHJ1ZTsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgZGVzY3JpcHRvci5rZXksIGRlc2NyaXB0b3IpOyB9IH0gcmV0dXJuIGZ1bmN0aW9uIChDb25zdHJ1Y3RvciwgcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHsgaWYgKHByb3RvUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IucHJvdG90eXBlLCBwcm90b1Byb3BzKTsgaWYgKHN0YXRpY1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLCBzdGF0aWNQcm9wcyk7IHJldHVybiBDb25zdHJ1Y3RvcjsgfTsgfSgpO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgR3JhcGhlbmVBcGkgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gR3JhcGhlbmVBcGkod3NfcnBjLCBhcGlfbmFtZSkge1xuICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgR3JhcGhlbmVBcGkpO1xuXG4gICAgICAgIHRoaXMud3NfcnBjID0gd3NfcnBjO1xuICAgICAgICB0aGlzLmFwaV9uYW1lID0gYXBpX25hbWU7XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKEdyYXBoZW5lQXBpLCBbe1xuICAgICAgICBrZXk6IFwiaW5pdFwiLFxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFsxLCB0aGlzLmFwaV9uYW1lLCBbXV0pLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIltHcmFwaGVuZUFwaS5qczoxMV0gLS0tLS0gR3JhcGhlbmVBcGkuaW5pdCAtLS0tLT5cIiwgdGhpcy5hcGlfbmFtZSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHNlbGYuYXBpX2lkID0gcmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sIHtcbiAgICAgICAga2V5OiBcImV4ZWNcIixcbiAgICAgICAgdmFsdWU6IGZ1bmN0aW9uIGV4ZWMobWV0aG9kLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFt0aGlzLmFwaV9pZCwgbWV0aG9kLCBwYXJhbXNdKS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIiEhISBHcmFwaGVuZUFwaSBlcnJvcjogXCIsIG1ldGhvZCwgcGFyYW1zLCBlcnJvciwgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIEdyYXBoZW5lQXBpO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyYXBoZW5lQXBpOyIsIi8vIE1JVCBMaWNlbnNlOlxuLy9cbi8vIENvcHlyaWdodCAoYykgMjAxMC0yMDEyLCBKb2UgV2FsbmVzXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuLy8gaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuLy8gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuLy8gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbi8vIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbi8vIFRIRSBTT0ZUV0FSRS5cblxuLyoqXG4gKiBUaGlzIGJlaGF2ZXMgbGlrZSBhIFdlYlNvY2tldCBpbiBldmVyeSB3YXksIGV4Y2VwdCBpZiBpdCBmYWlscyB0byBjb25uZWN0LFxuICogb3IgaXQgZ2V0cyBkaXNjb25uZWN0ZWQsIGl0IHdpbGwgcmVwZWF0ZWRseSBwb2xsIHVudGlsIGl0IHN1Y2Nlc3NmdWxseSBjb25uZWN0c1xuICogYWdhaW4uXG4gKlxuICogSXQgaXMgQVBJIGNvbXBhdGlibGUsIHNvIHdoZW4geW91IGhhdmU6XG4gKiAgIHdzID0gbmV3IFdlYlNvY2tldCgnd3M6Ly8uLi4uJyk7XG4gKiB5b3UgY2FuIHJlcGxhY2Ugd2l0aDpcbiAqICAgd3MgPSBuZXcgUmVjb25uZWN0aW5nV2ViU29ja2V0KCd3czovLy4uLi4nKTtcbiAqXG4gKiBUaGUgZXZlbnQgc3RyZWFtIHdpbGwgdHlwaWNhbGx5IGxvb2sgbGlrZTpcbiAqICBvbmNvbm5lY3RpbmdcbiAqICBvbm9wZW5cbiAqICBvbm1lc3NhZ2VcbiAqICBvbm1lc3NhZ2VcbiAqICBvbmNsb3NlIC8vIGxvc3QgY29ubmVjdGlvblxuICogIG9uY29ubmVjdGluZ1xuICogIG9ub3BlbiAgLy8gc29tZXRpbWUgbGF0ZXIuLi5cbiAqICBvbm1lc3NhZ2VcbiAqICBvbm1lc3NhZ2VcbiAqICBldGMuLi5cbiAqXG4gKiBJdCBpcyBBUEkgY29tcGF0aWJsZSB3aXRoIHRoZSBzdGFuZGFyZCBXZWJTb2NrZXQgQVBJLCBhcGFydCBmcm9tIHRoZSBmb2xsb3dpbmcgbWVtYmVyczpcbiAqXG4gKiAtIGBidWZmZXJlZEFtb3VudGBcbiAqIC0gYGV4dGVuc2lvbnNgXG4gKiAtIGBiaW5hcnlUeXBlYFxuICpcbiAqIExhdGVzdCB2ZXJzaW9uOiBodHRwczovL2dpdGh1Yi5jb20vam9ld2FsbmVzL3JlY29ubmVjdGluZy13ZWJzb2NrZXQvXG4gKiAtIEpvZSBXYWxuZXNcbiAqXG4gKiBTeW50YXhcbiAqID09PT09PVxuICogdmFyIHNvY2tldCA9IG5ldyBSZWNvbm5lY3RpbmdXZWJTb2NrZXQodXJsLCBwcm90b2NvbHMsIG9wdGlvbnMpO1xuICpcbiAqIFBhcmFtZXRlcnNcbiAqID09PT09PT09PT1cbiAqIHVybCAtIFRoZSB1cmwgeW91IGFyZSBjb25uZWN0aW5nIHRvLlxuICogcHJvdG9jb2xzIC0gT3B0aW9uYWwgc3RyaW5nIG9yIGFycmF5IG9mIHByb3RvY29scy5cbiAqIG9wdGlvbnMgLSBTZWUgYmVsb3dcbiAqXG4gKiBPcHRpb25zXG4gKiA9PT09PT09XG4gKiBPcHRpb25zIGNhbiBlaXRoZXIgYmUgcGFzc2VkIHVwb24gaW5zdGFudGlhdGlvbiBvciBzZXQgYWZ0ZXIgaW5zdGFudGlhdGlvbjpcbiAqXG4gKiB2YXIgc29ja2V0ID0gbmV3IFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIG51bGwsIHsgZGVidWc6IHRydWUsIHJlY29ubmVjdEludGVydmFsOiA0MDAwIH0pO1xuICpcbiAqIG9yXG4gKlxuICogdmFyIHNvY2tldCA9IG5ldyBSZWNvbm5lY3RpbmdXZWJTb2NrZXQodXJsKTtcbiAqIHNvY2tldC5kZWJ1ZyA9IHRydWU7XG4gKiBzb2NrZXQucmVjb25uZWN0SW50ZXJ2YWwgPSA0MDAwO1xuICpcbiAqIGRlYnVnXG4gKiAtIFdoZXRoZXIgdGhpcyBpbnN0YW5jZSBzaG91bGQgbG9nIGRlYnVnIG1lc3NhZ2VzLiBBY2NlcHRzIHRydWUgb3IgZmFsc2UuIERlZmF1bHQ6IGZhbHNlLlxuICpcbiAqIGF1dG9tYXRpY09wZW5cbiAqIC0gV2hldGhlciBvciBub3QgdGhlIHdlYnNvY2tldCBzaG91bGQgYXR0ZW1wdCB0byBjb25uZWN0IGltbWVkaWF0ZWx5IHVwb24gaW5zdGFudGlhdGlvbi4gVGhlIHNvY2tldCBjYW4gYmUgbWFudWFsbHkgb3BlbmVkIG9yIGNsb3NlZCBhdCBhbnkgdGltZSB1c2luZyB3cy5vcGVuKCkgYW5kIHdzLmNsb3NlKCkuXG4gKlxuICogcmVjb25uZWN0SW50ZXJ2YWxcbiAqIC0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkgYmVmb3JlIGF0dGVtcHRpbmcgdG8gcmVjb25uZWN0LiBBY2NlcHRzIGludGVnZXIuIERlZmF1bHQ6IDEwMDAuXG4gKlxuICogbWF4UmVjb25uZWN0SW50ZXJ2YWxcbiAqIC0gVGhlIG1heGltdW0gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBhIHJlY29ubmVjdGlvbiBhdHRlbXB0LiBBY2NlcHRzIGludGVnZXIuIERlZmF1bHQ6IDMwMDAwLlxuICpcbiAqIHJlY29ubmVjdERlY2F5XG4gKiAtIFRoZSByYXRlIG9mIGluY3JlYXNlIG9mIHRoZSByZWNvbm5lY3QgZGVsYXkuIEFsbG93cyByZWNvbm5lY3QgYXR0ZW1wdHMgdG8gYmFjayBvZmYgd2hlbiBwcm9ibGVtcyBwZXJzaXN0LiBBY2NlcHRzIGludGVnZXIgb3IgZmxvYXQuIERlZmF1bHQ6IDEuNS5cbiAqXG4gKiB0aW1lb3V0SW50ZXJ2YWxcbiAqIC0gVGhlIG1heGltdW0gdGltZSBpbiBtaWxsaXNlY29uZHMgdG8gd2FpdCBmb3IgYSBjb25uZWN0aW9uIHRvIHN1Y2NlZWQgYmVmb3JlIGNsb3NpbmcgYW5kIHJldHJ5aW5nLiBBY2NlcHRzIGludGVnZXIuIERlZmF1bHQ6IDIwMDAuXG4gKlxuICovXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKXtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ2xvYmFsLlJlY29ubmVjdGluZ1dlYlNvY2tldCA9IGZhY3RvcnkoKTtcbiAgICB9XG59KSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhKCdXZWJTb2NrZXQnIGluIHdpbmRvdykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIFJlY29ubmVjdGluZ1dlYlNvY2tldCh1cmwsIHByb3RvY29scywgb3B0aW9ucykge1xuXG4gICAgICAgIC8vIERlZmF1bHQgc2V0dGluZ3NcbiAgICAgICAgdmFyIHNldHRpbmdzID0ge1xuXG4gICAgICAgICAgICAvKiogV2hldGhlciB0aGlzIGluc3RhbmNlIHNob3VsZCBsb2cgZGVidWcgbWVzc2FnZXMuICovXG4gICAgICAgICAgICBkZWJ1ZzogZmFsc2UsXG5cbiAgICAgICAgICAgIC8qKiBXaGV0aGVyIG9yIG5vdCB0aGUgd2Vic29ja2V0IHNob3VsZCBhdHRlbXB0IHRvIGNvbm5lY3QgaW1tZWRpYXRlbHkgdXBvbiBpbnN0YW50aWF0aW9uLiAqL1xuICAgICAgICAgICAgYXV0b21hdGljT3BlbjogdHJ1ZSxcblxuICAgICAgICAgICAgLyoqIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5IGJlZm9yZSBhdHRlbXB0aW5nIHRvIHJlY29ubmVjdC4gKi9cbiAgICAgICAgICAgIHJlY29ubmVjdEludGVydmFsOiAxMDAwLFxuICAgICAgICAgICAgLyoqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkgYSByZWNvbm5lY3Rpb24gYXR0ZW1wdC4gKi9cbiAgICAgICAgICAgIG1heFJlY29ubmVjdEludGVydmFsOiAzMDAwMCxcbiAgICAgICAgICAgIC8qKiBUaGUgcmF0ZSBvZiBpbmNyZWFzZSBvZiB0aGUgcmVjb25uZWN0IGRlbGF5LiBBbGxvd3MgcmVjb25uZWN0IGF0dGVtcHRzIHRvIGJhY2sgb2ZmIHdoZW4gcHJvYmxlbXMgcGVyc2lzdC4gKi9cbiAgICAgICAgICAgIHJlY29ubmVjdERlY2F5OiAxLjUsXG5cbiAgICAgICAgICAgIC8qKiBUaGUgbWF4aW11bSB0aW1lIGluIG1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciBhIGNvbm5lY3Rpb24gdG8gc3VjY2VlZCBiZWZvcmUgY2xvc2luZyBhbmQgcmV0cnlpbmcuICovXG4gICAgICAgICAgICB0aW1lb3V0SW50ZXJ2YWw6IDIwMDAsXG5cbiAgICAgICAgICAgIC8qKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgcmVjb25uZWN0aW9uIGF0dGVtcHRzIHRvIG1ha2UuIFVubGltaXRlZCBpZiBudWxsLiAqL1xuICAgICAgICAgICAgbWF4UmVjb25uZWN0QXR0ZW1wdHM6IG51bGwsXG5cbiAgICAgICAgICAgIC8qKiBUaGUgYmluYXJ5IHR5cGUsIHBvc3NpYmxlIHZhbHVlcyAnYmxvYicgb3IgJ2FycmF5YnVmZmVyJywgZGVmYXVsdCAnYmxvYicuICovXG4gICAgICAgICAgICBiaW5hcnlUeXBlOiAnYmxvYidcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9wdGlvbnMpIHsgb3B0aW9ucyA9IHt9OyB9XG5cbiAgICAgICAgLy8gT3ZlcndyaXRlIGFuZCBkZWZpbmUgc2V0dGluZ3Mgd2l0aCBvcHRpb25zIGlmIHRoZXkgZXhpc3QuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzZXR0aW5ncykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zW2tleV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzW2tleV0gPSBzZXR0aW5nc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlc2Ugc2hvdWxkIGJlIHRyZWF0ZWQgYXMgcmVhZC1vbmx5IHByb3BlcnRpZXNcblxuICAgICAgICAvKiogVGhlIFVSTCBhcyByZXNvbHZlZCBieSB0aGUgY29uc3RydWN0b3IuIFRoaXMgaXMgYWx3YXlzIGFuIGFic29sdXRlIFVSTC4gUmVhZCBvbmx5LiAqL1xuICAgICAgICB0aGlzLnVybCA9IHVybDtcblxuICAgICAgICAvKiogVGhlIG51bWJlciBvZiBhdHRlbXB0ZWQgcmVjb25uZWN0cyBzaW5jZSBzdGFydGluZywgb3IgdGhlIGxhc3Qgc3VjY2Vzc2Z1bCBjb25uZWN0aW9uLiBSZWFkIG9ubHkuICovXG4gICAgICAgIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgY3VycmVudCBzdGF0ZSBvZiB0aGUgY29ubmVjdGlvbi5cbiAgICAgICAgICogQ2FuIGJlIG9uZSBvZjogV2ViU29ja2V0LkNPTk5FQ1RJTkcsIFdlYlNvY2tldC5PUEVOLCBXZWJTb2NrZXQuQ0xPU0lORywgV2ViU29ja2V0LkNMT1NFRFxuICAgICAgICAgKiBSZWFkIG9ubHkuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcblxuICAgICAgICAvKipcbiAgICAgICAgICogQSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgbmFtZSBvZiB0aGUgc3ViLXByb3RvY29sIHRoZSBzZXJ2ZXIgc2VsZWN0ZWQ7IHRoaXMgd2lsbCBiZSBvbmUgb2ZcbiAgICAgICAgICogdGhlIHN0cmluZ3Mgc3BlY2lmaWVkIGluIHRoZSBwcm90b2NvbHMgcGFyYW1ldGVyIHdoZW4gY3JlYXRpbmcgdGhlIFdlYlNvY2tldCBvYmplY3QuXG4gICAgICAgICAqIFJlYWQgb25seS5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucHJvdG9jb2wgPSBudWxsO1xuXG4gICAgICAgIC8vIFByaXZhdGUgc3RhdGUgdmFyaWFibGVzXG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgd3M7XG4gICAgICAgIHZhciBmb3JjZWRDbG9zZSA9IGZhbHNlO1xuICAgICAgICB2YXIgdGltZWRPdXQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHQgPSBudWxsO1xuICAgICAgICB2YXIgZXZlbnRUYXJnZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAvLyBXaXJlIHVwIFwib24qXCIgcHJvcGVydGllcyBhcyBldmVudCBoYW5kbGVyc1xuXG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCAgICAgICBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9ub3BlbihldmVudCk7IH0pO1xuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsICAgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbmNsb3NlKGV2ZW50KTsgfSk7XG4gICAgICAgIGV2ZW50VGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nvbm5lY3RpbmcnLCBmdW5jdGlvbihldmVudCkgeyBzZWxmLm9uY29ubmVjdGluZyhldmVudCk7IH0pO1xuICAgICAgICBldmVudFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgICAgZnVuY3Rpb24oZXZlbnQpIHsgc2VsZi5vbm1lc3NhZ2UoZXZlbnQpOyB9KTtcbiAgICAgICAgZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAgICAgIGZ1bmN0aW9uKGV2ZW50KSB7IHNlbGYub25lcnJvcihldmVudCk7IH0pO1xuXG4gICAgICAgIC8vIEV4cG9zZSB0aGUgQVBJIHJlcXVpcmVkIGJ5IEV2ZW50VGFyZ2V0XG5cbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyID0gZXZlbnRUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lci5iaW5kKGV2ZW50VGFyZ2V0KTtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyID0gZXZlbnRUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKGV2ZW50VGFyZ2V0KTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50ID0gZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudC5iaW5kKGV2ZW50VGFyZ2V0KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhpcyBmdW5jdGlvbiBnZW5lcmF0ZXMgYW4gZXZlbnQgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggc3RhbmRhcmRcbiAgICAgICAgICogY29tcGxpYW50IGJyb3dzZXJzIGFuZCBJRTkgLSBJRTExXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgd2lsbCBwcmV2ZW50IHRoZSBlcnJvcjpcbiAgICAgICAgICogT2JqZWN0IGRvZXNuJ3Qgc3VwcG9ydCB0aGlzIGFjdGlvblxuICAgICAgICAgKlxuICAgICAgICAgKiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE5MzQ1MzkyL3doeS1hcmVudC1teS1wYXJhbWV0ZXJzLWdldHRpbmctcGFzc2VkLXRocm91Z2gtdG8tYS1kaXNwYXRjaGVkLWV2ZW50LzE5MzQ1NTYzIzE5MzQ1NTYzXG4gICAgICAgICAqIEBwYXJhbSBzIFN0cmluZyBUaGUgbmFtZSB0aGF0IHRoZSBldmVudCBzaG91bGQgdXNlXG4gICAgICAgICAqIEBwYXJhbSBhcmdzIE9iamVjdCBhbiBvcHRpb25hbCBvYmplY3QgdGhhdCB0aGUgZXZlbnQgd2lsbCB1c2VcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdlbmVyYXRlRXZlbnQocywgYXJncykge1xuICAgICAgICBcdHZhciBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkN1c3RvbUV2ZW50XCIpO1xuICAgICAgICBcdGV2dC5pbml0Q3VzdG9tRXZlbnQocywgZmFsc2UsIGZhbHNlLCBhcmdzKTtcbiAgICAgICAgXHRyZXR1cm4gZXZ0O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMub3BlbiA9IGZ1bmN0aW9uIChyZWNvbm5lY3RBdHRlbXB0KSB7XG4gICAgICAgICAgICB3cyA9IG5ldyBXZWJTb2NrZXQoc2VsZi51cmwsIHByb3RvY29scyB8fCBbXSk7XG4gICAgICAgICAgICB3cy5iaW5hcnlUeXBlID0gdGhpcy5iaW5hcnlUeXBlO1xuXG4gICAgICAgICAgICBpZiAocmVjb25uZWN0QXR0ZW1wdCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzICYmIHRoaXMucmVjb25uZWN0QXR0ZW1wdHMgPiB0aGlzLm1heFJlY29ubmVjdEF0dGVtcHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZ2VuZXJhdGVFdmVudCgnY29ubmVjdGluZycpKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlY29ubmVjdEF0dGVtcHRzID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ2F0dGVtcHQtY29ubmVjdCcsIHNlbGYudXJsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxvY2FsV3MgPSB3cztcbiAgICAgICAgICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ2Nvbm5lY3Rpb24tdGltZW91dCcsIHNlbGYudXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGltZWRPdXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxvY2FsV3MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB0aW1lZE91dCA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgc2VsZi50aW1lb3V0SW50ZXJ2YWwpO1xuXG4gICAgICAgICAgICB3cy5vbm9wZW4gPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29ub3BlbicsIHNlbGYudXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5wcm90b2NvbCA9IHdzLnByb3RvY29sO1xuICAgICAgICAgICAgICAgIHNlbGYucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5PUEVOO1xuICAgICAgICAgICAgICAgIHNlbGYucmVjb25uZWN0QXR0ZW1wdHMgPSAwO1xuICAgICAgICAgICAgICAgIHZhciBlID0gZ2VuZXJhdGVFdmVudCgnb3BlbicpO1xuICAgICAgICAgICAgICAgIGUuaXNSZWNvbm5lY3QgPSByZWNvbm5lY3RBdHRlbXB0O1xuICAgICAgICAgICAgICAgIHJlY29ubmVjdEF0dGVtcHQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgd3Mub25jbG9zZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHdzID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoZm9yY2VkQ2xvc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5yZWFkeVN0YXRlID0gV2ViU29ja2V0LkNMT1NFRDtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdjbG9zZScpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcbiAgICAgICAgICAgICAgICAgICAgdmFyIGUgPSBnZW5lcmF0ZUV2ZW50KCdjb25uZWN0aW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIGUuY29kZSA9IGV2ZW50LmNvZGU7XG4gICAgICAgICAgICAgICAgICAgIGUucmVhc29uID0gZXZlbnQucmVhc29uO1xuICAgICAgICAgICAgICAgICAgICBlLndhc0NsZWFuID0gZXZlbnQud2FzQ2xlYW47XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50VGFyZ2V0LmRpc3BhdGNoRXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVjb25uZWN0QXR0ZW1wdCAmJiAhdGltZWRPdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmRlYnVnIHx8IFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdvbmNsb3NlJywgc2VsZi51cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChnZW5lcmF0ZUV2ZW50KCdjbG9zZScpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0aW1lb3V0ID0gc2VsZi5yZWNvbm5lY3RJbnRlcnZhbCAqIE1hdGgucG93KHNlbGYucmVjb25uZWN0RGVjYXksIHNlbGYucmVjb25uZWN0QXR0ZW1wdHMpO1xuICAgICAgICAgICAgICAgICAgICB0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYucmVjb25uZWN0QXR0ZW1wdHMrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYub3Blbih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgdGltZW91dCA+IHNlbGYubWF4UmVjb25uZWN0SW50ZXJ2YWwgPyBzZWxmLm1heFJlY29ubmVjdEludGVydmFsIDogdGltZW91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdvbm1lc3NhZ2UnLCBzZWxmLnVybCwgZXZlbnQuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBlID0gZ2VuZXJhdGVFdmVudCgnbWVzc2FnZScpO1xuICAgICAgICAgICAgICAgIGUuZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICAgICAgZXZlbnRUYXJnZXQuZGlzcGF0Y2hFdmVudChlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3cy5vbmVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5kZWJ1ZyB8fCBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuZGVidWdBbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUmVjb25uZWN0aW5nV2ViU29ja2V0JywgJ29uZXJyb3InLCBzZWxmLnVybCwgZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBldmVudFRhcmdldC5kaXNwYXRjaEV2ZW50KGdlbmVyYXRlRXZlbnQoJ2Vycm9yJykpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdoZXRoZXIgb3Igbm90IHRvIGNyZWF0ZSBhIHdlYnNvY2tldCB1cG9uIGluc3RhbnRpYXRpb25cbiAgICAgICAgaWYgKHRoaXMuYXV0b21hdGljT3BlbiA9PSB0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLm9wZW4oZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyYW5zbWl0cyBkYXRhIHRvIHRoZSBzZXJ2ZXIgb3ZlciB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24uXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSBkYXRhIGEgdGV4dCBzdHJpbmcsIEFycmF5QnVmZmVyIG9yIEJsb2IgdG8gc2VuZCB0byB0aGUgc2VydmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5zZW5kID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKHdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuZGVidWcgfHwgUmVjb25uZWN0aW5nV2ViU29ja2V0LmRlYnVnQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1JlY29ubmVjdGluZ1dlYlNvY2tldCcsICdzZW5kJywgc2VsZi51cmwsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gd3Muc2VuZChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgJ0lOVkFMSURfU1RBVEVfRVJSIDogUGF1c2luZyB0byByZWNvbm5lY3Qgd2Vic29ja2V0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xvc2VzIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbiBvciBjb25uZWN0aW9uIGF0dGVtcHQsIGlmIGFueS5cbiAgICAgICAgICogSWYgdGhlIGNvbm5lY3Rpb24gaXMgYWxyZWFkeSBDTE9TRUQsIHRoaXMgbWV0aG9kIGRvZXMgbm90aGluZy5cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbihjb2RlLCByZWFzb24pIHtcbiAgICAgICAgICAgIC8vIERlZmF1bHQgQ0xPU0VfTk9STUFMIGNvZGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29kZSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvZGUgPSAxMDAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yY2VkQ2xvc2UgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHdzKSB7XG4gICAgICAgICAgICAgICAgd3MuY2xvc2UoY29kZSwgcmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHQpO1xuICAgICAgICAgICAgICAgIHQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGRpdGlvbmFsIHB1YmxpYyBBUEkgbWV0aG9kIHRvIHJlZnJlc2ggdGhlIGNvbm5lY3Rpb24gaWYgc3RpbGwgb3BlbiAoY2xvc2UsIHJlLW9wZW4pLlxuICAgICAgICAgKiBGb3IgZXhhbXBsZSwgaWYgdGhlIGFwcCBzdXNwZWN0cyBiYWQgZGF0YSAvIG1pc3NlZCBoZWFydCBiZWF0cywgaXQgY2FuIHRyeSB0byByZWZyZXNoLlxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5yZWZyZXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAod3MpIHtcbiAgICAgICAgICAgICAgICB3cy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBXZWJTb2NrZXQgY29ubmVjdGlvbidzIHJlYWR5U3RhdGUgY2hhbmdlcyB0byBPUEVOO1xuICAgICAqIHRoaXMgaW5kaWNhdGVzIHRoYXQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkgdG8gc2VuZCBhbmQgcmVjZWl2ZSBkYXRhLlxuICAgICAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25vcGVuID0gZnVuY3Rpb24oZXZlbnQpIHt9O1xuICAgIC8qKiBBbiBldmVudCBsaXN0ZW5lciB0byBiZSBjYWxsZWQgd2hlbiB0aGUgV2ViU29ja2V0IGNvbm5lY3Rpb24ncyByZWFkeVN0YXRlIGNoYW5nZXMgdG8gQ0xPU0VELiAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5wcm90b3R5cGUub25jbG9zZSA9IGZ1bmN0aW9uKGV2ZW50KSB7fTtcbiAgICAvKiogQW4gZXZlbnQgbGlzdGVuZXIgdG8gYmUgY2FsbGVkIHdoZW4gYSBjb25uZWN0aW9uIGJlZ2lucyBiZWluZyBhdHRlbXB0ZWQuICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbmNvbm5lY3RpbmcgPSBmdW5jdGlvbihldmVudCkge307XG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIGEgbWVzc2FnZSBpcyByZWNlaXZlZCBmcm9tIHRoZSBzZXJ2ZXIuICovXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LnByb3RvdHlwZS5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge307XG4gICAgLyoqIEFuIGV2ZW50IGxpc3RlbmVyIHRvIGJlIGNhbGxlZCB3aGVuIGFuIGVycm9yIG9jY3Vycy4gKi9cbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQucHJvdG90eXBlLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge307XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGFsbCBpbnN0YW5jZXMgb2YgUmVjb25uZWN0aW5nV2ViU29ja2V0IHNob3VsZCBsb2cgZGVidWcgbWVzc2FnZXMuXG4gICAgICogU2V0dGluZyB0aGlzIHRvIHRydWUgaXMgdGhlIGVxdWl2YWxlbnQgb2Ygc2V0dGluZyBhbGwgaW5zdGFuY2VzIG9mIFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1ZyB0byB0cnVlLlxuICAgICAqL1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5kZWJ1Z0FsbCA9IGZhbHNlO1xuXG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNPTk5FQ1RJTkcgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcbiAgICBSZWNvbm5lY3RpbmdXZWJTb2NrZXQuT1BFTiA9IFdlYlNvY2tldC5PUEVOO1xuICAgIFJlY29ubmVjdGluZ1dlYlNvY2tldC5DTE9TSU5HID0gV2ViU29ja2V0LkNMT1NJTkc7XG4gICAgUmVjb25uZWN0aW5nV2ViU29ja2V0LkNMT1NFRCA9IFdlYlNvY2tldC5DTE9TRUQ7XG5cbiAgICByZXR1cm4gUmVjb25uZWN0aW5nV2ViU29ja2V0O1xufSk7XG4iLCIiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
