function status(msg) {
    document.getElementById("status").innerHTML = shared.escHTML(msg, true);
}

var socket,
    streams = [];

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.mozURL;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

function sendStreams() {
    var streamsList = [];
    for (var i = 0; i < streams.length; i++) {
        if (streams[i] && streams[i].stream) {
            streamsList[i] = {
                name: streams[i].name
            };
        }
    }
    socket.emit("streams", streamsList);
}

function addCamera() {
    navigator.getUserMedia({video: true}, function (stream) {
        var streamIndex = streams.length;
        streams[streamIndex] = {
            name: "Camera #" + (streamIndex + 1),
            peers: []
        };
        streams[streamIndex].stream = stream;
        sendStreams();
        
        var container = document.createElement("div");
        container.id = "container" + streamIndex;
        container.className = "container";
        
        var button = document.createElement("button");
        button.innerHTML = "X";
        container.appendChild(button);
        
        var h2 = document.createElement("h2");
        h2.innerHTML = shared.escHTML(streams[streamIndex].name);
        container.appendChild(h2);
        
        var video = document.createElement("video");
        video.id = "video" + streamIndex;
        video.autoplay = true;
        if (typeof video.mozSrcObject != "undefined") {
            video.mozSrcObject = stream;
        } else if (window.URL) {
            video.src = window.URL.createObjectURL(stream);
        } else {
            video.src = stream;
        }
        container.appendChild(video);
        
        h2.addEventListener("click", function () {
            var newname = prompt("Name:", streams[streamIndex].name);
            if (newname) {
                streams[streamIndex].name = newname;
                h2.innerHTML = shared.escHTML(streams[streamIndex].name);
                sendStreams();
            }
        }, false);
        button.addEventListener("click", function () {
            for (var i = 0; i < streams[streamIndex].peers.length; i++) {
                streams[streamIndex].peers[i].close();
            }
            delete streams[streamIndex];
            sendStreams();
            document.getElementById("content").removeChild(container);
        }, false);
        
        document.getElementById("content").appendChild(container);
    }, function (err) {
        status("ERROR: getUserMedia failed!\nMake sure your camera is connected.");
        console.log("getUserMedia ERROR:", err);
    });
}

function addPeer(streamIndex, viewerIndex) {
    var peerIndex = streams[streamIndex].peers.length;
    var pc = new webkitPeerConnection00(null, function onIceCandidate(candidate, moreToFollow) {
        console.log("Found Ice Candidate:", candidate);
        if (candidate) {
            socket.emit("to viewer", {
                destination: viewerIndex,
                event: "candidate",
                data: {
                    streamIndex: streamIndex,
                    peerIndex: peerIndex,
                    label: candidate.label,
                    candidate: candidate.toSdp()
                }
            });
        }
        console.log(moreToFollow ? "more to follow" : "no more to follow");
    });
    pc.addStream(streams[streamIndex].stream);
    var offer = pc.createOffer({video: true});
    pc.setLocalDescription(pc.SDP_OFFER, offer);
    socket.emit("to viewer", {
        destination: viewerIndex,
        event: "offer",
        data: {
            streamIndex: streamIndex,
            peerIndex: peerIndex,
            sdp: offer.toSdp()
        }
    });
    pc.startIce();
    streams[streamIndex].peers[peerIndex] = pc;
}

window.onload = function () {
    status("Loading...");
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
        
        socket.on("request signal", function (msg) {
            if (msg && typeof msg.source == "number" && msg.data &&
                typeof msg.data.streamIndex == "number" && streams[msg.data.streamIndex]) {
                
                addPeer(msg.data.streamIndex, msg.source);
            } else {
                status("Bad request for camera: " + JSON.stringify(msg));
            }
        });
        
        socket.on("answer", function (msg) {
            if (msg && typeof msg.source == "number" && msg.data &&
                typeof msg.data.streamIndex == "number" && streams[msg.data.streamIndex] &&
                typeof msg.data.peerIndex == "number" && streams[msg.data.streamIndex].peers[msg.data.peerIndex] &&
                msg.data.sdp) {
                
                streams[msg.data.streamIndex].peers[msg.data.peerIndex].setRemoteDescription(streams[msg.data.streamIndex].peers[msg.data.peerIndex].SDP_ANSWER, new SessionDescription(msg.data.sdp));
            }
        });
        
        socket.on("candidate", function (msg) {
            if (msg && typeof msg.source == "number" && msg.data &&
                typeof msg.data.streamIndex == "number" && streams[msg.data.streamIndex] &&
                typeof msg.data.peerIndex == "number" && streams[msg.data.streamIndex].peers[msg.data.peerIndex] &&
                msg.data.label && msg.data.candidate &&
                streams[msg.data.streamIndex].peers[msg.data.peerIndex].remoteDescription) {
                
                streams[msg.data.streamIndex].peers[msg.data.peerIndex].processIceMessage(new IceCandidate(msg.data.label, msg.data.candidate));
            }
        });
    }
};