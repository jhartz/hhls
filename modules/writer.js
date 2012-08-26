// Haunted House Logistics Server - template writing functions


// node modules
var util = require("util"),
    path = require("path"),
    mu = require("mu2");

mu.root = path.join(__dirname, "..", "templates");
if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() == "development") {
    mu.clearCache();
} else {
    console.log("Using mu cache");
}

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