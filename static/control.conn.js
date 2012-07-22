var conn = {
    socket: null,
    
    init: function () {
        if (typeof JSON == "undefined" || typeof JSON.stringify != "function" || typeof Array.prototype.map != "function") {
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
                            if (typeof video != "undefined") video.adjust();
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
                effects.toggle("controls");
                // In case this gets shown again (if there's an error, disconnect, etc.)
                $("#effects_statuser").text("Server connection necessary");
            });
            this.socket.on("connect_failed", function () {
                conn.showmsg("Failed to establish connection to server");
                effects.toggle("waiting");
            });
            
            this.socket.on("message", function (message) {
                try {
                    var msg = $.parseJSON(message);
                    if (msg && msg.about) {
                        switch (msg.about) {
                            case "clientlist":
                                conn.showlist(msg.data);
                                break;
                            case "settings":
                                settings[msg.data.setting] = msg.data.settings;
                                if (effects["update_" + msg.data.setting]) effects["update_" + msg.data.setting]();
                                break;
                            default:
                                conn.showmsg("ERROR: Invalid message received from server:\n" + message);
                        }
                    } else {
                        conn.showmsg("ERROR: Invalid data received from server:\n" + message);
                    }
                } catch (err) {
                    conn.showmsg("ERROR: Invalid JSON received from server:\n" + message);
                }
            });
            
            this.socket.on("disconnect", function () {
                conn.showmsg("Disconnected from server");
                effects.toggle("waiting");
            });
            conn.socket.on("error", function () {
                conn.showmsg("Error connecting to server");
                effects.toggle("waiting");
            });
            conn.socket.on("reconnect", function () {
                conn.showmsg("Reconnected to server");
                effects.toggle("controls");
            });
            conn.socket.on("reconnecting", function () {
                conn.showmsg("Reconnecting to server...");
                effects.toggle("waiting");
            });
            conn.socket.on("reconnect_failed", function () {
                conn.showmsg("Failed to reconnect to server");
                effects.toggle("waiting");
            });
        }
    },
    
    sendmsg: function (jsonmsg) {
        var msg = JSON.stringify(jsonmsg);
        if (this.socket && this.socket.send) {
            this.socket.send(msg);
        }
    },
    
    send_setting: function (setting) {
        this.sendmsg({
            about: "settings",
            data: {
                setting: setting,
                settings: settings[setting]
            }
        });
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

init.push(function () {
    conn.init();
});