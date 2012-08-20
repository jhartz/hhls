function escHTML(html) {
    if (typeof html != "string") {
        html = html + "";
    }
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function status(msg) {
    document.getElementById("status").innerHTML = escHTML(msg).replace(/\n/g, "<br>");
}

var socket,
    streams = [],
    pcs = [];

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL;

function sendStreams() {
    var streamsList = [];
    for (var i = 0; i < streams.length; i++) {
        if (streams[i] && streams[i].stream) {
            streamsList[i] = {
                name: streams[i].name
            };
        } else {
            streamsList[i] = null;
        }
    }
    socket.emit("streams", streamsList);
}

function addCamera() {
    navigator.getUserMedia({video: true}, function (stream) {
        var streamIndex = streams.length;
        streams[streamIndex] = {
            name: "Camera #" + streamIndex,
            peers: []
        };
        streams[streamIndex].stream = stream;
        sendStreams();
        
        var div = document.createElement("div");
        div.id = "div" + streamIndex;
        div.className = "container";
        var h2 = document.createElement("h2");
        h2.innerHTML = escHTML(streams[streamIndex].name);
        div.appendChild(h2);
        h2.addEventListener("click", function () {
            var newname = prompt("Name:", streams[streamIndex].name);
            if (newname) {
                streams[streamIndex].name = newname;
                h2.innerHTML = escHTML(streams[streamIndex].name);
                sendStreams();
            }
        }, false);
        var video = document.createElement("video");
        video.id = "video" + streamIndex;
        video.autoplay = true;
        video.src = window.URL.createObjectURL(stream);
        div.appendChild(video);
        var outer = document.createElement("div");
        outer.appendChild(div);
        document.getElementById("content").appendChild(outer);
    }, function (err) {
        typeof console != "undefined" && console.log("getUserMedia ERROR:", err);
        status("ERROR: getUserMedia failed!\nMake sure your camera is connected.");
    });
}

function addPeer(streamIndex, viewerIndex) {
    var pcIndex = pcs.length;
    pcs[pcIndex] = new webkitPeerConnection00(null, function onIceCantidate(cantidate, moreToFollow) {
        typeof console != "undefined" && console.log("onIceCantidate:", cantidate);
        if (cantidate) {
            socket.emit("cantidate from attacher", {
                viewerIndex: viewerIndex,
                pcIndex: pcIndex,
                label: cantidate.label,
                cantidate: cantidate.toSdp()
            });
        }
        typeof console != "undefined" && console.log(moreToFollow ? "more to follow" : "no more to follow");
    });
    pcs[pcIndex].addStream(streams[streamIndex].stream);
    var offer = pcs[pcIndex].createOffer({video: true});
    pcs[pcIndex].setLocalDescription(pcs[pcIndex].SDP_OFFER, offer);
    socket.emit("offer", {
        viewerIndex: viewerIndex,
        pcIndex: pcIndex,
        sdp: offer.toSdp()
    });
    pcs[pcIndex].startIce();
}

window.onload = function () {
    if (typeof document.addEventListener != "function" || typeof JSON == "undefined") {
        document.getElementById("main").innerHTML = "ERROR: Your browser does not support some of the JavaScript features required by this page.<br>Please upgrade to a more modern browser.";
    } else if (!navigator.getUserMedia) {
        document.getElementById("main").innerHTML = "ERROR: Your browser does not support getUserMedia.<br>Please upgrade to a more modern browser.";
    } else if (typeof webkitPeerConnection00 == "undefined") {
        document.getElementById("main").innerHTML = "ERROR: Your browser does not support PeerConnection (webkitPeerConnection00).<br>Please upgrade to a more modern browser.";
    } else {
        socket = io.connect("/cameras");
        socket.on("connecting", function () {
            status("Connecting to server...");
        });
        socket.on("connect", function () {
            status("Connected to server");
        });
        socket.on("connect_failed", function () {
            status("Failed to establish connection to server");
        });
        socket.on("disconnect", function () {
            status("Disconnected from server");
        });
        socket.on("error", function () {
            status("Error connecting to server");
        });
        socket.on("reconnect", function () {
            status("Reconnected to server");
        });
        socket.on("reconnecting", function () {
            status("Reconnecting to server...");
        });
        socket.on("reconnect_failed", function () {
            status("Failed to reconnect to server");
        });
        
        socket.on("init", function () {
            if (streams.length > 0) {
                location.reload();
            } else {
                socket.emit("attacher init", config);
            }
        });
        socket.on("ready", function () {
            document.getElementById("addCamera").addEventListener("click", function () {
                addCamera();
            }, false);
            document.getElementById("addCamera").parentNode.style.display = "block";
            addCamera();
        });
        
        socket.on("request signal", function (data) {
            if (data && typeof data.viewerIndex == "number" && typeof data.streamIndex == "number" && streams[data.streamIndex]) {
                addPeer(data.streamIndex, data.viewerIndex);
            } else {
                status("Bad request for camera: " + JSON.stringify(data));
            }
        });
        
        socket.on("answer", function (data) {
            if (data && typeof data.viewerIndex == "number" && typeof data.pcIndex == "number" && pcs[data.pcIndex] && data.sdp) {
                pcs[data.pcIndex].setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(data.sdp));
            }
        });
        
        socket.on("cantidate", function (data) {
            if (data && typeof data.viewerIndex == "number" && typeof data.pcIndex == "number" && pcs[data.pcIndex] && data.label && data.cantidate) {
                pcs[data.pcIndex].processIceMessage(new IceCantidate(data.label, data.cantidate));
            }
        });
    }
};