var is_on = false,
    noflash = false,
    oncolor = "#000000",
    offcolor = "#FFFFFF",
    volume = 80,
    sounds = {},
    source,
    stuff,
    oneffectplay = function () {},
    oneffectnext = function () {},
    oneffectstop = function () {};

function escHTML(html) {
    if (typeof html != "string") {
        html = html + "";
    }
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function status(text, in_loading) {
    if (in_loading) {
        document.getElementById("loading").style.display = "block";
        document.getElementById("leftpanel").style.display = "none";
        document.getElementById("rightpanel").style.display = "none";
        
        document.getElementById("loading").innerHTML = escHTML(text || "").replace(/\n/g, "<br>");
    } else {
        document.getElementById("loading").style.display = "none";
        document.getElementById("leftpanel").style.display = "block";
        document.getElementById("rightpanel").style.display = "block";
        
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
            
            document.getElementById("status").innerHTML = A + "&nbsp;&nbsp;&nbsp; " + B;
            
            var elem = document.createElement("tr");
            elem.innerHTML = "<td>" + A + "</td><td>" + B + "</td>";
            if (document.getElementById("options_statushistory").childNodes.length > 0) {
                document.getElementById("options_statushistory").insertBefore(elem, document.getElementById("options_statushistory").childNodes[0]);
            } else {
                document.getElementById("options_statushistory").appendChild(elem);
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
    document.body.style.backgroundColor = offcolor;
    document.body.style.textShadow = "1px 1px 1px " + offcolor;
    document.body.style.color = oncolor;
    document.getElementById("bg").style.backgroundColor = oncolor;
}

function closeconn() {
    if (source) {
        status("Disconnecting from server...");
        if (typeof source.close == "function") source.close();
        document.getElementById("options_closeconn").style.display = "none";
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
    if (!document.getElementById || !document.addEventListener || !document.getElementsByTagName) {
        alert("ERROR: Your browser does not support some of the JavaScript features required by this page.\nPlease upgrade to a more modern browser.");
    } else if (!window.EventSource) {
        alert("ERROR: Your browser does not support Server-Sent Events.\nPlease upgrade to a more modern browser.");
    } else {
        status("Loading...", true);
        
        if (window._hhls_) {
            // NOTE: Same code in clientframe.js (update that when you update this)
            var d = new Date(), key = [];
            for (var i = 0; i < 12; i++) key[i] = document.getElementById("hhls_keyholder")["y" + d.getFullYear()][i];
            key.a = d.getMonth();
            key.b = d.getDay() + d.getDate();
            key.c = key[key.a];
            stuff = _hhls_()(key)();
        }
        
        document.getElementById("options_btn").addEventListener("click", function (event) {
            document.getElementById("options").style.display = "block";
            return false;
        }, false);
        document.getElementById("options_close").addEventListener("click", function (event) {
            document.getElementById("options").style.display = "none";
            return false;
        }, false);
        
        document.getElementById("options_closeconn").addEventListener("click", function (event) {
            closeconn();
        }, false);
        
        document.getElementById("options_changechannel").addEventListener("click", function (event) {
            location.href = "/client/frame?cid=" + cid + "&x=" + x + "&y=" + y;
        }, false);
        
        document.getElementById("options_oncolor").addEventListener("change", function (event) {
            oncolor = document.getElementById("options_oncolor").value;
            updatecolor();
        }, false);
        document.getElementById("options_offcolor").addEventListener("change", function (event) {
            offcolor = document.getElementById("options_offcolor").value;
            updatecolor();
        }, false);
        
        if (document.getElementById("options_noflash")) {
            document.getElementById("options_noflash").addEventListener("change", function (event) {
                noflash = document.getElementById("options_noflash").checked;
            }, false);
        }
        
        if (document.getElementById("options_volume")) {
            // If we have found this element, then sound is enabled
            
            document.getElementById("options_volume").addEventListener("change", function (event) {
                volume = parseInt(document.getElementById("options_volume").value, 10);
                if (isNaN(volume)) {
                    document.getElementById("options_volume").value = volume = 80;
                } else if (volume < 0) {
                    document.getElementById("options_volume").value = volume = 0;
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
                document.getElementById("options_soundlist").innerHTML += '<li>' + escHTML(soundlist[i].dataset.sound) + '</li>';
            }
        }
        
        // Tell parent what channel we are (so it can record it in its URL)
        try {
            parent.client_channel(x, y, channel);
        } catch (err) {}
        
        status("Connecting to server...", true);
        
        source = new EventSource("/client/stream?channel=" + encodeURIComponent(channel) + "&cid=" + cid + "&x=" + x + "&y=" + y);
        source.onopen = function (event) {
            status("Connected to server.");
            document.getElementById("options_closeconn").style.display = "block";
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
        
        if (typeof old_prop != "undefined") oneffectplay(old_prop);
    }
};