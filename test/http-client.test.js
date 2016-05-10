var should = require("should");
var express = require("express");
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var qs = require("querystring");
var Promise = require("bluebird");

var HttpClient = require("..").HttpClient;

var PORT = 80;

//cookie
//timeout
//gbk

describe('Http Client', function() {
    it('Basic', function(done) {
        var app = express();
        app.get("/", function(req, res) {
            res.end("中文");
        })
        var server = app.listen(PORT);
        var client = new HttpClient();
        client.get("http://localhost/").then(function(res) {
            res.data.should.eql("中文");
        }).done(function() {
            server.close(function() {
                done();
            })
        });
    });

    it('Timeout', function(done) {
        var app = express();
        app.get("/", function(req, res) {
            setTimeout(function() {
                res.end("OK");
            }, 100)
        })
        var server = app.listen(PORT);
        var client = new HttpClient();
        client.setTimeout(3 * 100);
        client.get("http://localhost/").then(function(res) {
            res.data.should.eql("OK");
        }).done(function() {
            server.close(function() {
                done();
            })
        });
    });

    it('Timeout2', function(done) {
        var app = express();
        app.get("/", function(req, res) {
            setTimeout(function() {
                res.end("OK");
            }, 1000)
        })
        var server = app.listen(PORT);
        var client = new HttpClient();
        client.setTimeout(50);
        client.get("http://localhost/").catch(function(err) {
            err.name.should.eql("HTTP_TIMEOUT_ERROR");
        }).done(function() {
            server.close(function() {
                done();
            })
        });
    });

    it('Get Form Json Delete', function(done) {
        var app = express();
        app.use(bodyParser.urlencoded({ extended: false }))
        app.use(bodyParser.json())
        app.get("/:id", function(req, res) {
            res.end("GET " + req.params.id);
        })
        app.post("/:id", function(req, res) {
            if (req.is("json")) {
                res.json(req.body);
            } else {
                res.end(qs.stringify(req.body));
            }
        })
        app.delete("/:id", function(req, res) {
            res.end("DELETE " + req.params.id);
        })
        var server = app.listen(PORT);
        var client = new HttpClient();
        var obj = { a: 1, b: 2 };
        Promise.try(function() {
            return client.get("http://localhost/100");
        }).then(function(res) {
            res.data.should.eql("GET 100");
            return client.form("http://localhost/100", obj);
        }).then(function(res) {
            res.data.should.eql(qs.stringify(obj));
            return client.json("http://localhost/100", obj)
        }).then(function(res) {
            res.data.should.eql(JSON.stringify(obj));
            return client.delete("http://localhost/100");
        }).then(function(res) {
            res.data.should.eql("DELETE 100");
        }).done(function() {
            server.close(function() {
                done();
            })
        })
    });
    it('Cookie Test', function(done) {
        var app = express();
        app.use(cookieParser());
        app.get("/", function(req, res) {
            if (req.query.k && req.query.v) {
                res.cookie(req.query.k, req.query.v);
            }
            res.end(JSON.stringify(req.cookies));
        })
        var server = app.listen(PORT);
        var client = new HttpClient();
        Promise.try(function() {
            return client.get("http://localhost/");
        }).then(function(res) {
            client.addCookie("test", "1");
            return client.get("http://localhost/");
        }).then(function(res) {
            var expect = JSON.stringify({ test: "1" });
            res.data.toString().should.eql(expect);
            return client.get("http://localhost/?k=name&v=a");
        }).then(function(res) {
            var expect = JSON.stringify({ test: "1" });
            res.data.toString().should.eql(expect);
            return client.get("http://localhost/?k=name&v=b");
        }).then(function(res) {
            var expect = JSON.stringify({ test: "1", name: "a" });
            res.data.toString().should.eql(expect);
            return client.get("http://localhost/");
        }).then(function(res) {
            var expect = JSON.stringify({ test: "1", name: "b" });
            res.data.toString().should.eql(expect);
            // console.log(client.getCookieString());
        }).done(function() {
            server.close(function() {
                done();
            })
        })
    });
});
