function client_channel(x, y, channel) {
    if (history.replaceState) {
        var oldquery = "&" + location.search.substring(1);
        if (oldquery.indexOf("&channel_" + x + "x" + y + "=") != -1) {
            var badquery = oldquery.substring(oldquery.indexOf("&channel_" + x + "x" + y + "=") + 1);
            oldquery = oldquery.substring(0, oldquery.indexOf("&channel_" + x + "x" + y + "="));
            if (badquery.indexOf("&") != -1) oldquery += badquery.substring(badquery.indexOf("&"));
        }
        oldquery = oldquery.substring(1);
        history.replaceState({}, "", location.pathname + "?" + oldquery + "&channel_" + x + "x" + y + "=" + encodeURIComponent(channel));
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
    } else {
        document.getElementById("loading").innerHTML = "ERROR: Your browser does not support some of the JavaScript features required by this page.<br>Please upgrade to a more modern browser.";
    }
};