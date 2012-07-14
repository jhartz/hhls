function escHTML(html) {
    // NOTE: Also in myutil.js and client.js
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function resizer() {
    $("section > header").each(function () {
        $(this).parent().css("padding-top", Math.round($(this).outerHeight()) + "px");
    });
    $("section > footer").each(function () {
        $(this).parent().css("padding-bottom", Math.round($(this).outerHeight() + 20) + "px");
    });
    
    var height = $("#dummy").outerHeight(true) - $("section.bottom").outerHeight(true);
    $("section.top").not(".minimized").each(function () {
        var diff = $(this).outerHeight(true) - $(this).height();
        $(this).css({
            height: Math.floor(height - diff) + "px",
            width: "",
            top: "",
            left: "",
            right: ""
        });
    });
    $("section.top.minimized").each(function () {
        var anims = {
            width: Math.floor(height / 2) + "px",
            top: Math.floor(height / 2) + "px"
        };
        anims[$(this).is(".left") ? "left" : "right"] = (height / -4 + $(this).outerHeight() / 2) + "px";
        $(this).animate(anims);
    });
}

$(function () {
    video.init();
    effects.init();
    conn.init();
    
    resizer();
    
    $("section.top > header").css("cursor", "pointer").click(function (event) {
        if ($(this).parent().hasClass("minimized")) {
            $(this).parent().removeClass("minimized");
            resizer();
        } else {
            $(this).parent().addClass("minimized");
            setTimeout(resizer, 1010);
        }
    });
});

$(window).resize(function () {
    resizer();
    video.adjust();
});

var video = {
    winref: null,
    nowinref: false,
    pop: null,
    
    init: function () {
        window.onunload = window.onbeforeunload = function () {
            video.closewin();
        };
        
        $("#video_openwin_go").click(function () {
            video.openwin();
        });
        $("#video_openwin_skip").click(function () {
            video.openwin(true);
        });
        
        $("div.vidbtn").click(function () {
            video.playvid(this.dataset.vidbtn, JSON.parse(this.dataset.formats), this.dataset.control ? JSON.parse(this.dataset.control) : null);
        });
        
        // TODO: Use MediaController to sync videos (once browsers implement it)
        // http://dev.w3.org/html5/spec/media-elements.html#synchronising-multiple-media-elements
        // But how would we do that cross-window? (If we somehow clone a node and add it to another window, would it keep the relationship?)
        // Or, maybe something like this: http://weblog.bocoup.com/html5-video-synchronizing-playback-of-two-videos/
        var seekfunc = function () {
            if (video.winref) {
                var a = video.winref.document.getElementById("main_vid");
                var b = document.getElementById("video_vid");
                a.currentTime = b.currentTime;
            }
        };
        $("#video_vid").on({
            seeking: seekfunc,
            seeked: seekfunc,
            play: function () {
                if (video.winref) {
                    video.winref.document.getElementById("main_vid").play();
                    seekfunc();
                }
            },
            pause: function () {
                if (video.winref) {
                    video.winref.document.getElementById("main_vid").pause();
                    seekfunc();
                }
            }
        });
    },
    
    toggle: function (newbie) {
        $("#ctrl_video > div").hide();
        $(document.getElementById("video_" + newbie)).show();
        this.adjust();
    },
    
    openwin: function (skip) {
        if (skip) {
            this.nowinref = true;
        } else {
            this.winref = window.open("", "", "width=800,height=" + Math.floor(800 * (screen.height / screen.width)) + ",menubar=no,toolbar=no,location=no,personalbar=no,status=no");
            var w = function (t) { video.winref.document.write(t); };
            w('<html>');
            w('<head>');
            w('<title>Video - Haunted House</title>');
            w('<style>');
            w('.btn { cursor: pointer; text-decoration: underline; }');
            w('.btn:hover { text-decoration: none; }');
            w('.all { position: absolute; width: 100%; height: 100%; left: 0; top: 0; }');
            w('</style>');
            w('</head>');
            w('<body style="background-color: black; color: white;">');
            w('<video id="main_vid" class="all" preload="auto"></video>');
            w('<div id="msg_holder" class="all"><table style="width: 100%; height: 100%;"><tr><td>');
            w('<div id="msg" style="text-align: center; background-color: black; opacity: .9;">Drag this window into your second workspace/desktop/etc. and<br><br><span id="goFS" class="btn">go fullscreen</span><br>or<br><span id="skipFS" class="btn">skip fullscreen</span></div>');
            w('</td></tr></table></div>');
            w('</body>');
            w('</html>');
            this.winref.document.close();
            this.winref.onunload = function () {
                if (typeof video != "undefined" && typeof video.closewin == "function") {
                    video.closewin();
                } else if (window.opener && window.opener.video && typeof window.opener.video.closewin == "function") {
                    window.opener.video.closewin();
                }
            };
            this.winref.document.getElementById("skipFS").onclick = function () {
                video.winref.document.getElementById("msg_holder").style.display = "none";
            };
            this.winref.document.getElementById("goFS").onclick = function () {
                var elem = video.winref.document.getElementById("main_vid");
                if (elem.requestFullscreen) {
                    elem.requestFullscreen();
                } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                } else if (elem.webkitRequestFullScreen) {
                    elem.webkitRequestFullScreen();
                } else {
                    video.winref.document.getElementById("msg_holder").style.display = "none";
                    video.winref.alert("ERROR: Your browser doesn't support full-screen mode.\nYou can manually enter full-screen mode by pressing F11 (Windows/Linux) or Cmd-Shift-F (Mac).");
                }
            };
        }
        
        if (this.nowinref || this.winref) {
            this.toggle("playing");
        }
    },
    
    closewin: function () {
        try {
            if (this.winref) this.winref.close();
        } catch (err) {}
        this.winref = null;
        this.stopallvid();
        this.nowinref = false;
        this.toggle("openwin");
    },
    
    stopallvid: function () {
        if (this.pop) Popcorn.destroy(this.pop);
        this.cue();
        $("#video_vid")[0].pause();
        $("#video_vid")[0].src = "";
        $("#video_container").css("visibility", "hidden");
        if (this.winref) {
            this.winref.document.getElementById("main_vid").pause();
            this.winref.document.getElementById("main_vid").src = "";
        }
    },
    
    playvid: function (vid, formats, control) {
        this.stopallvid();
        if (vid && formats && formats.length > 0) {
            var ext = "";
            var maybe = [];
            for (var i = 0; i < formats.length; i++) {
                var canplay = $("#video_vid")[0].canPlayType(formats[i][1]);
                if (canplay == "probably") {
                    ext = formats[i][0];
                    break;
                } else if (canplay == "maybe") {
                    maybe.push(formats[i][0]);
                }
            }
            if (!ext) {
                if (maybe.length > 0) {
                    ext = maybe[0];
                } else {
                    alert("ERROR: This video is in a format not supported by your browser.");
                    this.stopallvid();
                    return;
                }
            }
            
            var url = vid + "." + ext;
            if ($("#video_vid")[0].currentTime) $("#video_vid")[0].currentTime = 0;
            $("#video_vid")[0].src = url;
            $("#video_vid")[0].load();
            
            if (this.winref) {
                // More details for video syncing are in video.init()
                if (this.winref.document.getElementById("main_vid").currentTime) this.winref.document.getElementById("main_vid").currentTime = 0;
                this.winref.document.getElementById("main_vid").src = url;
                this.winref.document.getElementById("main_vid").load();
                setTimeout(function loopsieloopsieloo() {
                    if (video.winref.document.getElementById("main_vid").readyState) {
                        video.winref.document.getElementById("main_vid").muted = true;
                    } else {
                        setTimeout(loopsieloopsieloo, 200);
                    }
                }, 200);
            }
            
            if (control && control.length) {
                this.pop = Popcorn("#video_vid");
                for (var j = 0; j < control.length; j++) {
                    this.addControl(control[j]);
                }
            }
            
            $("#video_container").css("visibility", "visible");
        }
    },
    
    addControl: function (control) {
        var time = control.time;
        if (time) time = Popcorn.util.toSeconds(time);
        
        this.pop.cue(time, function (options) {
            switch (control.command) {
                case "pause":
                    $("#video_vid")[0].pause();
                    break;
                case "cue":
                    // TODO: Move to subtitle file (separate from this system)
                    // http://www.html5rocks.com/en/tutorials/track/basics/ (not yet implemented by most browsers)
                    video.cue(control.data);
                    break;
                case "effect":
                    if (control.data.preset) {
                        effects.sendpreset(control.data.channel || "0", control.data.preset);
                    } else if (control.data.channel && control.data.state) {
                        effects.sendtoggle(control.data.channel, control.data.state);
                    } else if (control.data.channel && control.data.dimness) {
                        effects.sendpattern(control.data.channel, control.data.dimness, control.data.time);
                    } else if (control.data.light || control.data.sound) {
                        effects.sendpattern(control.data.channel || "0", control.data.light, control.data.sound);
                    }
                    break;
                case "next":
                    effects.next();
                    break;
                case "stop":
                    effects.stop();
                    break;
            }
        });
    },
    
    adjust: function () {
        // Adjust width/height of preview
        $("#video_vid").css("height", "1px").css("width", "1px");
        $("#video_selection").css("height", "1px");
        var h = $("#video_container").height();
        var ratio = screen.width / screen.height;
        var width = Math.floor(h * ratio);
        var height = Math.floor(h);
        $("#video_vid").css("height", height + "px").css("width", width + "px");
        $("#video_selection").css("height", height + "px");
        $("#video_container").css("width", width + "px");
    },
    
    cue: function (text) {
        if (!text) {
            $("#visual_cue").text("");
        } else {
            $("#visual_cue").css("font-size", "");
            $("#visual_cue").text(text);
            
            // Make as big as possible
            var vp = $("#video_playing")[0];
            var cur = 10;
            while (cur < 100 && vp.scrollHeight <= vp.clientHeight && vp.scrollWidth <= vp.clientWidth) {
                cur += 2;
                $("#visual_cue").css("font-size", cur + "pt");
            }
            cur -= 2;
            $("#visual_cue").css("font-size", cur + "pt");
        }
    }
};


