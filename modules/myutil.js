// Haunted House Logistics Server - util functions


// node modules
var util = require("util"),
    mu = require("mu2"),
    mime = require("mime");


mu.root = __dirname + "/../templates";

if (process.env.NODE_ENV == "DEVELOPMENT") {
    mu.clearCache();
}

exports.escHTML = function (html) {
    // NOTE: Also in control.js and client.js
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
};

exports.makeFileList = function (files, useMimes, separateJSON) {
    var filelist = {};
    for (var i = 0; i < files.length; i++) {
        var bname = files[i].indexOf(".") != -1 ? files[i].substring(0, files[i].lastIndexOf(".")) : files[i];
        var ext = files[i].indexOf(".") != -1 ? files[i].substring(files[i].lastIndexOf(".") + 1) : "";
        if (!filelist[bname]) filelist[bname] = [];
        if (separateJSON && ext.toLowerCase() == "json") {
            filelist[bname].unshift("CONTAINS_JSON_DATA_FILE");
        } else {
            filelist[bname].push(useMimes ? [ext, mime.lookup(ext)] : ext);
        }
    }
    return filelist;
};

// myutil.write(res, template name, [template vars, [status], [headers]])
exports.write = function (res, templ_name, vars, status, headers) {
    if (status && typeof status == "object") {
        headers = status;
        status = null;
    }
    
    if (!headers || typeof headers != "object") headers = {};
    if (!headers["Content-Type"]) headers["Content-Type"] = "text/html";
    if (!headers["Cache-Control"]) headers["Cache-Control"] = "no-cache";
    res.writeHead(status || 200, headers);
    var stream = mu.compileAndRender(templ_name, vars || {});
    util.pump(stream, res);
};

exports.writeError = function (res, num, details) {
    if (!details) {
        switch (num) {
            case 403:
                details = "Access Denied";
                break;
            case 404:
                details = "Not Found";
                break;
            case 500:
                details = "Internal Server Error";
                break;
            default:
                details = "";
        }
    }
    exports.write(res, "error.html", {num: num, details: details}, num);
};

exports.parseCookies = function (cookiestring) {
    var cookies = {};
    cookiestring.split(';').forEach(function(cookie) {
        var name = cookie.indexOf("=") != -1 ? cookie.substring(0, cookie.indexOf("=")) : cookie;
        var value = cookie.indexOf("=") != -1 ? cookie.substring(cookie.indexOf("=") + 1) : "";
        cookies[name.trim()] = value.trim();
    });
    return cookies;
};