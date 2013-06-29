var MEDIA_KEY_CODE_MAP = {
    173: "mute",
    174: "vol down",
    175: "vol up",
    178: "stop",
    179: "play/pause"
};

var video = {
    winref: null,
    nowinref: false,
    adjusting_seek: false,
    vid: null,
    pop: null,
    RESIZE_VIDEO_TO_SCREEN_DIMENSIONS: false,
    
    init: function () {
        var testelem = document.createElement("video");
        if (typeof testelem.canPlayType != "function") {
            $("#video_openwin").html("<div>ERROR: Your browser does not support some of the HTML5 and JavaScript features required by the video player.</div><div>Please upgrade to a more modern browser to use the video player.</div>");
        } else {
            this.vid = document.getElementById("video_vid");
            
            $(window).on("unload beforeunload", function () {
                video.closewin();
            });
            
            $("#video_openwin_go").click(function () {
                video.openwin();
            });
            $("#video_openwin_skip").click(function () {
                video.openwin(true);
            });
            
            $("button.vidbtn").click(function () {
                video.playVideo($(this).attr("data-vidbtn"),
                                $.parseJSON($(this).attr("data-formats")),
                                $(this).attr("data-control") ? $.parseJSON($(this).attr("data-control")) : null,
                                $(this).attr("data-track") || null);
            });
            
            $("#video_selection_back > button").click(function () {
                video.toggle("playing");
            });
            $("#video_playing_back > button").click(function () {
                video.toggle("selection");
            });
            
            $("#visual_cue_container").click(function (event) {
                var $vcc = $(this);
                if ($vcc.data("shortened")) {
                    $vcc.data("shortened", false);
                    $vcc.css("margin-bottom", "0px");
                    $vcc.css("height", "auto");
                } else {
                    $vcc.data("shortened", true);
                    $vcc.css("margin-bottom", Math.max(0, $vcc.outerHeight() - (event.pageY - 51)) + "px");
                    $vcc.css("height", Math.max(10, event.pageY - 51) + "px");
                }
            });
            
            // TODO: Use MediaController to sync videos (once browsers implement it)
            // http://dev.w3.org/html5/spec/media-elements.html#synchronising-multiple-media-elements
            // But how would we do that cross-window? (If we somehow clone a node and add it to another window, would it keep the relationship?)
            // Or, maybe something like this: http://weblog.bocoup.com/html5-video-synchronizing-playback-of-two-videos/
            var seekfunc = function () {
                if (video.winref) {
                    var a = video.winref.document.getElementById("main_vid");
                    var b = video.vid;
                    a.currentTime = b.currentTime;
                }
            };
            var adjustfunc = function () {
                video.adjust();
            };
            $(this.vid).on({
                loadedmetadata: adjustfunc,
                loadeddata: adjustfunc,
                seeking: seekfunc,
                seeked: seekfunc,
                play: function () {
                    if (video.winref) {
                        if (video.adjusting_seek) {
                            video.adjusting_seek = false;
                        } else {
                            // TODO: Does this whole thingie actually help?
                            video.adjusting_seek = true;
                            var a = video.winref.document.getElementById("main_vid");
                            var b = video.vid;
                            a.pause();
                            b.pause();
                            seekfunc();
                            a.play();
                            b.play();
                        }
                    }
                },
                pause: function () {
                    if (video.winref && !video.adjusting_seek) {
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
            w('<title>Video - HHLS</title>');
            w('<style>');
            w('.btn { cursor: pointer; text-decoration: underline; }');
            w('.btn:hover { text-decoration: none; }');
            w('.all { position: absolute; width: 100%; height: 100%; left: 0; top: 0; }');
            w('</style>');
            w('</head>');
            w('<body style="background-color: black; color: white;">');
            w('<video id="main_vid" class="all" preload="auto"></video>');
            w('<div id="msg_holder" class="all"><table style="width: 100%; height: 100%;"><tr><td>');
            w('<div id="msg" style="text-align: center; background-color: black; opacity: .9; line-height: 150%;">Drag this window into your second workspace/desktop/etc. and go fullscreen:<br><i>Command-Shift-F</i> or <i>F11</i><br>(or <span id="goFS" class="btn">click here</span> if that doesn\'t work)<br><br><span id="skipFS" class="btn">Continue</span></div>');
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
        this.stopVideo();
        this.nowinref = false;
        this.toggle("openwin");
    },
    
    stopVideo: function () {
        if (this.pop) Popcorn.destroy(this.pop);
        this.clearcue();
        this.vid.pause();
        this.vid.src = "";
        this.clearTracks();
        if (this.winref) {
            this.winref.document.getElementById("main_vid").pause();
            this.winref.document.getElementById("main_vid").src = "";
        }
        $("#video_selection_back").hide();
        this.toggle("selection");
    },
    
    clearTracks: function () {
        $("#video_vid track").remove();
        var tracks = this.vid.textTracks;
        if (tracks) {
            for (var i = 0; i < tracks.length; i++) {
                for (var j = 0; k < tracks[i].cues.length; j++) {
                    tracks[i].removeCue(tracks[i].cues[j]);
                }
            }
        }
    },
    
    playVideo: function (vid, formats, control, track) {
        //this.stopVideo();
        if (vid && formats && formats.length > 0) {
            var ext = "";
            var maybe = [];
            for (var i = 0; i < formats.length; i++) {
                var canplay = this.vid.canPlayType(formats[i][1]);
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
                    alert("ERROR: This video is not available in a format supported by your browser.");
                    this.stopVideo();
                    return;
                }
            }
            
            var url = vid + "." + ext;
            this.clearTracks();
            if (this.vid.currentTime) this.vid.currentTime = 0;
            this.vid.src = url;
            this.vid.load();
            
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
            
            // <track> stuff: http://www.html5rocks.com/en/tutorials/track/basics/
            
            if (track) {
                var trackElem = document.createElement("track");
                trackElem.kind = "subtitles";
                trackElem["default"] = true;
                trackElem.src = vid + "." + track;
                trackElem.addEventListener("load", function () {
                    // Use our own system of showing cues
                    trackElem.kind = "metadata";
                    var flashfunc = function () {
                        flash("#ctrl_video");
                    };
                    for (var i = 0; i < trackElem.track.cues.length; i++) {
                        trackElem.track.cues[i].onenter = flashfunc;
                    }
                    trackElem.track.addEventListener("cuechange", function () {
                        var cues = [];
                        for (var i = 0; i < trackElem.track.activeCues.length; i++) {
                            cues.push(trackElem.track.activeCues[i].text);
                        }
                        video.cue(cues);
                    }, false);
                }, false);
                $(this.vid).append(trackElem);
            }
            
            if (control && control.length) {
                // TODO: Instead of Popcorn, just use TextTracks
                // (supported in Chrome dev)
                /*
                var controlTrack = this.vid.addTextTrack("metadata");
                for (var j = 0; j < control.length; j++) {
                    controlTrack.addCue(this.addControl(control[j]));
                }
                */
                
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
        /*
        var cue = new TextTrackCue("", control.time - 0.1, control.time, "");
        if (control.command == "pause") {
            cue.pauseOnExit = true;
        } else {
            cue.onexit = function () {
                // This will only be fired if playback goes thru control.time
                // (not if we're seeking and we pass over it)
                controlcmd(control);
            };
        }
        return cue;
        */
        
        var time = control.time;
        if (time) time = Popcorn.util.toSeconds(time);
        this.pop.cue(time, function (options) {
            controlcmd(control);
        });
    },
    
    runcmd: function (cmd) {
        switch ((cmd + "").toLowerCase()) {
            case "play":
            case "pause":
            case "play/pause":
                this.vid[this.vid.paused ? "play" : "pause"]();
                break;
            case "stop":
                this.stopVideo();
                break;
            case "vol up":
            case "volume up":
                this.vid.volume += 0.1;
                break;
            case "vol down":
            case "volume down":
                this.vid.volume -= 0.1;
                break;
            case "mute":
            case "unmute":
            case "mute/unmute":
                this.vid.muted = !this.vid.muted;
                break;
        }
    },
    
    adjust: function () {
        if (!$("#ctrl_video").is(".minimized") && $("#video_playing").css("display") != "none") {
            // Adjust width/height of video preview
            $(this.vid).css("width", "1px").css("height", "1px");
            
            var maxwidth = $("#ctrl_video").width();
            var maxheight = $("#ctrl_video").height();
            
            var ratio;
            if (this.RESIZE_VIDEO_TO_SCREEN_DIMENSIONS) {
                ratio = screen.width / screen.height;
            } else if (this.vid.videoWidth && this.vid.videoHeight) {
                ratio = this.vid.videoWidth / this.vid.videoHeight;
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
                width = maxwidth;
                height = maxheight;
            }
            $(this.vid).css("width", width + "px").css("height", height + "px");
        }
    },
    
    clearcue: function (animate) {
        if (animate) {
            $(".visual_cue").slideUp(function () {
                $(this).remove();
            });
            $("#visual_cue_container").fadeOut();
        } else {
            $(".visual_cue").remove();
            $("#visual_cue_container").hide();
        }
    },
    
    cue: function (cues) {
        var $container = $("#visual_cue_container");
        if (cues.length == 0) {
            if ($container.is(":visible")) {
                this.clearcue(true);
            } else {
                this.clearcue();
            }
        } else {
            var new_cue_map = {};
            for (var i = 0; i < cues.length; i++) {
                new_cue_map[cues[i]] = true;
            }
            $(".visual_cue").each(function () {
                if (new_cue_map.hasOwnProperty($(this).data("cue"))) {
                    new_cue_map[$(this).data("cue")] = false;
                } else {
                    $(this).slideUp(function () {
                        $(this).remove();
                    });
                }
            });
            if (!$container.is(":visible")) {
                $container.fadeIn();
            }
            for (var cue in new_cue_map) {
                if (new_cue_map.hasOwnProperty(cue) && new_cue_map[cue]) {
                    var $cue = $("<div />");
                    $cue.addClass("visual_cue");
                    $cue.css("display", "none");
                    $cue.data("cue", cue);
                    $cue.text(cue);
                    $("#visual_cue_td").append($cue);
                    $cue.slideDown();
                }
            }
        }
    }
};

init.push(function () {
    video.init();
});