var is_on = false,
    noflash = false,
    on_color = "#000000",
    off_color = "#FFFFFF",
    volume = 80,
    sounds = {},
    mynum, x, y,
    channel, channeltype,
    source,
    queue = [],
    stop_sound, stop_light;

queue.push = function (item) {
    Array.prototype.push.call(queue, item);
    runseq();
};

function escHTML(html) {
    // NOTE: Also in myutil.js and control.js
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function status(text) {
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

function upd(extra) {
    document.getElementById("status2").innerHTML = queue.length + (extra || 0);
}

function on() {
    document.body.style.backgroundColor = on_color;
    document.body.style.color = off_color;
    is_on = true;
}

function off() {
    document.body.style.backgroundColor = off_color;
    document.body.style.color = on_color;
    is_on = false;
}

function toggle() {
    if (is_on) off();
    else on();
}

function runseq() {
    if (typeof stop_sound == "function" || typeof stop_light == "function") {
        // We're currently running something
        upd(1);
    } else {
        if (queue.length == 0) {
            // We're empty
            upd();
            status("Queue empty.");
        } else {
            status("Running effect...");
            upd();
            var prop = queue.shift();
            
            if (prop.sound) {
                if (sounds[prop.sound]) {
                    var sound = sounds[prop.sound];
                    var endfunc = function (event) {
                        stop_sound();
                    };
                    stop_sound = function (norepeat) {
                        sound.pause();
                        sound.currentTime = 0;
                        stop_sound = null;
                        sound.removeEventListener("ended", endfunc, false);
                        if (!norepeat) {
                            // If the light is already done,
                            // run the next one in the queue
                            if (typeof stop_light != "function") runseq();
                        }
                    };
                    sound.addEventListener("ended", endfunc, false);
                    sound.currentTime = 0;
                    sound.play();
                }
            }
            
            if (prop.light && prop.light != "auto") {
                var timeouts = [];
                stop_light = function (norepeat) {
                    // Make sure all timeouts are cleared
                    // (in case we stop in the middle)
                    for (var i = 0; i < timeouts.length; i++) {
                        if (timeouts[i]) {
                            clearTimeout(timeouts[i]);
                            timeouts[i] = null;
                        }
                    }
                    // This section is also below
                    off();
                    stop_light = null;
                    if (!norepeat) {
                        // If the sound is already done,
                        // run the next one in the queue
                        if (typeof stop_sound != "function") runseq();
                    }
                };
                var list = prop.light;
                if (noflash) {
                    timeouts.push(setTimeout(function () {
                        on();
                        var wait = 0;
                        for (var i = 0; i < list.length; i++) {
                            wait += list[i];
                        }
                        timeouts.push(setTimeout(function () {
                            off();
                            stop_light();
                        }, wait));
                    }, list.shift()));
                } else {
                    var seq = function (cur) {
                        if (!cur) cur = 0;
                        if (cur < list.length) {
                            timeouts.push(setTimeout(function () {
                                toggle();
                                seq(cur + 1);
                            }, list[cur]));
                        } else {
                            stop_light();
                        }
                    };
                    seq();
                }
            } else if (prop.light == "auto" && typeof stop_sound == "function" && sound && sound.duration) {
                if (noflash) {
                    on();
                    var timeout = null;
                    stop_light = function (norepeat) {
                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = null;
                        }
                        // This section is also below
                        off();
                        stop_light = null;
                        if (!norepeat) {
                            // If the sound is already done,
                            // run the next one in the queue
                            if (typeof stop_sound != "function") runseq();
                        }
                    };
                    timeout = setTimeout(function () {
                        off();
                        stop_light();
                    }, Math.floor(sound.duration * 1000));
                } else {
                    alert("TODO!");
                    // TODO: fade the background light-dark-etc. based on volume of sound
                }
            }
        }
    }
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
        status();
        alert("ERROR: Not all features are supported by this browser.\nPlease upgrade your browser and try again.");
    } else {
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
            location.reload();
        }, false);
        
        document.getElementById("noflash_check").addEventListener("change", function (event) {
            noflash = document.getElementById("noflash_check").checked;
        }, false);
        
        document.getElementById("oncolor").addEventListener("change", function (event) {
            on_color = document.getElementById("oncolor").value;
            toggle();
            toggle();
        }, false);
        document.getElementById("offcolor").addEventListener("change", function (event) {
            off_color = document.getElementById("offcolor").value;
            toggle();
            toggle();
        }, false);
        
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
        
        document.getElementById("starterform").addEventListener("submit", function (event) {
            event.preventDefault();
            
            document.getElementById("bigstatuscontainer").style.display = "none";
            document.getElementById("panel_start").style.display = "none";
            document.getElementById("panel_options").style.display = "block";
            document.getElementById("panel").style.display = "block";
            
            var radios = document.getElementsByName("channelradio");
            for (var i = 0; i < radios.length; i++) {
                if (radios[i] && radios[i].checked) {
                    channel = radios[i].value;
                    channeltype = radios[i].getAttribute("data-type") || "timed";
                    document.getElementById("channel_label").innerText = document.getElementById("channel_label").textContent = channel;
                    document.getElementById("channel_label").title = radios[i].getAttribute("data-description");
                    break;
                }
            }
            if (!channel || channel == "0") {
                channel = "0";
                channeltype = "timed";
                document.getElementById("channel_label").innerText = document.getElementById("channel_label").textContent = "Default Channel";
            }
            
            status("Connecting to server...");
            source = new EventSource("/client/stream?channel=" + encodeURIComponent(channel) + "&client=" + mynum + "&x=" + x + "&y=" + y);
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
                                queue.push(data.prop);
                                break;
                            
                            case "next":
                                status("Stopping effect...");
                                if (typeof stop_sound == "function") stop_sound(true);
                                if (typeof stop_light == "function") stop_light(true);
                                runseq();
                                break;
                            
                            case "stop":
                                queue.length = 0;
                                if (typeof stop_sound == "function") stop_sound(true);
                                if (typeof stop_light == "function") stop_light(true);
                                upd();
                                status("Queue emptied."); // slightly different from "Queue empty."
                                break;
                        }
                    }
                }
            };
            source.onerror = function (event) {
                if (source.readyState == 2) {
                    status("Connection closed.");
                } else if (source.readyState == 0) {
                    status("Reconnecting to server...");
                } else {
                    status("Connection ERROR! Status: " + source.readyState);
                }
            };
        }, false);
    }
};