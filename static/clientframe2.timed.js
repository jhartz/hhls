// NOTE: This is similar to clientframe2.dimmed.js (update that when you update this)

var queue = [];
var stop_sound, stop_light;

queue.push = function (item) {
    Array.prototype.push.call(queue, item);
    runseq();
};

function upd(extra) {
    document.getElementById("status2").innerHTML = queue.length + (extra || 0);
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
                    status("TODO: Automatic Lighting!");
                    // TODO: fade the background light-dark-etc. based on volume of sound
                    // (see TODO in root of codebase)
                }
            } else {
                // No light or sound
                oneffectnext();
            }
        }
    }
}

oneffectplay = function (prop) {
    queue.push(prop);
};

oneffectnext = function () {
    status("Stopping effect...");
    if (typeof stop_sound == "function") stop_sound(true);
    if (typeof stop_light == "function") stop_light(true);
    runseq();
};

oneffectstop = function () {
    queue.length = 0;
    if (typeof stop_sound == "function") stop_sound(true);
    if (typeof stop_light == "function") stop_light(true);
    upd();
    status("Queue emptied."); // slightly different from "Queue empty."
};