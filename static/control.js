function escHTML(html) {
    // NOTE: Also in myutil.js and clientframe2.js
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function resizer(use_animate) {
    $("section").not("minimized").children("header").each(function () {
        $(this).parent().css("padding-top", Math.round($(this).outerHeight()) + "px");
    });
    $("section").not("minimized").children("footer").each(function () {
        var extra = $(this).parent().is(".top") ? 20 : 0;
        $(this).parent().css("padding-bottom", Math.round($(this).outerHeight() + extra) + "px");
    });
    
    var height = $("#dummy").outerHeight(true) - $("section.bottom").outerHeight(true);
    $("section.top").not(".minimized").each(function () {
        var diff = $(this).outerHeight(true) - $(this).height();
        var newheight = Math.floor(height - diff) + "px";
        if (use_animate) {
            $(this).animate({height: newheight}, function () {
                video.adjust();
            });
        } else {
            $(this).css("height", newheight);
        }
    });
    
    video.adjust();
}

var minimized_items = [];

$(function () {
    $("section").show();
    
    var test_buttons = function () {
        // Disable tray buttons if 2 things are already opened
        $("#minimized_tray button").attr("disabled", $("section.top").not(".minimized").length > 1);
    };
    
    $("section.top > header").css("cursor", "pointer").click(function (event) {
        var $section = $(this).parent();
        
        if (!$section.hasClass("minimized")) {
            $section.addClass("minimized");
            var section_id = minimized_items.length;
            minimized_items[section_id] = $section[0];
            
            var donefunc = function () {
                $section.css({
                    display: "none",
                    height: "",
                    overflow: ""
                }).removeClass("left").removeClass("right");
                
                // Make icon for tray
                var $button = $("<button />");
                $button.addClass("minimized_item");
                $button.attr("data-section", section_id.toString());
                $button.text($section.children("header").children("h1").text());
                $("#minimized_tray").append($button);
                
                test_buttons();
                
                // Resize other opened section (if applicable)
                if ($("section.top").not(".minimized").length == 1) {
                    var $sect = $("section.top").not(".minimized");
                    var props = {};
                    if ($sect.is(".left")) props.right = "0%";
                    if ($sect.is(".right")) props.left = "0%";
                    $sect.animate(props, function () {
                        $sect.removeClass("left").removeClass("right").css({
                            left: "",
                            right: ""
                        });
                        resizer();
                    });
                }
            };
            if ($section.hasClass("minimized_on_start")) {
                $section.removeClass("minimized_on_start");
                donefunc();
            } else {
                $section.css("overflow", "hidden");
                $section.animate({height: "0px"}, donefunc);
            }
        }
    });
    
    $("section.minimized").removeClass("minimized").addClass("minimized_on_start").children("header").click();
    
    $(document).on("click", "button.minimized_item", function (event) {
        var section_id = Number($(this).attr("data-section"));
        if (minimized_items[section_id]) {
            var $section = $(minimized_items[section_id]);
            minimized_items[section_id] = null;
            
            $(this).animate({width: 0}, function () {
                $(this).remove();
            });
            
            var donefunc = function () {
                $section.removeClass("minimized").css("height", "0px").css("display", "");
                test_buttons();
                resizer(true);
            };
            
            if ($("section.top").not(".minimized").length == 0) {
                donefunc();
            } else {
                $("section.top").not(".minimized").animate({right: "50%"}, function () {
                    $("section.top").not(".minimized").addClass("left").css("right", "");
                    $section.addClass("right");
                    donefunc();
                });
            }
        }
    });
    
    video.init();
    effects.init();
    conn.init();
    resizer();
});

$(window).resize(function () {
    resizer();
});

var video = {
    winref: null,
    nowinref: false,
    pop: null,
    RESIZE_VIDEO_TO_SCREEN: false,
    
    init: function () {
        var testelem = document.createElement("video");
        if (typeof testelem.canPlayType != "function" || !testelem.dataset) {
            $("#video_openwin").html("<div>ERROR: Your browser does not support some of the HTML5 and JavaScript features required by the video player.</div><div>Please upgrade to a more modern browser to use the video player.</div>");
        } else {
            window.onunload = window.onbeforeunload = function () {
                video.closewin();
            };
            
            $("#video_openwin_go").click(function () {
                video.openwin();
            });
            $("#video_openwin_skip").click(function () {
                video.openwin(true);
            });
            
            $("button.vidbtn").click(function () {
                video.playvid(this.dataset.vidbtn, $.parseJSON(this.dataset.formats), this.dataset.control ? $.parseJSON(this.dataset.control) : null);
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
        }
    },
    
    toggle: function (newbie) {
        // TODO: Do pretty "sliding" effect
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
            this.toggle("selection");
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
        if (this.winref) {
            this.winref.document.getElementById("main_vid").pause();
            this.winref.document.getElementById("main_vid").src = "";
        }
        this.toggle("selection");
    },
    
    playvid: function (vid, formats, control) {
        this.stopallvid();
            console.log(arguments);
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
            
            this.toggle("playing");
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
        if (!$("#ctrl_video").is(".minimized") && $("#video_playing").css("display") != "none") {
            // Adjust width/height of video preview
            $("#video_vid").css("width", "1px").css("height", "1px");
            
            var maxwidth = $("#ctrl_video").width();
            var maxheight = $("#ctrl_video").height();
            
            var width, height;
            var ratio;
            if (this.RESIZE_VIDEO_TO_SCREEN) {
                ratio = screen.width / screen.height;
            } else if ($("#video_vid")[0].videoWidth && $("#video_vid")[0].videoHeight) {
                ratio = $("#video_vid")[0].videoWidth / $("#video_vid")[0].videoHeight;
            }
            if (ratio) {
                var mywidth = Math.floor(maxheight * ratio);
                var myheight = Math.floor(maxwidth / ratio);
                if (myheight < maxheight) {
                    width = maxwidth;
                    height = myheight;
                } else {
                    width = mywidth;
                    height = maxheight;
                }
            } else {
                width = maxwidth;
                height = maxheight;
            }
            $("#video_vid").css("width", width + "px").css("height", height + "px");
        }
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
        $("#effects_next").click(function (event) {
            event.preventDefault();
            effects.next(effects.channel);
        });
        $("#effects_stop").click(function (event) {
            event.preventDefault();
            effects.stop(effects.channel);
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
                        var dimness = Number($("#effects_custom_dimness").val());
                        var time = Number($("#effects_custom_time").val() || 0);
                        if (isNaN(dimness) || dimness > 100 || dimness < 0) {
                            alert("ERROR: Invalid dim level!");
                            return;
                        } else if (isNaN(time) || time < 0) {
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
                            light = $.parseJSON("[" + light + "]");
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
        $("#effects_gocontainer, #effects_nextstopcontainer")[this.details.type == "toggled" ? "hide" : "show"]();
    },
    
    update_channels: function () {
        var selected_channel = $("input[name=effects_channel]:checked", "#effects_form").val() || "0";
        
        var html = '<table><tbody><tr><td><input type="radio" id="effects_channels_radio0" name="effects_channel" value="0" checked></td><td><label for="effects_channels_radio0">Default Channel</label></td></tr>';
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
                html += '<tr><td valign="top"><input type="radio" id="effects_channels_radio' + counter + '" name="effects_channel" value="' + escHTML(channel) + '"></td><td><label for="effects_channels_radio' + counter + '" title="' + escHTML(details.description || channel) + '" style="' + escHTML(css) + '">' + escHTML(channel).replace(/_/g, "_<wbr>") + '</label></td></tr>';
            }
        }
        
        html += '</tbody></table>';
        $("#effects_channels").html(html);
        
        // Re-select previously selected channel
        $("input[name=effects_channel]", "#effects_form").each(function () {
            if (this.value == selected_channel) this.checked = true;
        });
        this.update_channel_details();
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
    
    next: function (channel) {
        conn.sendmsg({
            about: "effects_cmd",
            data: {
                command: "next",
                channel: typeof channel == "undefined" ? null : channel
            }
        });
    },
    
    stop: function (channel) {
        conn.sendmsg({
            about: "effects_cmd",
            data: {
                command: "stop",
                channel: typeof channel == "undefined" ? null : channel
            }
        });
    },
    
    sendtoggle: function (channel, state) {
        conn.sendmsg({
            about: "effects_cmd",
            data: {
                command: "play",
                channel: typeof channel == "undefined" ? null : channel,
                prop: {
                    state: state
                }
            }
        });
    },
    
    sendpreset: function (channel, id) {
        var details = settings.channels[channel];
        if (settings.presets[id]) {
            var preset = settings.presets[id];
            var dimmed = !!(details && details.type && details.type == "dimmed");
            this.sendpattern(channel, dimmed ? preset.dimness : preset.light, dimmed ? preset.time : preset.sound);
        } else {
            alert("ERROR: Invalid preset: " + id);
        }
    },
    
    sendpattern: function (channel, light_or_dimness, sound_or_time) {
        var details = settings.channels[channel];
        var prop = {};
        if (details && details.type && details.type == "dimmed") {
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
                channel: typeof channel == "undefined" ? null : channel,
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
        if (typeof JSON == "undefined" || typeof JSON.parse != "function" || typeof Array.prototype.map != "function") {
            this.showmsg("ERROR: Your browser does not support some of the JavaScript features required by this page.\nPlease upgrade to a more modern browser.");
        } else {
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
                    var data = $.parseJSON(msg);
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
        }
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