var is_on = false,
    noflash = false,
    on_color = "#000000",
    off_color = "#FFFFFF",
    volume = 80,
    sounds = {},
    source,
    oneffectplay = function () {},
    oneffectnext = function () {},
    oneffectstop = function () {};

function escHTML(html) {
    // NOTE: Also in myutil.js and control.js
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function status(text, in_loading) {
    if (in_loading) {
        document.getElementById("loading").style.display = "block";
        document.getElementById("panel").style.display = "none";
        
        document.getElementById("loading").innerHTML = escHTML(text || "").replace(/\n/g, "<br>");
    } else {
        document.getElementById("loading").style.display = "none";
        document.getElementById("panel").style.display = "block";
        
        if (!text) {
            document.getElementById("status").innerHTML = "";
        } else {
            var now = new Date(),
                h = now.getHours() + "",
                m = now.getMinutes() + "",
                s = now.getSeconds() + "";
            if (h.length == 1) h = "0" + h;
            if (m.length == 1) m = "0" + m;
            if (s.length == 1) s = "0" + s;
            
            var A = h + ":" + m + ":" + s;
            var B = escHTML(text).replace(/\n/g, "<br>");
            
            document.getElementById("status").innerHTML = A + "&nbsp;&nbsp;&nbsp;&nbsp;" + B;
            
            var elem = document.createElement("tr");
            elem.innerHTML = "<td>" + A + "</td><td>" + B + "</td>";
            if (document.getElementById("statushistory").childNodes.length > 0) {
                document.getElementById("statushistory").insertBefore(elem, document.getElementById("statushistory").childNodes[0]);
            } else {
                document.getElementById("statushistory").appendChild(elem);
            }
        }
    }
}

function dim(percent) {
    document.getElementById("bg").style.opacity = percent / 100;
}

function on() {
    dim(100);
    is_on = true;
}

function off() {
    dim(0);
    is_on = false;
}

function toggle() {
    if (is_on) off();
    else on();
}

function updatecolor() {
    document.body.style.backgroundColor = off_color;
    document.body.style.textShadow = "1px 1px 1px " + off_color;
    document.body.style.color = on_color;
    document.getElementById("bg").style.backgroundColor = on_color;
}

function closeconn() {
    if (source) {
        status("Disconnecting from server...");
        if (typeof source.close == "function") source.close();
        document.getElementById("close").style.display = "none";
        setTimeout(function loopsieloopsieloo() {
            if (source.readyState == 2) {
                status("Disconnected from server.");
            } else {
                setTimeout(loopsieloopsieloo, 1000);
            }
        }, 500);
    }
}

window.onload = function () {
    if (!document.getElementById || !window.EventSource || !document.addEventListener || !document.getElementsByTagName) {
        alert("ERROR: Your browser does not support some of the JavaScript features required by this page.\nPlease upgrade to a more modern browser.");
    } else {
        status("Loading...", true);
        
        document.getElementById("options").addEventListener("click", function (event) {
            document.getElementById("bigstatuscontainer").style.display = "block";
            return false;
        }, false);
        document.getElementById("closer").addEventListener("click", function (event) {
            document.getElementById("bigstatuscontainer").style.display = "none";
            return false;
        }, false);
        
        document.getElementById("close").addEventListener("click", function (event) {
            closeconn();
        }, false);
        
        document.getElementById("reloader").addEventListener("click", function (event) {
            location.href = "/client/frame?cid=" + cid + "&x=" + x + "&y=" + y;
        }, false);
        
        document.getElementById("oncolor").addEventListener("change", function (event) {
            on_color = document.getElementById("oncolor").value;
            updatecolor();
        }, false);
        document.getElementById("offcolor").addEventListener("change", function (event) {
            off_color = document.getElementById("offcolor").value;
            updatecolor();
        }, false);
        
        if (document.getElementById("noflash_check")) {
            document.getElementById("noflash_check").addEventListener("change", function (event) {
                noflash = document.getElementById("noflash_check").checked;
            }, false);
        }
        
        if (document.getElementById("slider")) {
            // If we have found this element, then sound is enabled
            
            document.getElementById("slider").addEventListener("change", function (event) {
                volume = parseInt(document.getElementById("slider").value, 10);
                if (isNaN(volume)) {
                    document.getElementById("slider").value = volume = 80;
                } else if (volume < 0) {
                    document.getElementById("slider").value = volume = 0;
                }
                
                var audios = document.getElementsByTagName("audio");
                for (var i = 0; i < audios.length; i++) {
                    audios[i].volume = volume / 100;
                }
            }, false);
            
            // Organize sound effects
            var soundlist = document.getElementsByTagName("audio");
            for (var i = 0; i < soundlist.length; i++) {
                sounds[soundlist[i].dataset.sound] = soundlist[i];
                // TODO: run this below on the audio's onload (if it's not already loaded)
                document.getElementById("sndlst").innerHTML += '<li>' + escHTML(soundlist[i].dataset.sound) + '</li>';
            }
        }
        
        status("Connecting to server...", true);
        
        source = new EventSource("/client/stream?channel=" + encodeURIComponent(channel) + "&cid=" + cid + "&x=" + x + "&y=" + y);
        source.onopen = function (event) {
            status("Connected to server.");
            document.getElementById("close").style.display = "block";
        };
        source.onmessage = function (event) {
            try {
                var data = JSON.parse(event.data);
            } catch (err) {
                status("ERROR: Couldn't parse message from server: " + event.data + "\n(" + err + ")");
            }
            if (data) {
                if (data.command) {
                    switch (data.command) {
                        case "play":
                            oneffectplay(data.prop);
                            break;
                        
                        case "next":
                            oneffectnext();
                            break;
                        
                        case "stop":
                            oneffectstop();
                            break;
                    }
                }
            }
        };
        source.onerror = function (event) {
            if (source.readyState == 2) {
                status("Connection closed.", true);
            } else if (source.readyState == 0) {
                status("Reconnecting to server...", true);
            } else {
                status("Connection ERROR! Status: " + source.readyState, true);
            }
        };
    }
};