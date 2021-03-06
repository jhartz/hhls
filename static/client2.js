function subst_url(name, value) {
    if (history.replaceState) {
        var oldquery = "&" + location.search.substring(1);
        while (oldquery.indexOf("&" + name + "=") != -1) {
            var badquery = oldquery.substring(oldquery.indexOf("&" + name + "=") + 1);
            oldquery = oldquery.substring(0, oldquery.indexOf("&" + name + "="));
            if (badquery.indexOf("&") != -1) oldquery += badquery.substring(badquery.indexOf("&"));
        }
        oldquery = oldquery.substring(1);
        // TODO: Why is this causing the page to be reloaded?
        history.replaceState({}, "", location.pathname + "?" + oldquery + "&" + name + "=" + encodeURIComponent(value));
    }
}

function client_details(x, y, channel, controller, controller_exec) {
    subst_url("channel_" + x + "x" + y, channel);
    if (controller) subst_url("controller_" + x + "x" + y, controller);
    if (controller_exec) subst_url("controller_exec_" + x + "x" + y, controller_exec);
}

function fullscreenchange() {
    var elem = document.getElementById("maincontent");
    if (document.fullscreenElement == elem || document.fullScreenElement == elem ||
        document.mozFullscreenElement == elem || document.mozFullScreenElement == elem ||
        document.webkitFullscreenElement == elem || document.webkitFullScreenElement == elem) {
        
        elem.requestPointerLock = elem.requestPointerLock || elem.mozRequestPointerLock || elem.webkitRequestPointerLock;
        if (typeof elem.requestPointerLock == "function") elem.requestPointerLock();
    }
}

window.onload = function () {
    if (document.getElementById && document.getElementsByTagName && document.addEventListener) {
        if (document.getElementById("status_closeall")) {
            document.getElementById("status_closeall").addEventListener("click", function (event) {
                var frames = document.getElementsByTagName("iframe");
                for (var i = 0; i < frames.length; i++) {
                    if (frames[i] && frames[i].contentWindow && typeof frames[i].contentWindow.closeconn == "function") {
                        frames[i].contentWindow.closeconn();
                    }
                }
            }, false);
        }
        
        document.getElementById("maincontent").style.display = "block";
        
        document.addEventListener("fullscreenchange", fullscreenchange, false);
        document.addEventListener("mozfullscreenchange", fullscreenchange, false);
        document.addEventListener("webkitfullscreenchange", fullscreenchange, false);
        
        var elem = document.getElementById("maincontent");
        elem.requestFullscreen = (elem.requestFullscreen || elem.requestFullScreen ||
            elem.mozRequestFullscreen || elem.mozRequestFullScreen ||
            elem.webkitRequestFullscreen || elem.webkitRequestFullScreen);
        if (typeof elem.requestFullscreen == "function") {
            document.getElementById("status").addEventListener("dblclick", function () {
                elem.requestFullscreen();
            }, false);
        }
        
        // Low battery warning, useful for when fullscreen
        navigator.battery = navigator.battery || navigator.mozBattery || navigator.webkitBattery;
        if (navigator.battery && navigator.battery.addEventListener) {
            (function () {
                var wasClosed = false, prevLevel = Infinity;
                navigator.battery.addEventListener("levelchange", function (event) {
                    var level = navigator.battery.level * 100;
                    if (level < 20) {
                        if (!wasClosed || (prevLevel >= 10 && level < 10)) {
                            document.getElementById("batterywarning").style.display = "block";
                            document.getElementById("statustable").style.display = "none";
                            document.getElementById("batterywarning20").style.display = (level < 10) ? "none" : "inline";
                            document.getElementById("batterywarning10").style.display = (level < 10) ? "inline" : "none";
                            wasClosed = false;
                        }
                    } else {
                        document.getElementById("batterywarning").style.display = "none";
                        document.getElementById("statustable").style.display = "";
                        if (level >= 21) wasClosed = false;
                    }
                    prevLevel = level;
                }, false);
                document.getElementById("batterywarning_close").addEventListener("click", function (event) {
                    document.getElementById("batterywarning").style.display = "none";
                    document.getElementById("statustable").style.display = "";
                    wasClosed = true;
                }, false);
            })();
        }
    } else {
        document.getElementById("loading").innerHTML = "ERROR: Your browser does not support some of the JavaScript features required by this page.<br>Please upgrade to a more modern browser.";
    }
};