var effects = {
    oncustom: {timed: false, dimmed: false},
    transitioning: false,
    channel: "0",
    details: {type: "timed"},
    
    
    init: function () {
        $("#effects_next").click(function () {
            effects.next();
        });
        $("#effects_stop").click(function () {
            effects.stop();
        });
        
        $("li.effects_tocustom").click(function () {
            $("#effects_" + effects.details.type + "panel").addClass("flip");
            effects.oncustom[effects.details.type] = true;
        });
        $("li.effects_topreset").click(function () {
            $("#effects_" + effects.details.type + "panel").removeClass("flip");
            effects.oncustom[effects.details.type] = false;
        });
        
        $("#effects_custom_dimness").change(function () {
            $("#effects_custom_dimness_label").text($(this).val());
        });
        
        $("span.effects_preset_customize").click(function () {
            var values = settings.presets[$("#effects_preset_" + effects.details.type).val()];
            if (effects.details.type == "dimmed") {
                $("#effects_custom_dimness").val(values.dimness).change();
                $("#effects_custom_time").val(values.time || 0);
            } else {
                $("#effects_custom_light").val(values.light || "");
                $("#effects_custom_sound").val(values.sound || "");
            }
            $("li.effects_tocustom").click();
        });
        
        $("#effects_toggledpanel_on").click(function () {
            effects.sendtoggle(effects.channel, 1);
        });
        $("#effects_toggledpanel_off").click(function () {
            effects.sendtoggle(effects.channel, 0);
        });
        $("#effects_toggledpanel_toggle").click(function () {
            effects.sendtoggle(effects.channel, -1);
        });
        
        $(document).on("change", "input[name=effects_channel]", function (event) {
            effects.update_channel_details();
        });
        
        // Load settings
        this.update_channels();
        this.update_keyboard();
        this.update_presets();
        
        $("#effects_form").submit(function (event) {
            event.preventDefault();
            // toggled channels not worked with here
            if (effects.details.type != "toggled") {
                if (!effects.oncustom[effects.details.type]) {
                    effects.sendpreset(effects.channel, $("#effects_preset_" + effects.details.type).val());
                } else {
                    if (effects.details.type == "dimmed") {
                        var dimness = parseInt($("#effects_custom_dimness").val(), 10);
                        var time = parseInt($("#effects_custom_time").val(), 10);
                        if (isNaN(dimness)) {
                            alert("ERROR: Invalid dim level!");
                            return;
                        } else if (isNaN(time)) {
                            alert("ERROR: Invalid time!");
                            return;
                        } else {
                            effects.sendpattern(effects.channel, dimness, time);
                        }
                    } else {
                        var light = $.trim($("#effects_custom_light").val());
                        var sound = $("#effects_custom_sound").val();
                        if (light.lastIndexOf(",") == light.length - 1) light = light.slice(0, -1);
                        try {
                            light = JSON.parse("[" + light + "]");
                        } catch (err) {
                            alert("ERROR: Invalid lighting pattern!\nDetails: " + err);
                            return;
                        }
                        effects.sendpattern(effects.channel, light, sound || null);
                    }
                }
            }
        });
    },
    
    toggle: function (controls) {
        if (controls) {
            $("#effects_waiting").hide();
            $("#effects_controls").show();
            $("#ctrl_effects footer.buttonbox button").attr("disabled", false);
        } else {
            $("#effects_controls").hide();
            $("#effects_waiting").show();
            $("#ctrl_effects footer.buttonbox button").attr("disabled", true);
        }
    },
    
    update_channel_details: function () {
        var $selected = $("input[name=effects_channel]:checked", "#effects_form");
        this.channel = $selected.val();
        this.details = settings.channels[this.channel] || {type: "timed"};
        if (!this.details.type) this.details.type = "timed";
        $("div.effects_panel").hide();
        $("#effects_" + this.details.type + "panel").show();
        $("#effects_gocontainer")[this.details.type == "toggled" ? "hide" : "show"]();
    },
    
    update_channels: function () {
        var selected_channel = $("input[name=effects_channel]:checked", "#effects_form").val() || "0";
        
        $("#effects_channels").html('<input type="radio" id="effects_channels_radio0" name="effects_channel" value="0" checked>&nbsp;<label for="effects_channels_radio0">Default Channel</label>');
        var counter = 1;
        for (var channel in settings.channels) {
            if (settings.channels.hasOwnProperty(channel)) {
                counter++;
                var details = settings.channels[channel];
                var css = "", type = "timed";
                if (details.type && details.type == "toggled") {
                    type = "toggled";
                    css = "color: red;";
                } else if (details.type && details.type == "dimmed") {
                    type = "dimmed";
                    css = "color: blue;";
                }
                $("#effects_channels").append('<br><input type="radio" id="effects_channels_radio' + counter + '" name="effects_channel" value="' + escHTML(channel) + '">&nbsp;<label for="effects_channels_radio' + counter + '" title="' + escHTML(details.description || channel) + '" style="' + escHTML(css) + '">' + escHTML(channel) + '</label>');
            }
        }
        
        // Re-select previously selected channel
        $("input[name=effects-channel]", "#effects_form").each(function () {
            if (this.value == selected_channel) this.select();
        });
    },
    
    update_keyboard: function () {
        // TODO
    },
    
    update_presets: function () {
        $("#effects_preset").html("");
        for (var preset in settings.presets) {
            if (settings.presets.hasOwnProperty(preset)) {
                var option = document.createElement("option");
                option.value = preset;
                option.appendChild(document.createTextNode(preset));
                $("#effects_preset_" + (typeof settings.presets[preset].dimness != "undefined" ? "dimmed" : "timed")).append(option);
            }
        }
    },
    
    next: function () {
        conn.sendmsg({
            about: "effects_cmd",
            data: {
                command: "next"
            }
        });
    },
    
    stop: function () {
        conn.sendmsg({
            about: "effects_cmd",
            data: {
                command: "stop"
            }
        });
    },
    
    sendtoggle: function (channel, state) {
        conn.sendmsg({
            about: "effects_cmd",
            data: {
                command: "play",
                prop: {
                    channel: channel,
                    state: state
                }
            }
        });
    },
    
    sendpreset: function (channel, id) {
        var details = settings.channels[channel];
        if (settings.presets[id]) {
            var preset = settings.presets[id];
            this.sendpattern(channel, details.type == "dimmed" ? preset.dimness : preset.light, details.type == "dimmed" ? preset.time : preset.sound);
        } else {
            alert("ERROR: Invalid preset: " + id);
        }
    },
    
    sendpattern: function (channel, light_or_dimness, sound_or_time) {
        var details = settings.channels[channel];
        var prop = {channel: channel};
        if (details.type == "dimmed") {
            prop.dimness = light_or_dimness;
            prop.time = sound_or_time;
        } else {
            prop.light = light_or_dimness;
            prop.sound = sound_or_time;
        }
        conn.sendmsg({
            about: "effects_cmd",
            data: {
                command: "play",
                prop: prop
            }
        });
        
        // Flash background
        if (!this.transitioning) {
            this.transitioning = true;
            $("#ctrl_effects").css("background-image", "none").addClass("flash");
            setTimeout(function () {
                $("#ctrl_effects").removeClass("flash");
                setTimeout(function () {
                    $("#ctrl_effects").css("background-image", "");
                    effects.transitioning = false;
                }, 200 + 5);
            }, 200 + 100);
        }
    }
};


