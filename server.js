// Haunted House Logistics Server - main node.js server

// node modules
var app = require("http").createServer(handler),
    io = require("socket.io").listen(app),
    fs = require("fs"),
    path = require("path"),
    dns = require("dns"),
    url_module = require("url");

// my modules
var config = require("./config"),
    myutil = require("./modules/myutil"),
    staticserve = require("./modules/staticserve"),
    jsonsettings = require("./modules/jsonsettings");


app.listen(config.PORT);

function handler(req, res) {
    var url = url_module.parse(req.url, true);
    if (req.headers.accept && req.headers.accept == "text/event-stream") {
        if (url.pathname == "/client/stream") {
            serveStream(url, req, res);
        } else {
            myutil.writeError(res, 404);
        }
    } else if (url.pathname.substring(0, 8) == "/static/" || url.pathname.substring(0, config.RESOURCES_DIR.length + 2) == "/" + config.RESOURCES_DIR + "/") {
        staticserve.static(url, req, res);
    } else if (url.pathname.substring(0, config.VIDEO_DIR.length + 2) == "/" + config.VIDEO_DIR + "/" || url.pathname.substring(0, config.SOUND_DIR.length + 2) == "/" + config.SOUND_DIR + "/") {
        staticserve.partial(url, req, res);
    } else if (url.pathname == "/") {
        serveResources(req, res);
    } else if (url.pathname == "/control") {
        serveControl(req, res);
    } else if (url.pathname.substring(0, 7) == "/client") {
        var urlpart = url.pathname.substring(8);
        if (urlpart == "") {
            serveClient(url, req, res);
        } else if (urlpart == "frame") {
            serveClientFrame(url, req, res);
        } else if (urlpart == "addon") {
            staticserve.zipfile(path.join("components", "addon"), req, res);
        } else {
            myutil.writeError(res, 404);
        }
    } else if (url.pathname.substring(0, 8) == "/cameras") {
        var urlpart = url.pathname.substring(9);
        if (urlpart == "viewer") {
            // TODO: make this
            myutil.write(res, "cameras.viewer.html");
        } else if (urlpart == "attacher") {
            // TODO: make this
            myutil.write(res, "cameras.attacher.html");
        } else {
            myutil.writeError(res, 404);
        }
    } else if (url.pathname == "/test") {
        myutil.write(res, "test.html");
    } else {
        myutil.writeError(res, 404);
    }
}

function serveResources(req, res) {
    fs.readdir(config.RESOURCES_DIR, function (err, files) {
        if (err) {
            myutil.writeError(res, 500);
        } else {
            var filelist = [];
            for (var i = 0; i < files.length; i++) {
                if (files[i] != "README") {
                    filelist.push({file: files[i]});
                }
            }
            myutil.write(res, "resources.html", {dir: config.RESOURCES_DIR, files: filelist});
        }
    });
}

var settings = {
    channels: new jsonsettings.SettingsFile("channels.json", config.SETTINGS_DIR),
    keyboard: new jsonsettings.SettingsFile("keyboard.json", config.SETTINGS_DIR),
    presets: new jsonsettings.SettingsFile("presets.json", config.SETTINGS_DIR)
};

