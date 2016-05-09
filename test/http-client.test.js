var should = require("should");
var express = require("express");

var HttpClient = require("..");

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
});
