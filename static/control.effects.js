var effects = {
    oncustom: {timed: false, dimmed: false},
    transitioning: false,
    channel: "0",
    details: {type: "timed"},
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
        
        $(document).on("change", "input[name=effects_channel]", function (event) {
            effects.update_channel_details();
        });
        
        $("input[name=effects_custom_lighttype]").change(function () {
            $("#effects_custom_light").css("visibility", $("#effects_custom_lighttype_list")[0].checked ? "visible" : "hidden");
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
                var key = String.fromCharCode(event.which).toLowerCase();
                var valid = false;
                for (var i = 0; i < effects.keyboard_valid.length; i++) {
                    if (effects.keyboard_valid[i] == key) {
                        valid = true;
                        break;
                    }
                }
                if (valid) {
                    event.preventDefault();
                    // Only run the shortcut on keyup
                    // (the keydown handler is so preventDefault is called)
                    if (event.type == "keyup") effects.keyboard_action(key);
                }
            }
        });
        
        $(document).on("keypress", "button", function (event) {
            if (event.which != 13) {
                // It's not an "enter" keypress, so ignore it (it might be a keyboard shortcut)
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
    
    update_channel_details: function () {
        var $selected = $("input[name=effects_channel]:checked", "#effects_form");
        this.channel = $selected.val();
        this.details = settings.channels[this.channel] || {type: "timed"};
        if (!this.details.type) this.details.type = "timed";
        $("div.effects_panel").hide();
        $("#effects_" + this.details.type + "panel").show();
        $(".onlywhennotoggle")[this.details.type == "toggled" ? "hide" : "show"]();
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
        var keys = {};
        for (var key in settings.keyboard) {
            if (settings.keyboard.hasOwnProperty(key)) {
                if (!(key.toLowerCase() in keys)) {
                    keys[key.toLowerCase()] = settings.keyboard[key];
                }
            }
        }
        
        var prevselected = $("#effects_keyboard_editor_key").val();
        $("#effects_keyboard_editor_key").empty();
        effects.keyboard_valid = [];
        
        var html = "", i;
        var checkkey = function (key) {
            var prettykey = key == " " ? "[space]" : key;
            var option = document.createElement("option");
            option.value = key;
            option.appendChild(document.createTextNode(prettykey));
            
            html += '<tr><td style="cursor: default; text-align: center;">' + escHTML(prettykey) + '</td>';
            if (keys.hasOwnProperty(key)) {
                if (keys[key].command) {
                    option.style.color = "grey";
                    effects.keyboard_valid.push(key);
                }
                if (keys[key].channel && keys[key].channel != "0") {
                    html += '<td>' + escHTML(keys[key].channel) + '</td>';
                } else {
                    html += '<td>Default Channel</td>';
                }
                html += '<td>';
                html += effects.keyboard_action_formatter(keys[key]);
                html += '</td><td><span class="lilbutton effects_keyboard_deleter" data-key="' + escHTML(key) + '">Delete</span></td>';
            }
            html += '</tr>';
            
            $("#effects_keyboard_editor_key").append(option);
        };
        
        // a-z
        for (i = 97; i <= 122; i++) {
            checkkey(String.fromCharCode(i));
        }
        // 1-9
        for (i = 49; i <= 57; i++) {
            checkkey(String.fromCharCode(i));
        }
        $(["0", "-", "=", "[", "]", "\\", ";", "'", ",", ".", "/", " "]).each(function () {
            checkkey(this);
        });
        
        $("#effects_keyboard_editor_key").val(prevselected);
        $("#effects_keyboard_tbody").html(html);
    },
    
    keyboard_action_formatter: function (data) {
        if (data.command) {
            if (data.command == "play" && data.prop) {
                var html = "";
                if (data.prop.preset) {
                    html += "Preset: " + escHTML(data.prop.preset);
                } else if (data.prop.light) {
                    html += 'Light: ';
                    if (data.prop.light == "auto") {
                        html += 'auto';
                    } else {
                        html += '<span title="' + escHTML(JSON.stringify(data.prop.light)) + '" style="cursor: default; font-style: italic;">(custom lighting sequence)</span>';
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
                return "<i>" + escHTML(data.command) + "</i>";
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
                        effects.sendpreset(data.channel || "0", data.prop.preset);
                    } else if (data.prop.light) {
                        effects.sendpattern(data.channel || "0", data.prop.light, data.prop.sound || null);
                    } else if (typeof data.prop.dimness != "undefined") {
                        effects.sendpattern(data.channel || "0", data.prop.dimness, data.prop.time || 0);
                    } else if (typeof data.prop.state != "undefined") {
                        effects.sendtoggle(data.channel || "0", data.prop.state);
                    }
                    break;
                case "next":
                    effects.next(data.channel || "0");
                    break;
                case "stop":
                    effects.stop(data.channel || "0");
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
        conn.send_setting("keyboard");
        $("#effects_keyboard_editor").fadeOut();
        blockers.effects_keyboard_editor = null;
    },
    
    keyboard_editor_cancel: function () {
        $("#effects_keyboard_editor").fadeOut();
        blockers.effects_keyboard_editor = null;
    },
    
    keyboard_editor_delete: function (key) {
        if (key in settings.keyboard) {
            delete settings.keyboard[key];
        }
        conn.send_setting("keyboard");
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
            conn.send_setting("presets");
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

init.push(function () {
    effects.init();
});