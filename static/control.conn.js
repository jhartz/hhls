var conn = {
    socket: null,
    used_channels: {},
    
    init: function () {
        if (typeof JSON == "undefined" || typeof JSON.stringify != "function") {
            conn.showmsg("ERROR: Your browser does not support JSON.\nPlease upgrade to a more modern browser.");
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
                            if (typeof video != "undefined") video.adjust();
                        });
                    }, 1000);
                }
            });
            */
            
            $("#client_details").click(function () {
                $(this).attr("data-cid", "");
                $(this).fadeOut();
            });
            
            $(document).on("click", "span.clientitem", function () {
                try {
                    var data = $.parseJSON($(this).attr("data-json"));
                    if (data) {
                        $("#client_details").attr("data-cid", data.cid);
                        $("#client_details_name").text(data.name);
                        $("#client_details_location").text(data.location);
                        $("#client_details_ip").text(data.ip);
                        $("#client_details_layouter").empty();
                        var channelcount = 0;
                        for (var y = 1; y <= data.y; y++) {
                            var html = '<tr>';
                            for (var x = 1; x <= data.x; x++) {
                                channelcount++;
                                var channel = "&nbsp;"
                                if (data.frames[x] && data.frames[x][y] && data.frames[x][y].channel) {
                                    channel = shared.escHTML(data.frames[x][y].channel);
                                    if (channel == "0") channel = "Default";
                                }
                                html += '<td>' + channel + '</td>';
                            }
                            html += '</tr>';
                            $("#client_details_layouter").append(html);
                        }
                        $("#client_details_channel_plural").css("display", channelcount == 1 ? "none" : "");
                        $("#client_details").fadeIn();
                    }
                } catch (err) {}
            });
            
            conn.socket = io.connect("/control");
            
            conn.socket.on("connecting", function () {
                conn.showmsg("Connecting to server...");
            });
            conn.socket.on("connect", function () {
                conn.showmsg("Connected to server");
                conn.onConnection();
                // In case this gets shown again (if there's an error, disconnect, etc.)
                $(".statuser").text("Server connection necessary");
            });
            conn.socket.on("connect_failed", function () {
                conn.showmsg("Failed to establish connection to server");
                conn.onNoConnection();
            });
            
            conn.socket.on("message", function (message) {
                try {
                    var msg = $.parseJSON(message);
                } catch (err) {
                    conn.showmsg("ERROR: Invalid JSON received from server:\n" + message + "\n\n" + err);
                }
                try {
                    if (msg && msg.about) {
                        switch (msg.about) {
                            case "clientlist":
                                conn.showlist(msg.data);
                                break;
                            case "settings":
                                settings[msg.data.setting] = msg.data.settings;
                                if (settings_onupdate[msg.data.setting]) {
                                    for (var i = 0; i < settings_onupdate[msg.data.setting].length; i++) {
                                        if (typeof settings_onupdate[msg.data.setting][i] == "function") {
                                            settings_onupdate[msg.data.setting][i]();
                                        }
                                    }
                                }
                                break;
                            default:
                                conn.showmsg("ERROR: Invalid message received from server:\n" + message);
                        }
                    } else {
                        conn.showmsg("ERROR: Invalid data received from server:\n" + message);
                    }
                } catch (err) {
                    conn.showmsg("Error processing message from server:\n" + message + "\n\n" + err);
                }
            });
            
            conn.socket.on("disconnect", function () {
                conn.showmsg("Disconnected from server");
                conn.onNoConnection();
            });
            conn.socket.on("error", function () {
                conn.showmsg("Error connecting to server");
                conn.onNoConnection();
            });
            conn.socket.on("reconnect", function () {
                conn.showmsg("Reconnected to server");
                conn.onConnection();
            });
            conn.socket.on("reconnecting", function () {
                conn.showmsg("Reconnecting to server...");
                conn.onNoConnection();
            });
            conn.socket.on("reconnect_failed", function () {
                conn.showmsg("Failed to reconnect to server");
                conn.onNoConnection();
            });
        }
    },
    
    onConnection: function () {
        for (var i = 0; i < onConnection.length; i++) {
            if (typeof onConnection[i] == "function") {
                onConnection[i]();
            }
        }
    },
    
    onNoConnection: function () {
        for (var i = 0; i < onNoConnection.length; i++) {
            if (typeof onNoConnection[i] == "function") {
                onNoConnection[i]();
            }
        }
    },
    
    sendmsg: function (jsonmsg) {
        var msg = JSON.stringify(jsonmsg);
        if (conn.socket && conn.socket.send) {
            conn.socket.send(msg);
        }
    },
    
    sendsetting: function (setting) {
        conn.sendmsg({
            about: "settings",
            data: {
                setting: setting,
                settings: settings[setting]
            }
        });
    },
    
    showmsg: function (msg) {
        $("#client_title").text("Server Connection");
        $("#client_list").html(shared.escHTML(msg, true));
        if ($("#client_details").attr("data-cid")) {
            $("#client_details").click();
        }
        
        resizer();
    },
    
    showlist: function (list) {
        $("#client_title > span").text("Connected Clients");
        conn.used_channels = {};
        if (list.length > 0) {
            var html = '';
            for (var i = 0; i < list.length; i++) {
                for (var y = 1; y <= list[i].y; y++) {
                    for (var x = 1; x <= list[i].x; x++) {
                        if (list[i].frames[x] && list[i].frames[x][y] && list[i].frames[x][y].channel) {
                            channel = list[i].frames[x][y].channel;
                            if (!conn.used_channels.hasOwnProperty(channel)) {
                                conn.used_channels[channel] = 1;
                            } else {
                                conn.used_channels[channel] += 1;
                            }
                        }
                    }
                }
                if (html) html += ', ';
                html += '<span class="clientitem lilbutton" style="white-space: nowrap;" title="' + shared.escHTML(list[i].location) + ' \n' + shared.escHTML(list[i].ip) + '" data-cid="' + shared.escHTML(list[i].cid) + '" data-json="' + shared.escHTML(JSON.stringify(list[i])) + '">' + shared.escHTML(list[i].name) + '</span>';
            }
            $("#client_list").html(html);
            if ($("#client_details").attr("data-cid")) {
                var cid = $("#client_details").attr("data-cid");
                var done = false;
                $(".clientitem").each(function () {
                    if (!done && $(this).attr("data-cid") == cid) {
                        $(this).click();
                        done = true;
                    }
                });
                if (!done) {
                    $("#client_details").click();
                }
            }
        } else {
            var addr = window.location.protocol + "//" + window.location.hostname;
            if (window.location.port) addr += ":" + window.location.port;
            addr += "/client";
            $("#client_list").html('No clients connected!<br>Direct your clients to ' + shared.escHTML(addr));
        }
        
        effects.update_channelman();
        resizer();
    }
};

init.push(function () {
    conn.init();
});