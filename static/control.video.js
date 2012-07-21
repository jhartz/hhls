var video = {
    winref: null,
    nowinref: false,
    pop: null,
    RESIZE_VIDEO_TO_SCREEN_DIMENSIONS: false,
    
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
            
            $("#video_selection_back > button").click(function () {
                video.toggle("playing");
            });
            $("#video_playing_back > button").click(function () {
                video.toggle("selection");
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
            var adjustfunc = function () {
                video.adjust();
            };
            $("#video_vid").on({
                loadedmetadata: adjustfunc,
                loadeddata: adjustfunc,
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
        toggle($("#ctrl_video")[0], document.getElementById("video_" + newbie), function () {
            video.adjust();
        });
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
        $("#video_selection_back").hide();
        this.toggle("selection");
    },
    
    playvid: function (vid, formats, control) {
        //this.stopallvid();
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
            
            $("#video_selection_back").show();
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
            console.log("ADJUSTING");
            // Adjust width/height of video preview
            $("#video_vid").css("width", "1px").css("height", "1px");
            
            var maxwidth = $("#ctrl_video").width();
            var maxheight = $("#ctrl_video").height();
            
            var ratio;
            if (this.RESIZE_VIDEO_TO_SCREEN_DIMENSIONS) {
                ratio = screen.width / screen.height;
            } else if ($("#video_vid")[0].videoWidth && $("#video_vid")[0].videoHeight) {
                ratio = $("#video_vid")[0].videoWidth / $("#video_vid")[0].videoHeight;
                console.log("Adjusting to video... ratio: " + ratio);
            }
            var width, height;
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
                console.log("no ratio");
                width = maxwidth;
                height = maxheight;
            }
            console.log("resizing to: " + width + " x " + height);
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

init.push(function () {
    video.init();
});