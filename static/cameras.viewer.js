function status(msg) {
    document.getElementById("status").innerHTML = shared.escHTML(msg, true);
}

if (typeof console == "undefined") {
    console = {
        log: function () {}
    };
}

var initialized = false,
    attachers = [],
    attachers_streams = [],  // pc = attachers_streams[attacherIndex][streamIndex][peerIndex]
    cameras = [];

window.URL = window.URL || window.webkitURL;

function openOptions() {
    for (var attacherIndex = 0; attacherIndex < attachers_streams.length; streamIndex++) {
        if (attachers_streams[attacherIndex]) {
            for (var streamIndex = 0; streamIndex < attachers_streams[attacherIndex].length; streamIndex++) {
                if (attachers_streams[attacherIndex][streamIndex]) {
                    for (var peerIndex = 0; peerIndex < attachers_streams[attacherIndex][streamIndex].length; peerIndex++) {
                        if (attachers_streams[attacherIndex][streamIndex][peerIndex]) {
                            attachers_streams[attacherIndex][streamIndex][peerIndex].close();
                        }
                    }
                }
            }
        }
    }
    
    attachers_streams = [];
    cameras = [];
    layoutCameras();
    document.getElementById("options_btn_container").style.display = "none";
    document.getElementById("options").style.display = "block";
}

function closeOptions() {
    document.getElementById("options").style.display = "none";
    var inputs = document.getElementById("options_cameras").getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        var attacherIndex = parseInt(inputs[i].getAttribute("data-attacherIndex"), 10);
        var streamIndex = parseInt(inputs[i].getAttribute("data-streamIndex"), 10);
        if (inputs[i].checked && !isNaN(attacherIndex) && !isNaN(streamIndex) && attachers[attacherIndex].streams[streamIndex]) {
            socket.emit("to attacher", {
                destination: attacherIndex,
                event: "request signal",
                data: {
                    streamIndex: streamIndex
                }
            });
        }
    }
    document.getElementById("options_btn_container").style.display = "block";
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
    
    var videos = cam_container.getElementsByTagName("video");
    if (videos.length > 0) {
        // Make all videos as tall as possible without making container scroll
        var height = 300, j;
        var u = function () {
            for (j = 0; j < videos.length; j++) {
                videos[j].style.height = height + "px";
            }
        };
        while (cam_container.scrollHeight <= cam_container.clientHeight && cam_container.scrollWidth <= cam_container.clientWidth && height < screen.height) {
            height += 4;
            u();
        }
        height -= 8;
        u();
        while (cam_container.scrollHeight <= cam_container.clientHeight && cam_container.scrollWidth <= cam_container.clientWidth && height < screen.height) {
            height += 1;
            u();
        }
        height -= 10;
        u();
        height += 9;
        u();
    }
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
        
        document.getElementById("options_btn").addEventListener("click", function () {
            openOptions();
        }, false);
        
        document.getElementById("options_go").addEventListener("click", function () {
            closeOptions();
        }, false);
        
        socket.on("attachers", function (msg) {
            if (msg && msg.length) {
                var html = '';
                attachers = msg;
                for (var i = 0; i < msg.length; i++) {
                    if (msg[i] && msg[i].streams && msg[i].streams.length) {
                        html += '<p>' + shared.escHTML(msg[i].name) + ' (' + shared.escHTML(msg[i].location) + ')</p>';
                        html += '<ul>';
                        for (var j = 0; j < msg[i].streams.length; j++) {
                            html += '<li><input type="checkbox" data-attacherIndex="' + i + '" data-streamIndex="' + j + '" id="attacher' + i + 'stream' + j + '">&nbsp;<label for="attacher' + i + 'stream' + j + '">' + shared.escHTML(msg[i].streams[j].name) + '</li>';
                        }
                        html += '</ul>';
                    }
                }
                document.getElementById("options_cameras").innerHTML = html;
            }
        });
        
        socket.on("offer", function (msg) {
            if (msg && typeof msg.source == "number" && attachers[msg.source] &&
                typeof msg.data.streamIndex == "number" && attachers[msg.source].streams[msg.data.streamIndex] &&
                typeof msg.data.peerIndex == "number" &&
                msg.data.sdp) {
                
                if (!attachers_streams[msg.source]) attachers_streams[msg.source] = [];
                if (!attachers_streams[msg.source][msg.data.streamIndex]) attachers_streams[msg.source][msg.data.streamIndex] = [];
                var pc = new webkitPeerConnection00(null, function onIceCandidate(candidate, moreToFollow) {
                    console.log("onIceCandidate:", candidate);
                    if (candidate) {
                        socket.emit("to attacher", {
                            destination: msg.source,
                            event: "candidate",
                            data: {
                                streamIndex: msg.data.streamIndex,
                                peerIndex: msg.data.peerIndex,
                                label: candidate.label,
                                candidate: candidate.toSdp()
                            }
                        });
                    }
                    console.log(moreToFollow ? "more to follow" : "no more to follow");
                });
                pc.onaddstream = function (event) {
                    var video = document.createElement("video");
                    video.autoplay = true;
                    video.src = window.URL.createObjectURL(event.stream);
                    cameras.push(video);
                    layoutCameras();
                };
                var offer = new SessionDescription(msg.data.sdp);
                pc.setRemoteDescription(pc.SDP_OFFER, offer);
                //var offer = pc.remoteDescription;
                var answer = pc.createAnswer(offer.toSdp(), {video: true});
                pc.setLocalDescription(pc.SDP_ANSWER, answer);
                socket.emit("to attacher", {
                    destination: msg.source,
                    event: "answer",
                    data: {
                        streamIndex: msg.data.streamIndex,
                        peerIndex: msg.data.peerIndex,
                        sdp: answer.toSdp()
                    }
                });
                pc.startIce();
                attachers_streams[msg.source][msg.data.streamIndex][msg.data.peerIndex] = pc;
            }
        });
        
        socket.on("candidate", function (msg) {
            if (msg && typeof msg.source == "number" &&
                typeof msg.data.streamIndex == "number" && attachers_streams[msg.source][msg.data.streamIndex] &&
                typeof msg.data.peerIndex == "number" && attachers_streams[msg.source][msg.data.streamIndex][msg.data.peerIndex] &&
                msg.data.label && msg.data.candidate) {
                
                attachers_streams[msg.source][msg.data.streamIndex][msg.data.peerIndex].processIceMessage(new IceCandidate(msg.data.label, msg.data.candidate));
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