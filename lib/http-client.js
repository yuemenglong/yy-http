var http = require("http");
var https = require("https");
var URL = require("url");
var querystring = require("querystring");
var util = require("util");

var iconv = require('iconv-lite');
var _ = require("lodash");
var Promise = require("bluebird");
var Exception = require("yy-exception");

var HTTP_TIMEOUT_ERROR = "HTTP_TIMEOUT_ERROR";

function HttpClient() {
    this.cookies = {};
    this.headers = {};
    this.timeout = 0;
    this.charset = "utf8";
};

function parseCookie(cookieString) {
    if (!cookieString) {
        return {};
    }
    var ret = {};
    var kvs = cookieString.split(";");
    for (var kv of kvs) {
        var match = kv.match(/^\s*(.+?)=(.+?)\s*$/);
        if (!match) {
            continue;
        }
        ret[match[1]] = match[2];
    }
    return ret;
}

function stringifyCookie(cookieObject) {
    var arr = [];
    for (var i in cookieObject) {
        arr.push(util.format("%s=%s", i, cookieObject[i]));
    }
    var cookie = arr.join("; ");
    return cookie;
}

function HttpTimeoutError(message) {
    // Error.call(this, message);
    this.message = message;
    Error.captureStackTrace(this, HttpTimeoutError);
}
HttpTimeoutError.prototype.name = HTTP_TIMEOUT_ERROR;
util.inherits(HttpTimeoutError, Error);

HttpClient.HttpTimeoutError = HttpTimeoutError;

HttpClient.prototype._setRequestHeader = function(headers) {
    // headers = headers || {};
    headers = _.merge({}, this.headers, headers);
    headers["Connection"] = headers["Connection"] || "keep-alive";
    headers["Cookie"] = stringifyCookie(_.merge(this.cookies, parseCookie(headers["Cookie"])));
    return headers;
}

HttpClient.prototype._handleResponseHeader = function(headers) {
    var setCookie = headers["set-cookie"];
    var regex = /(.+?)=(.+?);.+/;
    for (var i in setCookie) {
        var match = setCookie[i].match(regex);
        this.cookies[match[1]] = match[2];
    }
}

HttpClient.prototype.request = function(url, method, headers, content) {
    var that = this;
    headers = that._setRequestHeader(headers);
    var parsed = URL.parse(url);
    var opt = {
        host: parsed.hostname,
        path: parsed.path,
        method: method,
        headers: headers,
    }
    var protocol = null;
    if (parsed.protocol == "https:") {
        opt.port = parsed.port || 443;
        protocol = https;
    } else if (parsed.protocol == "http:") {
        opt.port = parsed.port || 80;
        protocol = http;
    } else {
        throw new Error("Invalid Protocol: " + parsed.protocol);
    }
    return new Promise(function(resolve, reject) {
        var req = protocol.request(opt, function(res) {
            that._handleResponseHeader(res.headers);
            var buffer = [];
            res.on("data", function(data) {
                buffer.push(data);
            }).on("end", function() {
                var raw = Buffer.concat(buffer);
                var ret = iconv.decode(raw, that.charset);
                resolve({
                    "status": res.statusCode,
                    "statusCode": res.statusCode,
                    "statusMessage": res.statusMessage,
                    "headers": res.headers,
                    "data": ret,
                    "body": ret,
                    "raw": raw,
                });
            }).on("error", function(err) {
                reject(err);
            });
        })
        if (opt.method == "POST") {
            req.write(content);
        }
        req.end();
        req.on("error", function(err) {
            reject(err);
        });
        if (!that.timeout) {
            return;
        }
        req.setTimeout(that.timeout, function() {
            req.abort();
            var msg = util.format("Visit <%s> Timeout [%d]", url, that.timeout);
            var err = new Exception(HTTP_TIMEOUT_ERROR, msg);
            reject(err);
        });
    });
}

HttpClient.prototype.setTimeout = function(timeout) {
    this.timeout = timeout;
}

HttpClient.prototype.setCharset = function(charset) {
    this.charset = charset;
}

HttpClient.prototype.getCookie = function(key) {
    return this.cookies[key];
}

HttpClient.prototype.getCookieString = function() {
    return stringifyCookie(this.cookies);
}

HttpClient.prototype.setCookieString = function(cookieString) {
    _.merge(this.cookies, parseCookie(cookieString));
}

HttpClient.prototype.setCookie = function(cookies) {
    _.merge(this.cookies, cookies);
}

HttpClient.prototype.addCookie = function(name, value) {
    this.cookies[name] = value;
}

HttpClient.prototype.setHeader = function(name, value) {
    if (_.isString(name) && _.isString(value)) {
        var headers = _.zipObject([name], [value]);
    } else {
        var headers = name;
    }
    _.merge(this.headers, headers);
}

HttpClient.prototype.get = function(url, headers) {
    headers = headers || {};
    return this.request(url, "GET", headers);
}

HttpClient.prototype.delete = function(url, headers) {
    headers = headers || {};
    return this.request(url, "DELETE", headers);
}

HttpClient.prototype.form = function(url, param, headers) {
    headers = headers || {};
    var content = querystring.stringify(param);
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
    headers["Content-Length"] = content.length;
    return this.request(url, "POST", headers, content);
}

HttpClient.prototype.json = function(url, obj, headers) {
    headers = headers || {};
    var content = JSON.stringify(obj);
    headers["Content-Type"] = "application/json; charset=UTF-8";
    headers["Content-Length"] = content.length;
    return this.request(url, "POST", headers, content);
}

HttpClient.prototype.put = function(url, obj, headers) {
    headers = headers || {};
    var content = JSON.stringify(obj);
    headers["Content-Type"] = "application/json; charset=UTF-8";
    headers["Content-Length"] = content.length;
    return this.request(url, "PUT", headers, content);
}

HttpClient.prototype.post = HttpClient.prototype.json;

module.exports = HttpClient;

if (require.main == module) {}
