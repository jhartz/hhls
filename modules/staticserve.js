/* Handle serving static files */


// node modules
var fs = require("fs"),
    mime = require("mime"),
    static = require("node-static");

// my modules
var myutil = require("./myutil");


var staticfiles = new static.Server();

exports.static = function (req, res) {
    req.addListener("end", function () {
        staticfiles.serve(req, res, function (err, resp) {
            if (err) {
                if (err.status == 404) {
                    myutil.writeError(res, 404);
                } else {
                    res.writeHead(err.status, err.headers);
                    res.end();
                }
            }
        });
    });
};

exports.partial = function (req, res) {
    var path = req.url.substring(1);
    fs.stat(path, function (err, stats) {
        if (err) {
            myutil.writeError(res, 500);
        } else {
            var total = stats.size;
            var headers = {
                // For the 2 following headers... see small info here:
                // http://delog.wordpress.com/2011/04/25/stream-webm-file-to-chrome-using-node-js/
                // (below big code block)
                //"Connection": "close",
                //"Transfer-Encoding": "chunked",
                "Cache-Control": "max-age=21600",
                "Accept-Ranges": "bytes",
                "Content-Length": total,
                "Content-Type": mime.lookup(path)
            };
            var range = req.headers.range;
            if (range) {
                var parts = range.substring(range.indexOf("bytes=") + 6).split("-");
                var start = parseInt(parts[0], 10);
                var end = parts[1] ? parseInt(parts[1], 10) : total - 1;
                var chunksize = (end + 1) - start;
                
                headers["Content-Range"] = "bytes " + start + "-" + end + "/" + total;
                headers["Content-Length"] = chunksize;
                
                res.writeHead(206, headers);
                if (req.method == "HEAD") {
                    res.end();
                } else {
                    fs.createReadStream(path, {start: start, end: end}).pipe(res);
                }
            } else {
                res.writeHead(200, headers);
                if (req.method == "HEAD") {
                    res.end();
                } else {
                    fs.createReadStream(path).pipe(res);
                }
            }
        }
    });
};

exports.zipfile = function (dir, req, res) {
    res.writeHead(200, {"Content-type": "text/plain"});
    res.end("Serving: " + dir);
};