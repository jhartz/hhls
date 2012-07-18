// NOTE: This is similar to clientframe2.timed.js (update that when you update this)

var queue = [],
    inc = false,
    cur = 0,
    change_per_ms = 0,
    final = 0,
    lasttime = 0,
    STOP_ME = false,
    running = false,
    timeout = null,
    animation = null;

queue.push = function (item) {
    Array.prototype.push.call(queue, item);
    runseq();
};

function upd(extra) {
    document.getElementById("status2").innerHTML = queue.length + (extra || 0);
}

function upd2() {
    var val = (Math[inc ? "floor" : "round"](cur * 100) / 100).toString();
    if (val.indexOf(".") != -1) {
        var decimals = val.length - (val.indexOf(".") + 1);
        if (decimals == 1) val += "0";
    } else {
        val += ".00";
    }
    document.getElementById("status3").innerHTML = val + "%";
}

var requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.oRequestAnimationFrame ||
           window.msRequestAnimationFrame;
})();
var cancelAnimFrame = (function () {
    return window.canceltAnimationFrame ||
           window.mozCancelAnimationFrame ||
           window.webkitCancelAnimationFrame ||
           window.oCancelAnimationFrame ||
           window.msCancelAnimationFrame;
})();

function do_effect() {
    if (STOP_ME) {
        STOP_ME = false;
    } else {
        var mytime = (new Date()).getTime();
        var time = mytime - lasttime;
        lasttime = mytime;
        
        var change = time * change_per_ms;
        
        if ((inc && (cur + change) < final) || (!inc && (cur + change) > final)) {
            cur += change;
            dim(cur);
            upd2();
            if (requestAnimFrame) {
                animation = requestAnimFrame(do_effect);
            } else {
                timeout = setTimeout(do_effect, 10);
            }
        } else {
            cur = final;
            dim(final);
            upd2();
            running = false;
            runseq();
        }
    }
}

function runseq() {
    if (running) {
        // We're currently running something
        upd(1);
    } else {
        if (queue.length == 0) {
            // We're empty
            upd();
            status("Queue empty.");
        } else {
            status("Running effect...");
            STOP_ME = false;
            upd();
            var prop = queue.shift();
            
            if (typeof prop.dimness == "number" && prop.dimness >= 0 && prop.dimness <= 100) {
                if (typeof prop.time == "number") {
                    running = true;
                    inc = !!(prop.dimness > cur);
                    final = prop.dimness;
                    lasttime = (new Date()).getTime();
                    change_per_ms = (prop.dimness - cur) / (prop.time * 1000);
                    do_effect();
                } else {
                    cur = prop.dimness;
                    dim(prop.dimness);
                    upd2();
                    runseq();
                }
            }
        }
    }
}

oneffectplay = function (prop) {
    queue.push(prop);
};

oneffectnext = function () {
    status("Stopping effect...");
    
    STOP_ME = true;
    if (timeout) clearTimeout(timeout);
    timeout = null;
    if (animation && cancelAnimFrame) cancelAnimFrame(animation);
    animation = null;
    
    cur = final;
    dim(cur);
    upd2();
    running = false;
    
    runseq();
};

oneffectstop = function () {
    status("Emptying queue...");
    queue.length = 0;
    
    STOP_ME = true;
    if (timeout) clearTimeout(timeout);
    timeout = null;
    if (animation && cancelAnimFrame) cancelAnimFrame(animation);
    animation = null;
    
    cur = final;
    dim(cur);
    upd2();
    running = false;
    
    runseq();
};