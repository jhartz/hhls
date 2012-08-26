// SHARED BETWEEN ALL SERVER MODULES AND ALL CLIENT PAGES

var shared = {};
if (typeof exports != "undefined") shared = exports;

if (typeof console == "undefined") var console = {};
if (typeof console.log != "function") console.log = function () {};


shared.trim = function (str) {
    if (str === null || str === undefined) return;
    if (typeof str.trim == "function") {
        return str.trim();
    } else {
        str = str.replace(/^\s+/, "");
        for (var i = str.length - 1; i >= 0; i -= 1) {
            if (/\S/.test(str.charAt(i))) {
                str = str.substring(0, i + 1);
                break;
            }
        }
        return str;
    }
};

shared.escHTML = function (html, convertNewlines) {
    if (typeof html != "string") {
        html = html + "";
    }
    html = html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
    if (convertNewlines) {
        html = html.replace(/\n/g, "<br>");
    }
    return html;
};

shared.parseCookies = function (cookiestring) {
    var cookies = {}, cookie;
    cookiestring = cookiestring.split(";");
    for (var i = 0; i < cookiestring.length; i++) {
        cookie = cookiestring[i];
        var name = cookie.indexOf("=") != -1 ? cookie.substring(0, cookie.indexOf("=")) : cookie;
        var value = cookie.indexOf("=") != -1 ? cookie.substring(cookie.indexOf("=") + 1) : "";
        cookies[shared.trim(name)] = shared.trim(value);
    }
    return cookies;
};