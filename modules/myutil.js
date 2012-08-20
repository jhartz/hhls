// Haunted House Logistics Server - util functions


// node modules
var util = require("util"),
    path = require("path"),
    mu = require("mu2"),
    mime = require("mime");


mu.root = path.join(__dirname, "..", "templates");

if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() == "development") {
    mu.clearCache();
} else {
    console.log("Using mu cache");
}

exports.escHTML = function (html) {
    // NOTE: Also in control.js, clientframe2.js, cameras.attacher.js, cameras.viewer.js
    if (typeof html != "string") {
        html = html + "";
    }
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
};

exports.makeFileList = function (files, separateMetadata, includeReadme) {
    var fileList = {};
    for (var i = 0; i < files.length; i++) {
        if (includeReadme || files[i] != "README") {
            var bname = files[i].indexOf(".") != -1 ? files[i].substring(0, files[i].lastIndexOf(".")) : files[i];
            var ext = files[i].indexOf(".") != -1 ? files[i].substring(files[i].lastIndexOf(".") + 1) : "";
            if (!fileList[bname]) fileList[bname] = {};
            if (!fileList[bname].files) fileList[bname].files = [];
            if (separateMetadata && ext.toLowerCase() == "json") {
                fileList[bname].json = true;
            } else if (separateMetadata && ext.toLowerCase() == "vtt") {
                fileList[bname].track = "vtt";
            } else {
                fileList[bname].files.push([ext, mime.lookup(ext)]);
            }
        }
    }
    return fileList;
};

// myutil.write(res, template name, [template vars, [status], [headers]])
exports.write = function (res, template, vars, status, headers) {
    if (status && typeof status == "object") {
        headers = status;
        status = null;
    }
    
    if (!headers || typeof headers != "object") headers = {};
    if (!headers["Content-Type"]) headers["Content-Type"] = "text/html";
    if (!headers["Cache-Control"]) headers["Cache-Control"] = "no-cache";
    res.writeHead(status || 200, headers);
    
    if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() == "development") {
        mu.clearCache();
    }
    var stream = mu.compileAndRender(template, vars || {});
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

// "Format query" - to test/format a member of require("url").parse(..., true).query
exports.fquery = function (query, helper) {
    var formatter = function (endstring) {
        if (typeof helper == "string") {
            switch (helper.toLowerCase()) {
                case "int":
                    return parseInt(endstring, 10);
                    break;
                case "num":
                case "number":
                    return Number(endstring);
                    break;
                default:
                    return endstring;
            }
        } else if (typeof helper == "function") {
            return helper(endstring);
        } else {
            return endstring;
        }
    };
    
    if (Array.isArray(query)) {
        var real = "";
        query.forEach(function (item) {
            if (!real && item) real = item;
        });
        if (!real) real = query[0];
        return formatter(real);
    } else if (typeof query == "string") {
        return formatter(query);
    } else {
        return formatter("");
    }
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