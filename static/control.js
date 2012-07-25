function escHTML(html) {
    // NOTE: Also in myutil.js and clientframe2.js
    if (typeof html != "string") {
        html = html + "";
    }
    return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

function resizer(use_animate) {
    $("section").not("minimized").children("header").each(function () {
        $(this).parent().css("padding-top", Math.round($(this).outerHeight()) + "px");
    });
    $("section").not("minimized").children("footer:visible").each(function () {
        var extra = $(this).parent().is(".top") ? 20 : 0;
        $(this).parent().css("padding-bottom", Math.round($(this).outerHeight() + extra) + "px");
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

var minimized_items = [];
var init = [];
var blockers = {};

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

$(window).on("beforeunload", function () {
    for (var blocker in blockers) {
        if (blockers.hasOwnProperty(blocker)) {
            if (blockers[blocker]) {
                return blockers[blocker];
            }
        }
    }
});

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
            //$oldelem.find(".panel:visible").addClass("wasvisible").hide();
            $newelem.animate({left: 0, opacity: 1}, function () {
                $oldelem.hide();
                //$oldelem.find(".wasvisible").show().removeClass("wasvisible");
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
            //$newelem.find(".panel:visible").addClass("wasvisible").hide();
            $oldelem.animate({left: width + "px", opacity: 0.1}, function () {
                $oldelem.hide();
                //$newelem.find(".wasvisible").show().removeClass("wasvisible");
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
    $oldelem.hide();
    $newelem.show();
    if (typeof oncomplete == "function") oncomplete();
}