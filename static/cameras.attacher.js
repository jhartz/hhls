function escHTML(html) {
    // NOTE: Also in myutil.js and clientframe2.js
    if (typeof html != "string") {
        html = html + "";
    }
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function status(section, msg) {
    $("#status_" + section).html(escHTML(msg).replace(/\n/g, "<br>"));
}

var socket;

$(function () {
    socket = io.connect("/cameras");
    socket.on("connecting", function () {
        status("socket", "Connecting to server...");
    });
    socket.on("connect", function () {
        status("socket", "Connected to server");
    });
    socket.on("connect_failed", function () {
        status("socket", "Failed to establish connection to server");
    });
    
    socket.on("message", function (message) {
        try {
            var msg = $.parseJSON(message);
        } catch (err) {
            status("socket", "ERROR: Invalid JSON received from server:\n" + message + "\n\n" + err);
        }
        try {
            if (msg && msg.about) {
                switch (msg.about) {
                    case "stuff":
                        status("blah");
                        break;
                    default:
                        status("socket", "ERROR: Invalid message received from server:\n" + message);
                }
            } else {
                status("socket", "ERROR: Invalid data received from server:\n" + message);
            }
        } catch (err) {
            status("socket", "Error processing message from server:\n" + message + "\n\n" + err);
        }
    });
    
    socket.on("disconnect", function () {
        status("socket", "Disconnected from server");
    });
    socket.on("error", function () {
        status("socket", "Error connecting to server");
    });
    socket.on("reconnect", function () {
        status("socket", "Reconnected to server");
    });
    socket.on("reconnecting", function () {
        status("socket", "Reconnecting to server...");
    });
    socket.on("reconnect_failed", function () {
        status("socket", "Failed to reconnect to server");
    });
    
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL;
    if (navigator.getUserMedia) {
        navigator.getUserMedia({video: true}, function (stream) {
            status("video", "Connected to video stream");
            var video = document.createElement("video");
            video.autoplay = true;
            video.src = window.URL.createObjectURL(stream);
            $("#content").append(video);
        }, function (err) {
            status("video", "ERROR: getUserMedia failed! Details: " + err);
        });
    } else {
        status("video", "ERROR: Your browser does not support some of the HTML5 and JavaScript features required by this page.\nPlease upgrade to a more modern browser.");
    }
});