// Pushed to by section scripts
var init = [];
var onConnection = [];
var onNoConnection = [];
var settings_onupdate = {
    channels: [],
    keyboard: [],
    presets: [],
    sequences: []
};
var blockers = {};

var minimized_items = [];

$(function () {
    $("section").show();
    
    var test_buttons = function () {
        // Disable tray buttons if 2 things are already opened
        $("#minimized_tray button").attr("disabled", $("section.top").not(".minimized").length > 1);
        
        // Hide tray if there are no buttons; show it if there are
        if ($("section.top.minimized").length == 0) {
            $("#minimized_tray").parent().hide().parent().css("padding-bottom", "");
        } else {
            $("#minimized_tray").parent().show();
            resizer();
        }
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
                $button.attr("type", "button");
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
    
    if ($("section.minimized").length) {
        $("section.minimized").removeClass("minimized").addClass("minimized_on_start").children("header").click();
    } else {
        test_buttons();
    }
    
    $(document).on("click", "button.minimized_item", function (event) {
        var section_id = Number($(this).attr("data-section"));
        if (minimized_items[section_id]) {
            var $section = $(minimized_items[section_id]);
            minimized_items[section_id] = null;
            $section.data("loading", true);
            
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
    
    for (var i = 0; i < init.length; i++) {
        if (typeof init[i] == "function") {
            init[i]();
        }
    }
    
    resizer();
});

$(window).resize(function () {
    resizer();
});

$(window).on("beforeunload", function (event) {
    for (var blocker in blockers) {
        if (blockers.hasOwnProperty(blocker)) {
            if (blockers[blocker]) {
                if (/Firefox[\/\s](\d+)/.test(navigator.userAgent) && Number(RegExp.$1) >= 4) {
                    alert(blockers[blocker]);
                }
                return blockers[blocker];
            }
        }
    }
});

function resizer(use_animate) {
    $("section").not("minimized").children("footer:visible").each(function () {
        $(this).parent().css("padding-bottom", Math.round($(this).outerHeight()) + "px");
    });
    
    var height = $("#dummy").outerHeight(true) - $("section.bottom").outerHeight(true);
    $("section.top").not(".minimized").each(function () {
        $(this).find(".topbtn, .attop").css("top", $(this).css("padding-top"));
        
        var loading = $(this).data("loading");
        if (!loading || use_animate) {
            var diff = $(this).outerHeight(true) - $(this).height();
            var newheight = Math.floor(height - diff) + "px";
            if (use_animate) {
                $(this).animate({height: newheight}, function () {
                    $(this).data("loading", false);
                    resizer();
                });
            } else {
                $(this).css("height", newheight);
            }
        }
    });
    
    if (typeof video != "undefined") video.adjust();
}

function toggle(section, newelem, oncomplete) {
    var $section = $(section);
    var $oldelem = $section.children("div:visible");
    var $newelem = $(newelem);
    
    if ($oldelem.attr("data-level") && !isNaN(parseInt($oldelem.attr("data-level"), 10)) &&
        $newelem.attr("data-level") && !isNaN(parseInt($newelem.attr("data-level"), 10))) {
        var oldlevel = parseInt($oldelem.attr("data-level"), 10);
        var newlevel = parseInt($newelem.attr("data-level"), 10);
        var width = $section.width() - 21;
        if (newlevel > oldlevel) {
            // slide $newelem on top of $oldelem
            $section.css("overflow", "hidden");
            $newelem.css({
                position: "absolute",
                left: width + "px",
                top: $section.css("padding-top"),
                width: width + "px",
                height: "100%",
                background: "inherit",
                "box-shadow": "-4px 0 2px #ccc",
                opacity: 0.1,
                "z-index": "999"
            }).show();
            $newelem.animate({left: 0, opacity: 1}, function () {
                $oldelem.hide();
                $newelem.css({
                    position: "",
                    left: "",
                    top: "",
                    width: "",
                    height: "",
                    background: "",
                    "box-shadow": "",
                    opacity: "",
                    "z-index": ""
                });
                $section.css("overflow", "");
                if (typeof oncomplete == "function") oncomplete();
            });
            return;
        } else if (oldlevel > newlevel) {
            // slide $oldelem off of $newelem
            $section.css("overflow", "hidden");
            $oldelem.css({
                position: "absolute",
                left: 0,
                top: $section.css("padding-top"),
                width: width + "px",
                height: "100%",
                background: "inherit",
                "box-shadow": "-4px 0 2px #ccc",
                opacity: 1,
                "z-index": "999"
            });
            $newelem.show();
            $oldelem.animate({left: width + "px", opacity: 0.1}, function () {
                $oldelem.hide();
                $oldelem.css({
                    position: "",
                    left: "",
                    top: "",
                    width: "",
                    height: "",
                    background: "",
                    "box-shadow": "",
                    opacity: "",
                    "z-index": ""
                });
                $section.css("overflow", "");
                if (typeof oncomplete == "function") oncomplete();
            });
            return;
        }
    }
    
    // If we're still here, we didn't slide
    // (possibly because one of the 2 lacks data-level, or because the entire section is hidden)
    $section.children("div").hide();
    $newelem.show();
    if (typeof oncomplete == "function") oncomplete();
}

function toggle_buttonbox(section, newbie, oncomplete) {
    var $section = $("#ctrl_" + section);
    toggle($section[0], document.getElementById(section + "_" + newbie), oncomplete || null);
    
    $section.children("footer").find("button").removeClass("active");
    $section.children("footer").find("button[data-btn=\"" + newbie + "\"]").addClass("active");
    $section.children("footer.buttonbox").find("button").attr("disabled", newbie == "waiting");
}

function flash(elem) {
    // Flash background of elem
    var $elem = $(elem);
    var transitioning = $elem.data("transitioning");
    if (!transitioning) {
        $elem.addClass("preflash").data("transitioning", true).css("background-image", "none").addClass("flash");
        setTimeout(function () {
            $elem.removeClass("flash");
            setTimeout(function () {
                $elem.css("background-image", "").data("transitioning", false);
            }, 200 + 5);
        }, 200 + 100);
    }
}

function controlcmd(details) {
    if (!details.data) details.data = {};
    switch (details.command) {
        case "pause":
            if (typeof video != "undefined") video.vid.pause();
            break;
        case "effect":
            if (details.data.preset) {
                effects.sendpreset(details.data.channel || "0", details.data.preset);
            } else if (details.data.light || details.data.sound) {
                effects.sendpattern(details.data.channel || "0", details.data.light, details.data.sound || null);
            } else if (details.data.channel && typeof details.data.state != "undefined") {
                effects.sendtoggle(details.data.channel, details.data.state);
            } else if (details.data.channel && typeof details.data.dimness != "undefined") {
                effects.sendpattern(details.data.channel, details.data.dimness, details.data.time || 0);
            }
            break;
        case "next":
            effects.next(details.data.channel || "0");
            break;
        case "stop":
            effects.stop(details.data.channel || "0");
            break;
        case "sequence":
            if (details.data.sequencename && settings.sequences.hasOwnProperty(details.data.sequencename)) {
                sequences.add(details.data.sequencename);
            }
            break;
    }
}

function controlcmdlength(details) {
    if (!details.data) details.data = {};
    switch (details.command) {
        case "effect":
            var data;
            if (details.data.preset && settings.presets.hasOwnProperty(details.data.preset)) {
                data = settings.presets[details.data.preset];
            } else {
                data = details.data;
            }
            if (data.light) {
                // TODO: What about the possibility that the sound lasts longer than the light?
                var sum = 0;
                for (var i = 0; i < data.light.length; i++) {
                    sum += data.light[i];
                }
                sum = sum / 1000; // convert from ms to sec
                return sum;
            } else if (typeof data.time != "undefined") {
                return data.time;
            }
            break;
        case "sequence":
            if (details.data.sequencename && settings.sequences.hasOwnProperty(details.data.sequencename)) {
                return sequences.getLength(settings.sequences[details.data.sequencename]);
            }
            break;
    }
    return 0;
}

function controlcmdinfo(details) {
    if (details.command) {
        if (details.command == "effect" && details.data) {
            var html = '';
            if (details.data.preset) {
                html += 'Preset: ' + shared.escHTML(details.data.preset);
            } else if (details.data.light) {
                html += 'Light: ';
                if (details.data.light == "auto") {
                    html += 'auto';
                } else {
                    html += '<span title="' + shared.escHTML(JSON.stringify(details.data.light)) + '" style="cursor: default; font-style: italic;">(custom lighting pattern)</span>';
                }
                if (details.data.sound) html += '<br>Sound: ' + details.data.sound;
            } else if (typeof details.data.dimness != "undefined") {
                html += 'Dimness: ' + details.data.dimness;
                if (details.data.time) html += ' over ' + details.data.time + ' seconds';
            } else if (typeof details.data.state != "undefined") {
                switch (details.data.state) {
                    case 1:
                        html += 'on';
                        break;
                    case 0:
                        html += 'off';
                        break;
                    case -1:
                        html += 'toggle';
                        break;
                }
            }
            return html;
        } else if (details.command == "sequence" && details.data) {
            return 'Sequence: ' + shared.escHTML(details.data.sequencename || '""');
        } else {
            return '<i>' + shared.escHTML(details.command) + '</i>';
        }
    } else {
        return '&nbsp;';
    }
}