function serveControl(req, res) {
    fs.readdir(config.VIDEO_DIR, function (err, files) {
        if (err) {
            myutil.writeError(res, 500);
        } else {
            var videos = myutil.makeFileList(files, true, true);
            var videolist = "";
            var counter = 0;
            for (var video in videos) {
                if (videos.hasOwnProperty(video)) {
                    var extra = "";
                    if (videos[video][0] == "CONTAINS_JSON_DATA_FILE") {
                        videos[video].shift();
                        try {
                            var control = JSON.parse(fs.readFileSync(path.join(config.VIDEO_DIR, video + ".json"), "utf-8"));
                        } catch (err) {
                            console.log("ERROR in serveControl, in CONTAINS_JSON_DATA_FILE...", err);
                        }
                        if (control) {
                            extra += ' data-control="' + myutil.escHTML(JSON.stringify(control)) + '"';
                        }
                    }
                    counter++;
                    if (counter == 1) videolist += "<tr>\n";
                    videolist += '<td><button class="vidbtn" data-vidbtn="/' + myutil.escHTML(config.VIDEO_DIR) + '/' + myutil.escHTML(video) + '" data-formats="' + myutil.escHTML(JSON.stringify(videos[video])) + '"' + extra + '>' + myutil.escHTML(video) + '</button></td>\n';
                    if (counter == 3) {
                        videolist += "</tr>\n";
                        counter = 0;
                    }
                }
            }
            if (counter != 0) videolist += "</tr>";
            
            fs.readdir(config.SOUND_DIR, function (err, files) {
                if (err) {
                    myutil.writeError(res, 500);
                } else {
                    var soundlist = "";
                    var sounds = myutil.makeFileList(files);
                    for (var sound in sounds) {
                        if (sounds.hasOwnProperty(sound)) {
                            soundlist += '<option value="' + myutil.escHTML(sound) + '">' + myutil.escHTML(sound) + '</option>';
                        }
                    }
                    
                    myutil.write(res, "control.html", {videos: videolist, sounds: soundlist, channels: JSON.stringify(settings.channels.data), keyboard: JSON.stringify(settings.keyboard.data), presets: JSON.stringify(settings.presets.data)});
                }
            });
        }
    });
}

// client stuff

var clients = [];

function serveClient(url, req, res) {
    dns.reverse(req.connection.remoteAddress, function (err, domains) {
        var hostname = "";
        if (!err && domains && domains.length > 0) {
            for (var i = 0; i < domains.length; i++) {
                if (domains[i]) {
                    hostname = domains[i];
                    break;
                }
            }
        }
        
        if (url.query && url.query.location && url.query.layout) {
            var name = (url.query.name || hostname).trim();
            var location = url.query.location.trim();
            
            var xval, yval;
            if (url.query.layout == "custom") {
                xval = url.query.layout_x;
                yval = url.query.layout_y;
            } else {
                var split = url.query.layout.split("x");
                xval = split[0];
                yval = split[1];
            }
            if (xval && parseInt(xval, 10) > 0 && parseInt(xval, 10) < 10) {
                xval = parseInt(xval, 10);
            } else {
                xval = 1;
            }
            if (yval && parseInt(yval, 10) > 0 && parseInt(yval, 10) < 10) {
                yval = parseInt(yval, 10);
            } else {
                yval = 1;
            }
            
            var mynum = clients.length;
            console.log("SERVING CLIENT: " + mynum);
            clients.push({
                active: true,
                name: name,
                location: location,
                ip: req.connection.remoteAddress,
                x: xval,
                y: yval,
                frames: {}
            });
            send_client_list();
            
            var iframes = "", x, y;
            for (y = 1; y <= yval; y++) {
                iframes += "            <tr>\n";
                for (x = 1; x <= xval; x++) {
                    iframes += '                <td><iframe src="/client/frame?client=' + mynum + '&amp;x=' + x + '&amp;y=' + y + '" scrolling="no">Loading...</iframe></td>\n';
                }
                iframes += "            </tr>\n";
            }
            
            var d = new Date(), expires = new Date(d.getFullYear() + 1, 0, 1);
            var cookieoptions = "; Path=/; Expires=" + expires.toUTCString();
            
            var td_height = Math.round(100 / yval);
            
            myutil.write(res, "client2.html", {name: name, location: location, closebtn: (xval == 1 && yval == 1 ? false : true), td_height: td_height, iframes: iframes}, {"Set-Cookie": ["name=" + name + cookieoptions, "location=" + location + cookieoptions]});
        } else {
            var cookies = req.headers.cookie ? myutil.parseCookies(req.headers.cookie) : {};
            
            var vars = {hostname: hostname};
            vars.name = cookies.name || "";
            vars.location = cookies.location || "";
            vars.styling = typeof url.query.nostyle == "undefined";
            if (url.query.layout && url.query.layout.trim().search(/^[1-9]x[1-9]$/) != -1) {
                vars.show_layout = false;
                vars.layout = url.query.layout.trim();
            } else {
                vars.show_layout = true;
            }
            
            myutil.write(res, "client.html", vars);
        }
    });
}

