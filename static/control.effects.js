var effects = {
    oncustom: {timed: false, dimmed: false},
    transitioning: false,
    channel: "0",
    details: {type: "timed"},
    my_lock_id: null,
    
    
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
            alert("TODO");
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
        
        // START KEYBOARD SHORTCUT STUFF
        
        $(document).on("click", ".effects_keyboard_keybtn", function (event) {
            if ($(this).hasClass("locked")) {
                return;
            }
            
            var key = $(this).attr("data-key");
            $("#effects_keyboard_editor_key").text(key);
            if (typeof settings.keyboard[key] == "undefined") settings.keyboard[key] = {};
            
            while (!effects.my_lock_id || effects.my_lock_id.toString().length != "4" ||
                   effects.my_lock_id.toString().charAt(3) == "0" ||
                   effects.my_lock_id.toString().charAt(0) == "1" ||
                   effects.my_lock_id.toString().charAt(0) == "2") {
                effects.my_lock_id = Math.floor(Math.random() * 10000);
            }
            settings.keyboard[key].editor = effects.my_lock_id;
            conn.send_setting("keyboard");
            
            var details = settings.keyboard[key];
            $("#effects_keyboard_editor_channel").val(details.channel || "0");
            $("#effects_keyboard_editor_channel").change();
            
            // TODO: Load other stuff, and if we don't have a value for it make sure we reset it back to its default
            
            $("#effects_keyboard_editor").fadeIn();
        });
        
        $("#effects_keyboard_editor_delete").click(function () {
            alert("TODO");
        });
        
        $("#effects_keyboard_editor_channel").change(function () {
            var channeldetails = settings.channels[$(this).val()] || {type: "timed"};
            
            $("#effects_keyboard_editor_channelstuff").children().hide();
            $("#effects_keyboard_editor_channel" + channeldetails.type).show();
            
            if (channeldetails.type == "timed") {
                $("#effects_keyboard_editor_channeltimed_typeselect").change();
            } else if (channeldetails.type == "dimmed") {
                $("#effects_keyboard_editor_channeldimmed_typeselect").change();
            }
        });
        
        $("#effects_keyboard_editor_channeltimed_typeselect").change(function () {
            if ($(this).val() == "custom") {
                $("#effects_keyboard_editor_channeltimed_presetcontainer").hide();
                $("#effects_keyboard_editor_channeltimed_customcontainer").show();
            } else {
                $("#effects_keyboard_editor_channeltimed_customcontainer").hide();
                $("#effects_keyboard_editor_channeltimed_presetcontainer").show();
            }
        });
        
        $("#effects_keyboard_editor_channeldimmed_typeselect").change(function () {
            if ($(this).val() == "custom") {
                $("#effects_keyboard_editor_channeldimmed_presetcontainer").hide();
                $("#effects_keyboard_editor_channeldimmed_customcontainer").show();
            } else {
                $("#effects_keyboard_editor_channeldimmed_customcontainer").hide();
                $("#effects_keyboard_editor_channeldimmed_presetcontainer").show();
            }
        });
        
        $("#effects_keyboard_editor_form").submit(function (event) {
            event.preventDefault();
            var key = $("#effects_keyboard_editor_key").text();
            settings.keyboard[key] = {};
            
            settings.keyboard[key].channel = $("#effects_keyboard_editor_channel").val();
            var channeldetails = settings.channels[settings.keyboard[key].channel] || {type: "timed"};
            switch (channeldetails.type) {
                case "timed":
                    if ($("#effects_keyboard_editor_channeltimed_typeselect").val() == "custom") {
                        alert("TODO");
                    } else {
                        settings.keyboard[key].preset = $("#effects_keyboard_editor_channeltimed_preset").val();
                    }
                    break;
                case "toggled":
                    var state = Number($("#effects_keyboard_editor_state").val());
                    settings.keyboard[key].state = isNaN(state) ? -1 : state;
                    break;
                case "dimmed":
                    if ($("#effects_keyboard_editor_channeldimmed_typeselect").val() == "custom") {
                        alert("TODO");
                    } else {
                        settings.keyboard[key].preset = $("#effects_keyboard_editor_channeldimmed_preset").val();
                    }
                    break;
            }
            
            conn.send_setting("keyboard");
            $("#effects_keyboard_editor").fadeOut();
        });
        
        $("#effects_keyboard_editor_submitter").click(function () {
            $("#effects_keyboard_editor_form").submit();
        });
        
        // END KEYBOARD SHORTCUT STUFF
        
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
    
    toggle: function (newbie) {
        toggle($("#ctrl_effects")[0], document.getElementById("effects_" + newbie));
        
        $("#ctrl_effects > footer button").removeClass("active");
        $("#ctrl_effects > footer button[data-btn=\"" + newbie + "\"]").addClass("active");
        
        $("#ctrl_effects > footer.buttonbox button").attr("disabled", newbie == "waiting");
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
        var selected_channel2 = $("#effects_keyboard_editor_channel").val() || "0";
        
        var html = '<table><tbody><tr><td><input type="radio" id="effects_channels_radio0" name="effects_channel" value="0" checked></td><td><label for="effects_channels_radio0">Default Channel</label></td></tr>';
        var html2 = '<option value="0" selected>Default Channel</option>';
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
                html2 += '<option value="' + escHTML(channel) + '" title="' + escHTML(details.description || channel) + '" style="' + escHTML(css) + '">' + escHTML(channel) + '</option>';
            }
        }
        
        html += '</tbody></table>';
        $("#effects_channels").html(html);
        
        $("#effects_keyboard_editor_channel").html(html2);
        
        // Re-select previously selected channel
        $("input[name=effects_channel]", "#effects_form").each(function () {
            if (this.value == selected_channel) this.checked = true;
        });
        $("#effects_keyboard_editor_channel").val(selected_channel2);
        this.update_channel_details();
    },
    
    update_keyboard: function () {
        var keys = {
            n: true,
            s: true
        };
        for (var key in settings.keyboard) {
            if (settings.keyboard.hasOwnProperty(key)) {
                if (!(key.toLowerCase() in keys)) {
                    keys[key.toLowerCase()] = settings.keyboard[key];
                }
            }
        }
        
        var html = "", i;
        var checkkey = function (key) {
            if (key == "n") {
                html += '<tr><td>n</td><td>Next (currently selected channel)</td></tr>';
            } else if (key == "s") {
                html += '<tr><td>s</td><td>Stop (currently selected channel)</td></tr>';
            } else if (keys.hasOwnProperty(key)) {
                if (keys[key].editor && keys[key].editor != effects.my_lock_id) {
                    html += '<tr style="cursor: default; color: grey; font-style: italic;"><td>' + escHTML(key) + '</td><td>(currently being edited)</td></tr>';
                } else {
                    html += '<tr><td>' + escHTML(key) + '</td><td><span style="cursor: pointer; color: blue;" class="effects_keyboard_keybtn" data-key="' + escHTML(key) + '">';
                    
                    if (keys[key].channel && keys[key].channel != "0") {
                        html += '<b>' + escHTML(keys[key].channel) + ':</b> ';
                    }
                    if (keys[key].preset) {
                        html += escHTML(keys[key].preset);
                    } else if (keys[key].lighting) {
                        html += 'Custom lighting sequence';
                        if (keys[key].sound) html += '; sound: ' + keys[key].sound;
                    } else if (keys[key].dimness) {
                        html += 'Dimness: ' + keys[key].dimness;
                        if (keys[key].time) html += ' over ' + keys[key].time + ' seconds';
                    } else if (typeof keys[key].state != "undefined") {
                        switch (keys[key].state) {
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
                    } else {
                        html += '&mdash;&mdash;';
                    }
                    
                    html += '</span></td></tr>';
                }
            } else {
                html += '<tr><td>' + escHTML(key) + '</td><td><span style="cursor: pointer; color: blue;" class="effects_keyboard_keybtn" data-key="' + escHTML(key) + '">&mdash;&mdash;</span></td></tr>';
            }
        };
        
        // a-z
        for (i = 97; i <= 122; i++) {
            checkkey(String.fromCharCode(i));
        }
        // 1-9
        for (i = 49; i <= 57; i++) {
            checkkey(String.fromCharCode(i));
        }
        ["0", "-", "=", "[", "]", "\\", ";", "'", ",", ".", "/"].forEach(checkkey);
        
        $("#effects_keyboard_tbody").html(html);
    },
    
    update_presets: function () {
        $("#effects_preset_timed, #effects_preset_dimmed, #effects_keyboard_editor_channeltimed_preset, #effects_keyboard_editor_channeldimmed_preset").empty();
        
        for (var preset in settings.presets) {
            if (settings.presets.hasOwnProperty(preset)) {
                var option = document.createElement("option");
                option.value = preset;
                option.appendChild(document.createTextNode(preset));
                $("#effects_preset_" + (typeof settings.presets[preset].dimness != "undefined" ? "dimmed" : "timed") + ", #effects_keyboard_editor_channel" + (typeof settings.presets[preset].dimness != "undefined" ? "dimmed" : "timed") + "_preset").append(option);
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

init.push(function () {
    effects.init();
});