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

function openOptions() {
    for (var attacherIndex in pcs) {
        if (pcs.hasOwnProperty(attacherIndex) && pcs[attacherIndex]) {
            for (var pcIndex in pcs[attacherIndex]) {
                if (pcs[attacherIndex].hasOwnProperty(pcIndex) && pcs[attacherIndex][pcIndex]) {
                    pcs[attacherIndex][pcIndex].close();
                }
            }
        }
    }
    cameras = [];
    pcs = {};
    layoutCameras();
    document.getElementById("options").style.display = "block";
}

function closeOptions() {
    document.getElementById("options").style.display = "none";
    var inputs = document.getElementById("options_cameras").getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        var attacherIndex = parseInt(inputs[i].getAttribute("data-attacherIndex"), 10);
        var streamIndex = parseInt(inputs[i].getAttribute("data-streamIndex"), 10);
        if (inputs[i].checked && !isNaN(attacherIndex) && !isNaN(streamIndex) && attachers[attacherIndex].streams[streamIndex]) {
            socket.emit("request signal", {
                attacherIndex: attacherIndex,
                streamIndex: streamIndex
            });
        }
    }
}

function layoutCameras() {
    var cam_container = document.getElementById("cameras");
    var container = document.createElement("div");
    for (var i = 0; i < cameras.length; i++) {
        container.appendChild(cameras[i]);
    }
    cam_container.appendChild(container);
    while (cam_container.childNodes.length > 1) {
        cam_container.removeChild(cam_container.firstChild);
    }
    
    // Make all videos as tall as possible without scrolling
    var height = 300, videos = cam_container.getElementsByTagName("video"), j;
    var u = function () {
        for (j = 0; j < videos.length; j++) {
            videos[j].style.height = height + "px";
        }
    };
    while (cam_container.scrollHeight <= cam_container.clientHeight) {
        height += 4;
        u();
    }
    height -= 8;
    u();
    while (cam_container.scrollHeight <= cam_container.clientHeight) {
        height += 1;
        u();
    }
    height -= 10;
    u();
    height += 9;
    u();
}

window.onload = function () {
    if (typeof document.addEventListener != "function" || typeof JSON == "undefined" || typeof document.getElementsByTagName != "function") {
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
            closeOptions();
        }, false);
        
        socket.on("attachers", function (data) {
            if (data && data.length) {
                var html = '';
                attachers = data;
                for (var i = 0; i < data.length; i++) {
                    if (data[i] && data[i].streams && data[i].streams.length) {
                        html += '<p>' + escHTML(data[i].name) + ' (' + escHTML(data[i].location) + ')</p>';
                        html += '<ul>';
                        for (var j = 0; j < data[i].streams.length; j++) {
                            html += '<li><input type="checkbox" data-attacherIndex="' + i + '" data-streamIndex="' + j + '" id="attacher' + i + 'stream' + j + '">&nbsp;<label for="attacher' + i + 'stream' + j + '">' + escHTML(data[i].streams[j].name) + '</li>';
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
            openOptions();
        });
    }
};