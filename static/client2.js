window.onload = function () {
    if (document.getElementById && document.addEventListener) {
        document.getElementById("status_closeall").addEventListener("click", function (event) {
            var frames = document.getElementsByTagName("iframe");
            for (var i = 0; i < frames.length; i++) {
                frames[i].contentWindow.closeconn();
            }
        }, false);
        
        document.getElementById("intercom_checkbox").addEventListener("change", function (event) {
            if (document.getElementById("intercom_checkbox").checked) {
                alert("TODO: Intercom!");
            }
        }, false);
        
        document.getElementById("maincontent").style.display = "block";
    } else {
        document.getElementById("loading").innerHTML = "ERROR: Your browser does not support some of the JavaScript features required by this page.<br>Please upgrade to a more modern browser.";
    }
};