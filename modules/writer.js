// Haunted House Logistics Server - template writing functions


// node modules
var path = require("path");

// required modules
var mu = require("mu2");

if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() == "development") {
    mu.clearCache();
} else {
    console.log("Using mu cache");
}

exports.setTemplateDir = function (dir) {
    mu.root = dir;
};

// writer.write(res, template name, [template vars, [status], [headers]])
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
    mu.compileAndRender(template, vars || {}).pipe(res);
};

exports.writeError = function (res, num, details) {
    if (!details) {
        switch (num) {
            case 400:
                details = "Bad Request";
                break;
            case 403:
                details = "Access Denied";
                break;
            case 404:
                details = "Not Found";
                break;
            case 405:
                details = "Method Not Allowed";
                break;
            case 406:
                details = "Not Acceptable";
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