function serveClientFrame(url, req, res) {
    if (url.query.client && url.query.x && url.query.y) {
        var mynum = parseInt(url.query.client, 10),
            x = parseInt(url.query.x, 10),
            y = parseInt(url.query.y, 10);
        if (!isNaN(mynum) && clients[mynum] && x && x > 0 && x <= clients[mynum].x && y && y > 0 && y <= clients[mynum].y) {
            if (url.query.channel && (url.query.channel == "0" || url.query.channel in settings.channels.data)) {
                var channel = url.query.channel;
                var details = settings.channels.data[channel] || {type: "timed"};
                
                var writeme = function (soundlist) {
                    myutil.write(res, "clientframe2.html", {mynum: mynum, x: x, y: y, channel: channel.replace(/"/g, '\\"'), channeltype: details.type, sounds: soundlist || false});
                };
                
                if (details.type == "timed") {
                    fs.readdir(config.SOUND_DIR, function (err, files) {
                        if (err) {
                            myutil.writeError(res, 500);
                        } else {
                            var sounds = myutil.makeFileList(files, true);
                            var soundlist = "";
                            for (var sound in sounds) {
                                if (sounds.hasOwnProperty(sound)) {
                                    soundlist += '<audio preload="auto" data-sound="' + myutil.escHTML(sound) + '">';
                                    for (var i = 0; i < sounds[sound].length; i++) {
                                        var ext = sounds[sound][i][0], type = sounds[sound][i][1];
                                        soundlist += '<source src="/' + myutil.escHTML(config.SOUND_DIR) + '/' + myutil.escHTML(sound) + '.' + myutil.escHTML(ext) + '" type="' + myutil.escHTML(type) + '">';
                                    }
                                    soundlist += '</audio>\n';
                                }
                            }
                            
                            writeme(soundlist);
                        }
                    });
                } else {
                    writeme();
                }
            } else {
                var channellist = '<input type="radio" name="channel" value="0" id="channel_radio0" checked><label for="channel_radio0"> Default Channel</label>';
                var counter = 0;
                for (var channel in settings.channels.data) {
                    if (settings.channels.data.hasOwnProperty(channel)) {
                        counter++;
                        var details = settings.channels.data[channel];
                        var css = "";
                        if (details.type && details.type == "toggled") {
                            css = "color: red;";
                        } else if (details.type && details.type == "dimmed") {
                            css = "color: blue;";
                        }
                        channellist += '<br><input type="radio" name="channel" value="' + myutil.escHTML(channel) + '" id="channel_radio' + counter + '"><label for="channel_radio' + counter + '" style="' + css + '"' + (details.description ? ' title="' + myutil.escHTML(details.description) + '"' : '') + '> ' + myutil.escHTML(channel) + '</label>';
                    }
                }
                
                myutil.write(res, "clientframe.html", {mynum: mynum, x: x, y: y, channellist: channellist});
            }
        } else {
            myutil.writeError(res, 404);
        }
    } else {
        myutil.writeError(res, 404);
    }
}

function serveStream(url, req, res) {
    if (typeof url.query.client != "undefined" && url.query.x && url.query.y && typeof url.query.channel != "undefined") {
        var mynum = parseInt(url.query.client, 10),
            x = parseInt(url.query.x, 10),
            y = parseInt(url.query.y, 10),
            channel = url.query.channel;
        if (clients[mynum] && x > 0 && x <= clients[mynum].x && y > 0 && y <= clients[mynum].y && (channel == 0 || channel in settings.channels.data)) {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            });
            
            console.log("SERVING STREAM: " + mynum + ":" + x + "x" + y);
            
            if (!clients[mynum].frames[x]) clients[mynum].frames[x] = {};
            clients[mynum].frames[x][y] = {active: true, res: res, channel: channel};
            
            req.on("timeout", function () {
                console.log("stream: TIMEOUT: " + mynum + ":" + x + "x" + y);
                disconnect(mynum, x, y);
            });
            req.on("error", function () {
                console.log("stream: ERROR: " + mynum + ":" + x + "x" + y);
                disconnect(mynum, x, y);
            });
            req.on("close", function () {
                console.log("stream: CLOSE: " + mynum + ":" + x + "x" + y);
                disconnect(mynum, x, y);
            });
            
            res.write(":\n\n");
            
            send_client_list();
        } else {
            myutil.writeError(res, 404);
        }
    } else {
        myutil.writeError(res, 404);
    }
}

function disconnect(mynum, x, y) {
    console.log("stream DISCONNECT: " + mynum + ":" + x + "x" + y);
    clients[mynum].frames[x][y].active = false;
    if (clients[mynum].frames[x][y].res) {
        clients[mynum].frames[x][y].res.end();
        clients[mynum].frames[x][y].res = null;
    }
    
    var still_active = false;
    for (var xi = 1; xi <= clients[mynum].x; xi++) {
        if (still_active) break;
        if (clients[mynum].frames[xi]) {
            for (var yi = 1; yi <= clients[mynum].y; yi++) {
                if (still_active) break;
                if (clients[mynum].frames[xi][yi]) {
                    if (clients[mynum].frames[xi][yi].active) {
                        still_active = true;
                    }
                } else {
                    // Might still be loading
                    still_active = true;
                }
            }
        } else {
            // Might still be loading
            still_active = true;
        }
    }
    
    if (!still_active) {
        clients[mynum].active = false;
    }
    
    send_client_list();
}

function send_msg(jsonmsg, channel) {
    var msg = jsonmsg ? JSON.stringify(jsonmsg) : null;
    
    for (var i = 0; i < clients.length; i++) {
        if (clients[i] && clients[i].active) {
            for (var x = 1; x <= clients[i].x; x++) {
                if (clients[i].frames[x]) {
                    for (var y = 1; y <= clients[i].y; y++) {
                        var frame = clients[i].frames[x][y];
                        if (frame && frame.active && frame.res && (!channel || frame.channel == channel)) {
                            try {
                                if (msg) {
                                    frame.res.write("data: " + msg.split("\n").join("\ndata: ") + "\n\n");
                                } else {
                                    // Just write a comment to keep the connection alive
                                    frame.res.write(":\n\n");
                                }
                            } catch (err) {
                                // Assume it's disconnected
                                disconnect(i, x, y);
                            }
                        }
                    }
                }
            }
        }
    }
}

setInterval(function () {
    // Keep the connections alive
    send_msg();
}, 30000);

function send_forward(about, data) {
    io.sockets.send(JSON.stringify({
        about: about,
        data: data
    }));
}

function send_client_list() {
    var clientlist = [];
    for (var i = 0; i < clients.length; i++) {
        if (clients[i] && clients[i].active) {
            var client = {
                name: clients[i].name,
                location: clients[i].location,
                ip: clients[i].ip,
                x: clients[i].x,
                y: clients[i].y,
                frames: {}
            };
            for (var x = 1; x <= clients[i].x; x++) {
                if (clients[i].frames[x]) {
                    for (var y = 1; y <= clients[i].y; y++) {
                        var frame = clients[i].frames[x][y];
                        if (frame && frame.active) {
                            if (!client.frames[x]) client.frames[x] = {};
                            client.frames[x][y] = {channel: frame.channel};
                        }
                    }
                }
            }
            clientlist.push(client);
        }
    }
    send_forward("clientlist", clientlist);
}

function send_setting(setting) {
    send_forward("settings", {
        setting: setting,
        settings: settings[setting]
    });
}

io.sockets.on("connection", function (socket) {
    socket.on("message", function (msg) {
        console.log("msg received: " + msg);
        try {
            var data = JSON.parse(msg);
            if (data.about) {
                switch (data.about) {
                    case "effects_cmd":
                        send_msg(data.data, data.data.channel);
                        break;
                    case "settings":
                        settings[data.data.setting] = data.data.settings;
                        settings[data.data.setting].update();
                        send_setting(data.data.setting);
                        break;
                    default:
                        send_forward(data.about, data.data);
                }
            } else {
                console.log("no 'about'");
            }
        } catch (err) {
            console.log("invalid JSON");
        }
    });
    send_client_list();
});