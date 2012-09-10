// Haunted House Logistics Server - static file handler
// Serves static files, with support for partial content


// node modules
var fs = require("fs"),
    path = require("path");

// required modules
var mime = require("mime"),
    zip = require("node-native-zip");

// my modules
var writer = require("./writer");


mime.define({"text/vtt": ["vtt"]});  // for WebVTT support (waiting on https://github.com/broofa/node-mime/pull/37)

exports.serve = function (req, res, filename, contentDir) {
    var pathname = path.join(contentDir, filename);
    fs.stat(pathname, function (err, stats) {
        if (err || !(stats && stats.isFile())) {
            writer.writeError(res, 404);
        } else {
            var nocache = (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() == "development");
            var headers = {
                "Date": (new Date()).toUTCString(),
                "Cache-Control": "max-age=21600",
                "Accept-Ranges": "bytes",
                "Last-Modified": stats.mtime.toUTCString()
            };
            if (nocache) headers["Cache-Control"] = "no-cache";
            if (!nocache && Date.parse(req.headers["if-modified-since"]) >= Date.parse(stats.mtime)) {
                res.writeHead(304, headers);
                res.end();
            } else {
                headers["Content-Type"] = "text/plain";
                if (filename.indexOf(".") != -1) {
                    headers["Content-Type"] = mime.lookup(filename);
                }
                
                var total = stats.size;
                var range = req.headers.range;
                if (range) {
                    // For the 2 following headers... see small info here:
                    // http://delog.wordpress.com/2011/04/25/stream-webm-file-to-chrome-using-node-js/
                    // (below big code block)
                    //headers["Connection"] = "close";
                    //headers["Transfer-Encoding"] = "chunked";
                    
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
                        fs.createReadStream(pathname, {start: start, end: end}).pipe(res);
                    }
                } else {
                    headers["Content-Length"] = total;
                    res.writeHead(200, headers);
                    if (req.method == "HEAD") {
                        res.end();
                    } else {
                        fs.createReadStream(pathname).pipe(res);
                    }
                }
            }
        }
    });
};

function walk(basedir, callback, dir) {
    var results = [];
    if (typeof callback == "function") {
        fs.readdir(path.join(basedir, dir || ""), function (err, files) {
            if (err) {
                console.log("DIRECTORY WALKING ERROR: readdir: " + path.join(basedir, dir || "") + ": ", err);
                callback(results);
            } else {
                var pending = files.length;
                if (!pending) callback(results);
                files.forEach(function (file) {
                    fs.stat(path.join(basedir, dir || "", file), function (err, stat) {
                        if (err || !stat) {
                            console.log("DIRECTORY WALKING ERROR: stat: " + path.join(basedir, dir || "", file) + ": " + err);
                        } else {
                            if (stat.isDirectory()) {
                                walk(basedir, function (newfiles) {
                                    results = results.concat(newfiles);
                                    if (!--pending) callback(results);
                                }, path.join(dir || "", file));
                            } else {
                                results.push({
                                    name: path.join(dir || "", file),
                                    path: path.join(basedir, dir || "", file)
                                });
                                if (!--pending) callback(results);
                            }
                        }
                    });
                });
            }
        });
    }
}

// Expose walk function in case it's needed elsewhere
exports.walk = walk;

exports.zipfile = function (req, res, dir, type) {
    var xpi = new zip();
    walk(dir, function (files) {
        xpi.addFiles(files, function (err) {
            if (err) {
                console.log("XPI ARCHIVING ERROR: ", err);
                writer.writeError(res, 500);
            } else {
                var buf = xpi.toBuffer();
                res.writeHead(200, {
                    "Content-Type": type ? type : "application/zip",
                    "Content-Length": buf.length,
                    "Cache-Control": "no-cache"
                });
                res.write(buf);
                res.end();
            }
        });
    });
};