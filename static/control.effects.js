var KEY_CODE_MAP = {
      109: "-"
    , 189: "-"
    , 107: "="
    , 219: "["
    , 221: "]"
    , 220: "\\"
    , 59: ";"
    , 186: ";"
    , 222: "'"
    , 188: ","
    , 110: "."
    , 190: "."
    , 111: "/"
    , 191: "/"
    , 32: "[space]"
    /*
    , 112: "F1"
    , 113: "F2"
    , 114: "F3"
    , 115: "F4"
    , 116: "F5"
    , 117: "F6"
    , 118: "F7"
    , 119: "F8"
    , 120: "F9"
    , 121: "F10"
    , 122: "F11"
    , 123: "F12"
    , 8: "[backspace]"
    , 46: "[delete]",
    , 9: "[tab]"
    , 33: "[page up]"
    , 34: "[page down]"
    , 35: "[end]"
    , 36: "[home]"
    , 37: "[left arrow]"
    , 38: "[up arrow]"
    , 39: "[right arrow]"
    , 40: "[down arrow]"
    */
};

var effects = {
    oncustom: {timed: false, dimmed: false},
    transitioning: false,
    channel: "0",
    details: {type: "timed"},
    channels_currentlyediting: null,
    keyboard_currentlyediting: null,
    keyboard_onformelem: false,
    keyboard_valid: [],
    
    
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
        $("span.effects_custom_customize").click(function () {
            effects.checkinputs("preset");
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
        
        $(document).on("change", "input[name=effects_channellist]", function (event) {
            effects.update_channel_details();
        });
        
        $("input[name=effects_custom_lighttype]").change(function () {
            $("#effects_custom_light").css("visibility", $("#effects_custom_lighttype_list")[0].checked ? "visible" : "hidden");
        });
        
        $(document).on("click", ".effects_channels_editor", function (event) {
            effects.channels_editor($(this).attr("data-channel"));
        });
        
        $("#effects_channels_editor_submitter").click(function () {
            effects.channels_editor_save();
        });
        
        $("#effects_channels_editor_canceller").click(function () {
            effects.channels_editor_cancel();
        });
        
        $(document).on("click", ".effects_channels_deleter", function (event) {
            var channel = $(this).attr("data-channel");
            if (settings.channels.hasOwnProperty(channel)) {
                delete settings.channels[channel];
            }
            conn.sendsetting("channels");
        });
        
        $("#effects_channels_newtype, #effects_channels_editor_type").change(function () {
            var color = "";
            if ($(this).val() == "toggled") color = "red";
            if ($(this).val() == "dimmed") color = "blue";
            var newid = $(this).is("#effects_channels_newtype") ? "newname" : "editor_name";
            $("#effects_channels_" + newid).css("color", color);
        });
        
        $("#effects_channels_newbtn").click(function () {
            var newname = $.trim($("#effects_channels_newname").val());
            var newtype = $("#effects_channels_newtype").val();
            var newdesc = $.trim($("#effects_channels_newdesc").val());
            if (effects.check_channel_inputs(newname, newtype, newdesc)) {
                var prop = {type: newtype};
                if (newdesc) prop.description = newdesc;
                settings.channels[newname] = prop;
                conn.sendsetting("channels");
                $("#effects_channels_newname").val("");
                $("#effects_channels_newdesc").val("");
            } else {
                $("#effects_channels_newname").select();
            }
        });
        
        $(document).on("click", ".effects_keyboard_deleter", function (event) {
            effects.keyboard_editor_delete($(this).attr("data-key"));
        });
        
        $("#effects_keyboard_editor_submitter").click(function () {
            effects.keyboard_editor_save();
        });
        
        $("#effects_keyboard_editor_canceller").click(function () {
            effects.keyboard_editor_cancel();
        });
        
        $(document).on("keydown keyup", function (event) {
            if (!effects.keyboard_onformelem && !event.ctrlKey && !event.altKey && !event.metaKey) {
                var key, valid = false;
                if (typeof video != "undefined" && MEDIA_KEY_CODE_MAP.hasOwnProperty(event.which)) {
                    key = "MEDIA_KEY";
                    valid = true;
                } else {
                    if (KEY_CODE_MAP.hasOwnProperty(event.which)) {
                        key = KEY_CODE_MAP[event.which];
                    } else if (event.which >= 65 && event.which <= 90) {
                        // a-z
                        key = String.fromCharCode(event.which).toLowerCase();
                    } else if (event.which >= 48 && event.which <= 57) {
                        // 0-9
                        key = String.fromCharCode(event.which);
                    } else if (event.which >= 96 && event.which <= 105) {
                        // 0-9 (numeric keypad)
                        key = String.fromCharCode(event.which - 48);
                    }
                    for (var i = 0; i < effects.keyboard_valid.length; i++) {
                        if (effects.keyboard_valid[i] == key) {
                            valid = true;
                            break;
                        }
                    }
                }
                if (valid) {
                    event.preventDefault();
                    // Only run the shortcut on keyup
                    // (the keydown handler is so preventDefault is called)
                    if (event.type == "keyup") {
                        if (key == "MEDIA_KEY") {
                            video.runcmd(MEDIA_KEY_CODE_MAP[event.which]);
                        } else {
                            effects.keyboard_action(key);
                        }
                    }
                }
            }
        });
        
        $(document).on("keypress", "button", function (event) {
            if (event.which == 32) {
                // It's a spacebar, so ignore it (it might be a keyboard shortcut)
                event.preventDefault();
            }
        }).on("blur", "input, select, textarea", function (event) {
            effects.keyboard_onformelem = false;
        }).on("focus", "input, select, textarea", function (event) {
            effects.keyboard_onformelem = true;
        });
        
        $("#ctrl_effects > footer button").click(function () {
            if ($(this).hasClass("active")) {
                effects.toggle("controls");
            } else {
                effects.toggle($(this).attr("data-btn"));
            }
        });
        
        // Load settings
        this.update_channels();
        this.update_keyboard();
        this.update_presets();
        
        $("#effects_form").submit(function (event) {
            event.preventDefault();
            effects.checkinputs();
        });
        
        $("#effects_savekeyboard").click(function () {
            effects.checkinputs("keyboard");
        });
    },
    
    toggle: function (newbie, oncomplete) {
        toggle($("#ctrl_effects")[0], document.getElementById("effects_" + newbie), oncomplete || null);
        
        $("#ctrl_effects > footer button").removeClass("active");
        $("#ctrl_effects > footer button[data-btn=\"" + newbie + "\"]").addClass("active");
        
        $("#ctrl_effects > footer.buttonbox button").attr("disabled", newbie == "waiting");
    },
    
    checkinputs: function (reason) {
        if (this.details.type == "toggled") {
            if (reason == "keyboard") {
                this.keyboard_editor({
                    channel: this.channel,
                    command: "play",
                    prop: {}
                }, true);
            }
        } else {
            if (!this.oncustom[this.details.type]) {
                if (reason == "keyboard") {
                    this.keyboard_editor({
                        channel: this.channel,
                        command: "play",
                        prop: {
                            preset: $("#effects_preset_" + this.details.type).val()
                        }
                    });
                } else {
                    this.sendpreset(this.channel, $("#effects_preset_" + this.details.type).val());
                }
            } else {
                if (this.details.type == "dimmed") {
                    var dimness = Number($("#effects_custom_dimness").val());
                    var time = Number($("#effects_custom_time").val() || 0);
                    if (isNaN(dimness) || dimness > 100 || dimness < 0) {
                        alert("ERROR: Invalid dim level!");
                        return;
                    } else if (isNaN(time) || time < 0) {
                        alert("ERROR: Invalid time!");
                        return;
                    } else {
                        if (reason == "keyboard") {
                            this.keyboard_editor({
                                channel: this.channel,
                                command: "play",
                                prop: {
                                    dimness: dimness,
                                    time: time
                                }
                            });
                        } else if (reason == "preset") {
                            this.save_preset({
                                dimness: dimness,
                                time: time
                            });
                        } else {
                            this.sendpattern(this.channel, dimness, time);
                        }
                    }
                } else {
                    var lighttype = $("input[name=effects_custom_lighttype]:checked").val();
                    var light = $.trim($("#effects_custom_light").val());
                    var sound = $("#effects_custom_sound").val();
                    if (lighttype == "auto") {
                        light = "auto";
                    } else {
                        if (light.lastIndexOf(",") == light.length - 1) light = light.slice(0, -1);
                        try {
                            light = $.parseJSON("[" + light + "]");
                        } catch (err) {
                            alert("ERROR: Invalid lighting pattern!\nDetails: " + err);
                            return;
                        }
                    }
                    if (reason == "keyboard") {
                        this.keyboard_editor({
                            channel: this.channel,
                            command: "play",
                            prop: {
                                light: light,
                                sound: sound || null
                            }
                        });
                    } else if (reason == "preset") {
                        this.save_preset({
                            light: light,
                            sound: sound || null
                        });
                    } else {
                        this.sendpattern(this.channel, light, sound || null);
                    }
                }
            }
        }
    },
    
    check_channel_inputs: function (name, type, desc, old_name) {
        if (name.replace(/ /g, "").length < 2) {
            alert("Please specify a name");
        } else if (name.toLowerCase() == "default channel" || (settings.channels.hasOwnProperty(name) && name != old_name)) {
            alert("ERROR: Name already in use");
        } else if (/^[a-zA-Z]/.test(name)) {
            return true;
        } else {
            alert("ERROR: Name must start with a letter");
        }
        return false;
    },
    
    update_channel_details: function () {
        var $selected = $("input[name=effects_channellist]:checked", "#effects_form");
        this.channel = $selected.val();
        this.details = settings.channels[this.channel] || {type: "timed"};
        if (!this.details.type) this.details.type = "timed";
        $("div.effects_panel").hide();
        $("#effects_" + this.details.type + "panel").show();
        $(".onlywhennotoggle")[this.details.type == "toggled" ? "hide" : "show"]();
    },
    
    update_channels: function () {
        var selected_channel = $("input[name=effects_channellist]:checked", "#effects_form").val() || "0";
        
        var html = '<table><tbody><tr><td><input type="radio" id="effects_channellist_radio0" name="effects_channellist" value="0" checked></td><td><label for="effects_channellist_radio0">Default Channel</label></td></tr>';
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
                html += '<tr><td valign="top"><input type="radio" id="effects_channellist_radio' + counter + '" name="effects_channellist" value="' + shared.escHTML(channel) + '"></td><td><label for="effects_channellist_radio' + counter + '" title="' + shared.escHTML(details.description || channel) + '" style="' + shared.escHTML(css) + '">' + shared.escHTML(channel).replace(/_/g, "_<wbr>") + '</label></td></tr>';
            }
        }
        
        html += '</tbody></table>';
        $("#effects_channellist").html(html);
        
        // Re-select previously selected channel
        $("input[name=effects_channellist]", "#effects_form").each(function () {
            if (this.value == selected_channel) this.checked = true;
        });
        this.update_channel_details();
        
        this.update_channelman();
    },
    
    update_channelman: function () {
        var usedin_default = this.channel_used_in("0", "Yes", "&nbsp;");
        var html = '<tr><td class="disabled">Default Channel</td><td class="disabled">timed</td><td style="text-align: center;">' + usedin_default.keyboard + '</td><td style="text-align: center;">' + usedin_default.video + '</td><td style="text-align: center;">' + usedin_default.clients + '</td></tr>';
        for (var channel in settings.channels) {
            if (settings.channels.hasOwnProperty(channel)) {
                var details = settings.channels[channel];
                var css = "", type = "timed";
                if (details.type && details.type == "toggled") {
                    type = "toggled";
                    css = "color: red;";
                } else if (details.type && details.type == "dimmed") {
                    type = "dimmed";
                    css = "color: blue;";
                }
                var usedin = this.channel_used_in(channel, "Yes", "&nbsp;");
                html += '<tr><td title="' + shared.escHTML(details.description || channel) + '" style="' + shared.escHTML(css) + '">' + shared.escHTML(channel) + '</td><td>' + type + '</td><td style="text-align: center;">' + usedin.keyboard + '</td><td style="text-align: center;">' + usedin.video + '</td><td style="text-align: center;">' + usedin.clients + '</td>';
                if (usedin.nothing) {
                    html += '<td><span class="lilbutton effects_channels_editor" data-channel="' + shared.escHTML(channel) + '">Edit</span>&nbsp;<span class="lilbutton effects_channels_deleter" data-channel="' + shared.escHTML(channel) + '">Delete</span></td>';
                }
            }
        }
        
        $("#effects_channels_tbody").html(html);
    },
    
    channel_used_in: function (channel, yesvalue, novalue) {
        var usedin = {nothing: true};
        
        if (conn.used_channels.hasOwnProperty(channel)) {
            usedin.clients = conn.used_channels[channel];
            usedin.nothing = false;
        } else {
            usedin.clients = 0;
        }
        
        for (var key in settings.keyboard) {
            if (settings.keyboard.hasOwnProperty(key)) {
                if (settings.keyboard[key].channel == channel) {
                    usedin._keyboard = true;
                    break;
                } else if (channel == "0" && !settings.keyboard[key].channel) {
                    usedin._keyboard = true;
                    break;
                }
            }
        }
        
        $("button.vidbtn").each(function () {
            if ($(this).attr("data-control")) {
                var control;
                try {
                    control = $.parseJSON($(this).attr("data-control"));
                } catch (err) {}
                if (control && control.length) {
                    for (var i = 0; i < control.length; i++) {
                        if (control[i].command && control[i].command == "effect" && control[i].data) {
                            if (control[i].data.channel == channel) {
                                usedin._video = true;
                                break;
                            } else if (channel == "0" && !control[i].data.channel) {
                                usedin._video = true;
                                break;
                            }
                        }
                    }
                }
            }
        });
        
        $(["keyboard", "video"]).each(function () {
            if (usedin["_" + this]) {
                if (typeof yesvalue != "undefined" && (typeof yesvalue != "object" || yesvalue)) {
                    usedin[this] = yesvalue;
                } else {
                    usedin[this] = true;
                }
                usedin.nothing = false;
            } else {
                if (typeof novalue != "undefined" && (typeof novalue != "object" || novalue)) {
                    usedin[this] = novalue;
                } else {
                    usedin[this] = false;
                }
            }
        });
        
        return usedin;
    },
    
    channels_editor: function (channel) {
        var data = settings.channels[channel];
        if (data) {
            blockers.effects_channels_editor = "Please finish editing the channel before exiting.";
            this.channels_currentlyediting = channel;
            
            $("#effects_channels_editor_name").val(channel);
            $("#effects_channels_editor_type").val(data.type).change();
            $("#effects_channels_editor_desc").val(data.description || "");
            
            this.toggle("channels", function () {
                $("#effects_channels_editor").fadeIn();
            });
        }
    },
    
    channels_editor_save: function () {
        var name = $.trim($("#effects_channels_editor_name").val());
        var type = $("#effects_channels_editor_type").val();
        var desc = $.trim($("#effects_channels_editor_desc").val());
        if (this.check_channel_inputs(name, type, desc, this.channels_currentlyediting)) {
            if (name != this.channels_currentlyediting && settings.channels.hasOwnProperty(this.channels_currentlyediting)) {
                delete settings.channels[this.channels_currentlyediting];
            }
            this.channels_currentlyediting = null;
            var prop = {type: type};
            if (desc) prop.description = desc;
            settings.channels[name] = prop;
            conn.sendsetting("channels");
            $("#effects_channels_editor").fadeOut();
            blockers.effects_channels_editor = null;
        } else {
            $("#effects_channels_editor_name").select();
        }
    },
    
    channels_editor_cancel: function () {
        this.channels_currentlyediting = null;
        $("#effects_channels_editor").fadeOut();
        blockers.effects_channels_editor = null;
    },
    
    update_keyboard: function () {
        var keys = {};
        for (var key in settings.keyboard) {
            if (settings.keyboard.hasOwnProperty(key)) {
                if (!keys.hasOwnProperty(key.toLowerCase())) {
                    keys[key.toLowerCase()] = settings.keyboard[key];
                }
            }
        }
        
        var prevselected = $("#effects_keyboard_editor_key").val();
        $("#effects_keyboard_editor_key").empty();
        this.keyboard_valid = [];
        
        var html = "", i;
        var checkkey = function (key) {
            var option = document.createElement("option");
            option.value = key;
            option.appendChild(document.createTextNode(key));
            
            html += '<tr><td style="cursor: default; text-align: center;">' + shared.escHTML(key) + '</td>';
            if (keys.hasOwnProperty(key)) {
                if (keys[key].command) {
                    option.style.color = "grey";
                    effects.keyboard_valid.push(key);
                }
                if (keys[key].channel && keys[key].channel != "0") {
                    html += '<td>' + shared.escHTML(keys[key].channel) + '</td>';
                } else {
                    html += '<td>Default Channel</td>';
                }
                html += '<td>';
                html += effects.keyboard_action_formatter(keys[key]);
                html += '</td><td><span class="lilbutton effects_keyboard_deleter" data-key="' + shared.escHTML(key) + '">Delete</span></td>';
            }
            html += '</tr>';
            
            $("#effects_keyboard_editor_key").append(option);
        };
        
        // a-z
        for (i = 97; i <= 122; i++) {
            checkkey(String.fromCharCode(i));
        }
        for (i = 1; i <= 9; i++) {
            checkkey(i + "");
        }
        checkkey("0");
        var donekeys = {};
        for (var keycode in KEY_CODE_MAP) {
            if (KEY_CODE_MAP.hasOwnProperty(keycode)) {
                if (!donekeys.hasOwnProperty(KEY_CODE_MAP[keycode])) {
                    donekeys[KEY_CODE_MAP[keycode]] = true;
                    checkkey(KEY_CODE_MAP[keycode]);
                }
            }
        }
        
        $("#effects_keyboard_editor_key").val(prevselected);
        $("#effects_keyboard_tbody").html(html);
        
        this.update_channelman();
    },
    
    keyboard_action_formatter: function (data) {
        if (data.command) {
            if (data.command == "play" && data.prop) {
                var html = "";
                if (data.prop.preset) {
                    html += "Preset: " + shared.escHTML(data.prop.preset);
                } else if (data.prop.light) {
                    html += 'Light: ';
                    if (data.prop.light == "auto") {
                        html += 'auto';
                    } else {
                        html += '<span title="' + shared.escHTML(JSON.stringify(data.prop.light)) + '" style="cursor: default; font-style: italic;">(custom lighting sequence)</span>';
                    }
                    if (data.prop.sound) html += "<br>Sound: " + data.prop.sound;
                } else if (typeof data.prop.dimness != "undefined") {
                    html += "Dimness: " + data.prop.dimness;
                    if (data.prop.time) html += " over " + data.prop.time + " seconds";
                } else if (typeof data.prop.state != "undefined") {
                    switch (data.prop.state) {
                        case 1:
                            html += "on";
                            break;
                        case 0:
                            html += "off";
                            break;
                        case -1:
                            html += "toggle";
                            break;
                    }
                }
                return html;
            } else {
                return "<i>" + shared.escHTML(data.command) + "</i>";
            }
        } else {
            return "&nbsp;";
        }
    },
    
    keyboard_action: function (key) {
        if (settings.keyboard[key]) {
            var data = settings.keyboard[key];
            switch (data.command) {
                case "play":
                    if (data.prop.preset) {
                        this.sendpreset(data.channel || "0", data.prop.preset);
                    } else if (data.prop.light) {
                        this.sendpattern(data.channel || "0", data.prop.light, data.prop.sound || null);
                    } else if (typeof data.prop.dimness != "undefined") {
                        this.sendpattern(data.channel || "0", data.prop.dimness, data.prop.time || 0);
                    } else if (typeof data.prop.state != "undefined") {
                        this.sendtoggle(data.channel || "0", data.prop.state);
                    }
                    break;
                case "next":
                    this.next(data.channel || "0");
                    break;
                case "stop":
                    this.stop(data.channel || "0");
                    break;
            }
        }
    },
    
    keyboard_editor: function (data, istoggled) {
        blockers.effects_keyboard_editor = "Please finish editing the keyboard shortcut before exiting.";
        this.keyboard_currentlyediting = data;
        
        $("#effects_keyboard_editor_channel").text(data.channel == "0" ? "Default Channel" : data.channel);
        if (istoggled) {
            $("#effects_keyboard_editor_action").hide();
            $("#effects_keyboard_editor_channeltoggled").show();
        } else {
            $("#effects_keyboard_editor_channeltoggled").hide();
            $("#effects_keyboard_editor_action").html(this.keyboard_action_formatter(data)).show();
        }
        
        this.toggle("keyboard", function () {
            $("#effects_keyboard_editor").fadeIn();
        });
    },
    
    keyboard_editor_save: function () {
        var key = $("#effects_keyboard_editor_key").val();
        settings.keyboard[key] = this.keyboard_currentlyediting;
        if ($("#effects_keyboard_editor_channeltoggled").css("display") != "none") {
            if (!settings.keyboard[key].prop) settings.keyboard[key].prop = {};
            settings.keyboard[key].prop.state = Number($("#effects_keyboard_editor_state").val());
        }
        conn.sendsetting("keyboard");
        $("#effects_keyboard_editor").fadeOut();
        blockers.effects_keyboard_editor = null;
    },
    
    keyboard_editor_cancel: function () {
        $("#effects_keyboard_editor").fadeOut();
        blockers.effects_keyboard_editor = null;
    },
    
    keyboard_editor_delete: function (key) {
        if (settings.keyboard.hasOwnProperty(key)) {
            delete settings.keyboard[key];
        }
        conn.sendsetting("keyboard");
    },
    
    update_presets: function () {
        $("#effects_preset_timed, #effects_preset_dimmed").empty();
        
        for (var preset in settings.presets) {
            if (settings.presets.hasOwnProperty(preset)) {
                var option = document.createElement("option");
                option.value = preset;
                option.appendChild(document.createTextNode(preset));
                $("#effects_preset_" + (typeof settings.presets[preset].dimness != "undefined" ? "dimmed" : "timed")).append(option);
            }
        }
    },
    
    save_preset: function (preset) {
        var presetname = prompt("Preset name:");
        if (presetname) {
            settings.presets[presetname] = preset;
            conn.sendsetting("presets");
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
        flash("#ctrl_effects");
    }
};

init.push(function () {
    effects.init();
});