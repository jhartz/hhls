var sequences = {
    queue: [],
    running: null,
    starttime: 0,
    currently_editing: null,
    
    init: function () {
        $("#ctrl_sequences > footer button").click(function () {
            if ($(this).hasClass("active")) {
                sequences.toggle("main");
            } else {
                sequences.toggle($(this).attr("data-btn"));
            }
        });
        
        // Load settings
        this.update_channels();
        this.update_presets();
        this.update_sequences();
        
        $("#sequences_form").submit(function (event) {
            event.preventDefault();
            var sequencename = $("input[name=sequences_list]:checked", "#sequences_form").val();
            if (sequencename && settings.sequences[sequencename]) {
                sequences.add(sequencename);
            }
        });
        
        $(document).on("click", ".sequences_queue_content_li", function (event) {
            var pos = parseInt($(this).attr("data-queuepos"), 10);
            if (sequences.queue[pos]) sequences.queue.splice(pos, 1);
            sequences.genqueue();
        });
        
        $(document).on("click", ".sequences_manage_tbody_editbtn", function (event) {
            var sequencename = $(this).attr("data-sequencename");
            if (settings.sequences.hasOwnProperty(sequencename)) {
                sequences.editor_open(sequencename);
            }
        });
        
        $(document).on("click", ".sequences_manage_tbody_deletebtn", function (event) {
            var sequencename = $(this).attr("data-sequencename");
            if (settings.sequences.hasOwnProperty(sequencename)) {
                delete settings.sequences[sequencename];
            }
            conn.sendsetting("sequences");
        });
        
        $("#sequences_manage_addnew").click(function () {
            sequences.editor_open();
        });
        
        $("#sequences_manage_editor_length_help").click(function () {
            alert("Enter the length of this sequence in seconds. All the actions in the sequence must happen during the length. Nothing should still be happening after the length has passed.");
        });
        
        $("#sequences_manage_editor_submitter").click(function () {
            sequences.editor_save();
        });
        
        $("#sequences_manage_editor_canceller").click(function () {
            sequences.editor_cancel();
        });
        
        $("#sequences_manage_editor_new_channel").change(function () {
            var channel = $(this).val(), details = {type: "timed"};
            if (channel != "0") details = settings.channels[channel];
            if (details) {
                $("#sequences_manage_editor_new_timed")[(details.type != "toggled" && details.type != "dimmed") ? "show" : "hide"]();
                $("#sequences_manage_editor_new_toggled")[details.type == "toggled" ? "show" : "hide"]();
                $("#sequences_manage_editor_new_dimmed")[details.type == "dimmed" ? "show" : "hide"]();
            }
        }).change();
    },
    
    toggle: function (newbie, oncomplete) {
        toggle_buttonbox("sequences", newbie, oncomplete);
    },
    
    update_sequences: function () {
        var selected_sequence = $("input[name=sequences_list]:checked", "#sequences_form").val();
        
        var html = '<table><tbody>';
        var counter = 1;
        for (var sequencename in settings.sequences) {
            if (settings.sequences.hasOwnProperty(sequencename)) {
                counter++;
                var details = settings.sequences[sequencename];
                html += '<tr><td valign="top"><input type="radio" id="sequences_list_radio' + counter + '" name="sequences_list" value="' + shared.escHTML(sequencename) + '"></td><td><label for="sequences_list_radio' + counter + '" title="' + shared.escHTML(details.description || sequencename) + '">' + shared.escHTML(sequencename).replace(/_/g, "_<wbr>") + '</label></td></tr>';
            }
        }
        
        html += '</tbody></table>';
        $("#sequences_list").html(html);
        
        // Re-select previously selected sequence
        if (selected_sequence) {
            $("input[name=sequences_list]", "#sequences_form").each(function () {
                if (this.value == selected_sequence) this.checked = true;
            });
        }
        
        // Update the list in the Sequence Manager
        sequences.update_sequences_manage();
    },
    
    update_sequences_manage: function () {
        var html = '';
        for (var sequencename in settings.sequences) {
            if (settings.sequences.hasOwnProperty(sequencename)) {
                html += '<tr>';
                html += '<td>' + shared.escHTML(sequencename) + '</td>';
                html += '<td>' + sequences.timefmt(settings.sequences[sequencename].length) + '</td>';
                html += '<td><span class="lilbutton sequences_manage_tbody_editbtn" data-sequencename="' + shared.escHTML(sequencename) + '">Edit</span></td>';
                html += '<td><span class="lilbutton sequences_manage_tbody_deletebtn" data-sequencename="' + shared.escHTML(sequencename) + '">Delete</span></td>';
            }
        }
        $("#sequences_manage_tbody").html(html);
    },
    
    update_channels: function () {
        // Update the list of channels in the add sequence dropdown
        var selected_channel = $("#sequences_manage_editor_new_channel").val() || "0";
        $("#sequences_manage_editor_new_channel").empty();
        
        var option = document.createElement("option");
        option.value = "0";
        option.appendChild(document.createTextNode("Default Channel"));
        $("#sequences_manage_editor_new_channel").append(option);
        for (var channel in settings.channels) {
            if (settings.channels.hasOwnProperty(channel)) {
                var details = settings.channels[channel];
                var css = "";
                if (details.type && details.type == "toggled") {
                    css = "color: red;";
                } else if (details.type && details.type == "dimmed") {
                    css = "color: blue;";
                }
                option = document.createElement("option");
                option.value = channel;
                option.setAttribute("style", css);
                option.setAttribute("title", details.description || channel);
                option.appendChild(document.createTextNode(channel));
                $("#sequences_manage_editor_new_channel").append(option);
            }
        }
        
        // Re-select previously selected channel
        $("#sequences_manage_editor_new_channel").val(selected_channel);
    },
    
    update_presets: function () {
        $("#sequences_manage_editor_new_timed_preset, #sequences_manage_editor_new_dimmed_preset").empty();
        
        for (var preset in settings.presets) {
            if (settings.presets.hasOwnProperty(preset)) {
                var option = document.createElement("option");
                option.value = preset;
                option.appendChild(document.createTextNode(preset));
                $("#sequences_manage_editor_new_" + (typeof settings.presets[preset].dimness != "undefined" ? "dimmed" : "timed") + "_preset").append(option);
            }
        }
    },
    
    editor_open: function (sequencename) {
        blockers.sequences_manage_editor = "Please finish editing the sequence before exiting.";
        
        var details = {};
        if (sequencename && settings.sequences[sequencename]) details = settings.sequences[sequencename];
        if (!details.sequence) details.sequence = [];
        sequences.currently_editing = sequencename || "";
        
        $("#sequences_manage_editor_name").val(sequencename || "");
        $("#sequences_manage_editor_length").val(details.length || "10");
        
        var html = '';
        for (var i = 0; i < details.sequence.length; i++) {
            html += '<tr><td>' + details.sequence[i].time + '</td><td>' + controlcmdinfo(details.sequence[i]) + '</td></tr>';
        }
        if (html == '') html = '<tr><td colspan="2">&nbsp;</td></tr>';
        $("#sequences_manage_editor_sequence").html(html);
        
        this.toggle("manage", function () {
            $("#sequences_manage_editor").fadeIn();
        });
    },
    
    editor_save: function () {
        var name = $.trim($("#sequences_manage_editor_name").val());
        var length = Number($("#sequences_manage_editor_length").val());
        if (name.replace(/ /g, "").length < 2) {
            alert("Please specify a name");
            return;
        }
        if (settings.sequences.hasOwnProperty(name) && name != sequences.currently_editing) {
            alert("ERROR: Name already in use.");
            return;
        }
        if (!(/^[a-zA-Z]/.test(name))) {
            alert("ERROR: Name must start with a letter.");
            return;
        }
        if (isNaN(length) || length <= 0) {
            alert("ERROR: Invalid length.");
            return;
        }
        
        // If we're still here, save it
        if (name != sequences.currently_editing && settings.sequences.hasOwnProperty(sequences.currently_editing)) {
            delete settings.sequences[sequences.currently_editing];
        }
        sequences.currently_editing = null;
        
        var sequence = [];
        settings.sequences[name] = {
            length: length,
            sequence: sequence
        };
        conn.sendsetting("sequences");
        
        $("#sequences_manage_editor").fadeOut();
        blockers.sequences_manage_editor = null;
    },
    
    editor_cancel: function () {
        $("#sequences_manage_editor").fadeOut();
        blockers.sequences_manage_editor = null;
    },
    
    timefmt: function (seconds) {
        seconds = Number(seconds);
        if (isNaN(seconds)) return NaN;
        var secondpart = seconds - parseInt(seconds, 10);
        seconds = parseInt(seconds, 10);
        var minutes = Math.floor(seconds / 60);
        seconds = (seconds - minutes * 60).toString();
        if (seconds.length == 1) seconds = "0" + seconds;
        var tenths = Math.floor(secondpart * 10).toString();
        return minutes + ":" + seconds + "." + tenths;
    },
    
    add: function (sequencename) {
        sequences.queue.push(sequencename);
        sequences.run();
    },
    
    run: function () {
        if (sequences.queue.length > 0 && sequences.running === null) {
            sequences.starttime = (new Date()).getTime();
            var sequencename = sequences.queue.shift();
            var details = settings.sequences[sequencename];
            $("#sequences_playing_title").text(sequencename);
            $("#sequences_playing_time").text("0:00.0 / " + sequences.timefmt(details.length));
            $("#sequences_playing_progress").css("width", "0%");
            $("#sequences_playing").show();
            for (var i = 0; i < details.sequence.length; i++) {
                sequences.setup(details.sequence[i]);
            }
            sequences.running = setInterval(function () {
                var elapsed = ((new Date()).getTime() - sequences.starttime) / 1000;
                $("#sequences_playing_time").text(sequences.timefmt(elapsed) + " / " + sequences.timefmt(details.length));
                var percent = Math.min((elapsed / details.length) * 100, 100);
                $("#sequences_playing_progress").css("width", percent + "%");
            }, 100);
            setTimeout(function () {
                clearInterval(sequences.running);
                sequences.running = null;
                sequences.run();
            }, parseInt(details.length * 1000, 10));
        }
        
        sequences.genqueue();
        if (sequences.running === null) $("#sequences_playing").hide();
    },
    
    genqueue: function () {
        if (sequences.queue.length > 0) {
            $("#sequences_queue_content").empty();
            for (var j = 0; j < sequences.queue.length; j++) {
                var li = document.createElement("li");
                li.className = "sequences_queue_content_li strikeonhover";
                li.style.cursor = "pointer";
                li.setAttribute("data-queuepos", j);
                li.appendChild(document.createTextNode(sequences.queue[j]));
                $("#sequences_queue_content").append(li);
            }
            $("#sequences_queue").show();
        } else {
            $("#sequences_queue").hide();
        }
    },
    
    setup: function (details) {
        setTimeout(function () {
            controlcmd(details);
        }, parseInt(details.time * 1000, 10));
    }
};

init.push(function () {
    sequences.init();
});

onConnection.push(function () {
    sequences.toggle("main");
});
onNoConnection.push(function () {
    sequences.toggle("waiting");
});

settings_onupdate.channels.push(function () {
    sequences.update_channels();
});
settings_onupdate.presets.push(function () {
    sequences.update_presets();
});
settings_onupdate.sequences.push(function () {
    sequences.update_sequences();
});