var conn = {
    socket: null,
    
    init: function () {
        /*
        $("#conn_cancel").click(function () {
            conn.socket.disconnect();
            if (!(conn.socket && (conn.socket.connected || conn.socket.connecting || conn.socket.open || conn.socket.reconnecting))) {
                $("#conn_cancel").hide();
                setTimeout(function () {
                    $("#conn_cancel").hide();
                    $("html, body").css("overflow", "hidden");
                    $("section.top").animate({height: "100%"});
                    $("section.bottom").animate({height: 0}, function () {
                        $("section.bottom").hide();
                        $("html, body").css("overflow", "");
                        video.adjust();
                    });
                }, 1000);
            }
        });
        */
        
        $(document).on("click", "span.clientitem", function () {
            alert("More info on: " + $(this).text());
        });
        
        this.socket = io.connect();
        
        this.socket.on("connecting", function () {
            conn.showmsg("Connecting to server...");
        });
        this.socket.on("connect", function () {
            conn.showmsg("Connected to server");
            effects.toggle(true);
            // In case this gets shown again (if there's an error, disconnect, etc.)
            $("#effects_statuser").text("Server connection necessary");
        });
        this.socket.on("connect_failed", function () {
            conn.showmsg("Failed to establish connection to server");
            effects.toggle();
        });
        
        this.socket.on("message", function (msg) {
            try {
                var data = JSON.parse(msg);
                if (data && data.about) {
                    switch (data.about) {
                        case "clientlist":
                            conn.showlist(data.data);
                            break;
                        case "settings":
                            settings[data.data.setting] = data.data.settings;
                            if (effects["update_" + data.data.setting]) effects["update_" + data.data.setting]();
                            break;
                        default:
                            conn.showmsg("ERROR: Invalid message received from server:\n" + msg);
                    }
                } else {
                    conn.showmsg("ERROR: Invalid data received from server:\n" + msg);
                }
            } catch (err) {
                conn.showmsg("ERROR: Invalid JSON received from server:\n" + msg);
            }
        });
        
        this.socket.on("disconnect", function () {
            conn.showmsg("Disconnected from server");
            effects.toggle();
        });
        conn.socket.on("error", function () {
            conn.showmsg("Error connecting to server");
            effects.toggle();
        });
        conn.socket.on("reconnect", function () {
            conn.showmsg("Reconnected to server");
            effects.toggle(true);
        });
        conn.socket.on("reconnecting", function () {
            conn.showmsg("Reconnecting to server...");
            effects.toggle();
        });
        conn.socket.on("reconnect_failed", function () {
            conn.showmsg("Failed to reconnect to server");
            effects.toggle();
        });
    },
    
    sendmsg: function (jsonmsg) {
        var msg = JSON.stringify(jsonmsg);
        if (this.socket && this.socket.send) {
            this.socket.send(msg);
        }
    },
    
    showmsg: function (msg) {
        $("#client_title").text("Server Connection");
        $("#client_list").html(escHTML(msg).replace(/\n/g, "<br>"));
        
        resizer();
    },
    
    showlist: function (list) {
        $("#client_title > span").text("Connected Clients");
        if (list.length > 0) {
            $("#client_list").html(list.map(function (elem) {
                return '<span class="clientitem lilbutton" style="white-space: nowrap;" title="' + escHTML(elem.location) + '" data-json="' + escHTML(JSON.stringify(elem)) + '">' + escHTML(elem.name) + '</span>';
            }).join(", "));
        } else {
            var addr = window.location.protocol + "//" + window.location.hostname;
            if (window.location.port) addr += ":" + window.location.port;
            $("#client_list").html('No clients connected!<br><br>Direct your clients to ' + escHTML(addr) + '<br>and click "client"');
        }
        
        resizer();
    }
};