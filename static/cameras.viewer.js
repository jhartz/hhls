function escHTML(html) {
    if (typeof html != "string") {
        html = html + "";
    }
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function status(msg) {
    document.getElementById("status").innerHTML = escHTML(msg).replace(/\n/g, "<br>");
}

var initialized = false,
    attachers = [],
    cameras = [],
    pcs = {};  // pc = pcs[attacherIndex][pcIndex]

window.URL = window.URL || window.webkitURL;

function layoutCameras() {
    var div = document.createElement("div");
    for (var i = 0; i < cameras.length; i++) {
        div.appendChild(cameras[i]);
    }
    document.getElementById("cameras").appendChild(div);
    while (document.getElementById("cameras").childNodes.length > 1) {
        document.getElementById("cameras").removeChild(document.getElementById("cameras").firstChild);
    }
}

window.onload = function () {
    if (typeof document.addEventListener != "function" || typeof JSON == "undefined") {
        document.body.innerHTML = "<p>ERROR: Your browser does not support some of the JavaScript features required by this page.<br>Please upgrade to a more modern browser.</p>";
    } else if (typeof webkitPeerConnection00 == "undefined") {
        document.body.innerHTML = "<p>ERROR: Your browser does not support PeerConnection (webkitPeerConnection00).<br>Please upgrade to a more modern browser.</p>";
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
        
        document.getElementById("options_go").addEventListener("click", function () {
            cameras = [];  // TODO: better "destroy" system (when we first open "Options")
            document.getElementById("options").style.display = "none";
            // testing...
            var attacherIndex = 0;
            var streamIndex = 0;
            socket.emit("request signal", {
                attacherIndex: attacherIndex,
                streamIndex: streamIndex
            });
        }, false);
        
        socket.on("attachers", function (data) {
            if (data && data.length) {
                var html = '';
                attachers = data;
                for (var i = 0; i < data.length; i++) {
                    if (data[i] && data[i].streams && data[i].streams.length) {
                        html += '<p>' + escHTML(data[i].name) + ' - ' + escHTML(data[i].location) + '</p>';
                        html += '<ul>';
                        for (var j = 0; j < data[i].streams.length; j++) {
                            html += '<li><input type="checkbox" id="attacher' + i + 'stream' + j + '">&nbsp;<label for="attacher' + i + 'stream' + j + '">' + escHTML(data[i].streams[j].name) + '</li>';
                        }
                        html += '</ul>';
                    }
                }
                document.getElementById("options_cameras").innerHTML = html;
            }
        });
        
        socket.on("offer", function (data) {
            if (data && typeof data.attacherIndex == "number" && attachers[data.attacherIndex] && typeof data.pcIndex == "number" && data.sdp) {
                if (!pcs[data.attacherIndex]) pcs[data.attacherIndex] = {};
                var pc = new webkitPeerConnection00(null, function onIceCantidate(cantidate, moreToFollow) {
                    typeof console != "undefined" && console.log("onIceCantidate:", cantidate);
                    if (cantidate) {
                        socket.emit("cantidate from viewer", {
                            attacherIndex: data.attacherIndex,
                            pcIndex: pcIndex,
                            label: cantidate.label,
                            cantidate: cantidate.toSdp()
                        });
                    }
                    typeof console != "undefined" && console.log(moreToFollow ? "more to follow" : "no more to follow");
                });
                pc.onaddstream = function (event) {
                    var video = document.createElement("video");
                    video.autoplay = true;
                    video.src = window.URL.createObjectURL(event.stream);
                    cameras.push(video);
                    layoutCameras();
                };
                pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(data.sdp));
                var offer = pc.remoteDescription;
                var answer = pc.createAnswer(offer.toSdp(), {video: true});
                pc.setLocalDescription(pc.SDP_ANSWER, answer);
                pcs[data.attacherIndex][data.pcIndex] = pc;
                socket.emit("answer", {
                    attacherIndex: data.attacherIndex,
                    pcIndex: data.pcIndex,
                    sdp: answer.toSdp()
                });
                pcs[data.attacherIndex][data.pcIndex].startIce();
            }
        });
        
        socket.on("cantidate", function (data) {
            if (data && typeof data.attacherIndex == "number" && pcs[data.attacherIndex] && typeof data.pcIndex == "number" && pcs[data.attacherIndex][data.pcIndex] && data.label && data.cantidate) {
                pcs[data.attacherIndex][data.pcIndex].processIceMessage(new IceCantidate(data.label, data.cantidate));
            }
        });
        
        socket.on("init", function () {
            if (initialized) {
                location.reload();
            } else {
                socket.emit("viewer init");
            }
        });
        
        socket.on("ready", function () {
            initialized = true;
            document.getElementById("options").style.display = "block";
        });
    }
};