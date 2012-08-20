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


jsonsettings.default_settings_dir = config.SETTINGS_DIR || "settings";

io.configure(function () {
    io.enable("browser client minification");
    io.enable("browser client gzip");
    io.enable("browser client etag");
    io.set("log level", 1);
    io.set("transports", ["websocket", "flashsocket", "htmlfile", "xhr-polling", "jsonp-polling"]);
});

app.listen(config.PORT);

function handler(req, res) {
    var url = url_module.parse(req.url, true);
    if (req.headers.accept && req.headers.accept == "text/event-stream") {
        if (url.pathname == "/client/stream") {
            serveStream(url, req, res);
        } else {
            myutil.writeError(res, 404);
        }
    } else if (url.pathname.substring(0, 8) == "/static/" || url.pathname.substring(0, 11) == "/resources/" || url.pathname.substring(0, 8) == "/videos/" || url.pathname.substring(0, 8) == "/sounds/") {
        var filename = url.pathname.substring(url.pathname.lastIndexOf("/") + 1);
        if (filename.toLowerCase() == "readme") {
            myutil.writeError(res, 404);
        } else {
            var contentDir = url.pathname.substring(1);
            contentDir = contentDir.substring(0, contentDir.indexOf("/"));
            if (contentDir == "resources" && config.RESOURCES_DIR) {
                contentDir = config.RESOURCES_DIR;
            } else if (contentDir == "videos" && config.VIDEO_DIR) {
                contentDir = config.VIDEO_DIR;
            } else if (contentDir == "sounds" && config.SOUND_DIR) {
                contentDir = config.SOUND_DIR;
            }
            staticserve.serve(req, res, filename, contentDir);
        }
    } else if (url.pathname == "/") {
        serveResources(req, res);
    } else if (url.pathname == "/control") {
        serveControl(url, req, res);
    } else if (url.pathname.substring(0, 8) == "/cameras") {
        var urlpart = url.pathname.substring(9);
        if (urlpart == "attacher") {
            serveCamerasAttacher(url, req, res);
        } else if (urlpart == "viewer") {
            serveCamerasViewer(url, req, res);
        } else {
            myutil.writeError(res, 404);
        }
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
    } else if (url.pathname == "/test") {
        myutil.write(res, "test.html");
    } else {
        myutil.writeError(res, 404);
    }
}

function testLocationData(url, req, res, successCallback, failCallback) {
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
        
        if (url.query && myutil.fquery(url.query.location)) {
            var name = (myutil.fquery(url.query.name) || hostname).trim();
            var location = myutil.fquery(url.query.location).trim();
            
            var d = new Date(), expires = new Date(d.getFullYear() + 1, 0, 1);
            var cookieoptions = "; Path=/; Expires=" + expires.toUTCString();
            
            successCallback(name, location, ["name=" + name + cookieoptions, "location=" + location + cookieoptions]);
        } else {
            var cookies = req.headers.cookie ? myutil.parseCookies(req.headers.cookie) : {};
            failCallback(cookies.name || "", cookies.location || "", hostname);
        }
    });
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
            myutil.write(res, "resources.html", {
                dir: config.RESOURCES_DIR,
                files: filelist
            });
        }
    });
}

var settings = {
    channels: new jsonsettings.SettingsFile({filename: "channels.json", onupdate: function () {
        sendSetting("channels");
    }}),
    keyboard: new jsonsettings.SettingsFile({filename: "keyboard.json", onupdate: function () {
        sendSetting("keyboard");
    }}),
    presets: new jsonsettings.SettingsFile({filename: "presets.json", onupdate: function () {
        sendSetting("presets");
    }})
};

function serveControl(url, req, res) {
    var writeme = function (videolist) {
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
                
                myutil.write(res, "control.html", {
                    videos: videolist || false,
                    sounds: soundlist,
                    miniclient: !!(!url.query || typeof url.query.nominiclient == "undefined"),
                    channels: JSON.stringify(settings.channels.data),
                    keyboard: JSON.stringify(settings.keyboard.data),
                    presets: JSON.stringify(settings.presets.data)
                });
            }
        });
    };
    
    if (url.query && typeof url.query.novideo != "undefined") {
        writeme();
    } else {
        fs.readdir(config.VIDEO_DIR, function (err, files) {
            if (err) {
                myutil.writeError(res, 500);
            } else {
                var videos = myutil.makeFileList(files, true);
                var videolist = "";
                var counter = 0;
                for (var video in videos) {
                    if (videos.hasOwnProperty(video)) {
                        var extra = "";
                        if (videos[video].track) {
                            extra += ' data-track="' + myutil.escHTML(videos[video].track) + '"';
                        }
                        if (videos[video].json) {
                            try {
                                var control = JSON.parse(fs.readFileSync(path.join(config.VIDEO_DIR, video + ".json"), "utf-8"));
                            } catch (err) {
                                console.log("ERROR in serveControl, in parsing json for data-control...", err);
                            }
                            if (control) {
                                extra += ' data-control="' + myutil.escHTML(JSON.stringify(control)) + '"';
                            }
                        }
                        counter++;
                        if (counter == 1) videolist += "<tr>\n";
                        videolist += '<td><button type="button" class="vidbtn" data-vidbtn="/' + myutil.escHTML(config.VIDEO_DIR) + '/' + myutil.escHTML(video) + '" data-formats="' + myutil.escHTML(JSON.stringify(videos[video].files)) + '"' + extra + ' style="min-width: 50%;">' + myutil.escHTML(video) + '</button></td>\n';
                        if (counter == 3) {
                            videolist += "</tr>\n";
                            counter = 0;
                        }
                    }
                }
                if (counter != 0) videolist += "</tr>";
                
                writeme(videolist);
            }
        });
    }
}

function serveCamerasAttacher(url, req, res) {
    testLocationData(url, req, res, function (name, location, cookies) {
        myutil.write(res, "cameras.attacher.html", {
            config: JSON.stringify({
                name: name,
                location: location
            })
        }, {"Set-Cookie": cookies});
    }, function (name, location, hostname) {
        myutil.write(res, "cameras.attacher.idform.html", {
            name: name,
            location: location,
            hostname: hostname
        });
    });
}

function serveCamerasViewer(url, req, res) {
    myutil.write(res, "cameras.viewer.html");
}

// client stuff

var clients = [];

function serveClient(url, req, res) {
    testLocationData(url, req, res, function (name, location, cookies) {
        var xval, yval;
        if (myutil.fquery(url.query.layout) == "custom") {
            xval = myutil.fquery(url.query.layout_x, "int");
            yval = myutil.fquery(url.query.layout_y, "int");
        } else {
            var split = myutil.fquery(url.query.layout).split("x");
            xval = parseInt(split[0], 10);
            yval = parseInt(split[1], 10);
        }
        if (!xval || xval < 1 || xval > 9) {
            xval = 1;
        }
        if (!yval || yval < 1 || yval > 9) {
            yval = 1;
        }
        
        var cid = clients.length;
        console.log("SERVING CLIENT: " + cid);
        clients.push({
            active: false,
            name: name,
            location: location,
            ip: req.connection.remoteAddress,
            x: xval,
            y: yval,
            frames: {}
        });
        
        var iframes = "", x, y;
        for (y = 1; y <= yval; y++) {
            iframes += "            <tr>\n";
            for (x = 1; x <= xval; x++) {
                var extra = "";
                if (myutil.fquery(url.query["channel_" + x + "x" + y])) extra += "&channel=" + encodeURIComponent(myutil.fquery(url.query["channel_" + x + "x" + y]));
                iframes += '                <td><iframe src="/client/frame?cid=' + cid + '&amp;x=' + x + '&amp;y=' + y + myutil.escHTML(extra) + '" scrolling="no">Loading...</iframe></td>\n';
            }
            iframes += "            </tr>\n";
        }
        
        var td_height = Math.round(100 / yval);
        
        myutil.write(res, "client2.html", {
            name: name,
            location: location,
            closebtn: (xval == 1 && yval == 1 ? false : true),
            td_height: td_height,
            iframes: iframes
        }, {"Set-Cookie": cookies});
    }, function (name, location, hostname) {
        var vars = {
            name: name,
            location: location,
            hostname: hostname
        };
        vars.styling = !!(url.query && typeof url.query.nostyle == "undefined");
        if (url.query && myutil.fquery(url.query.layout) && myutil.fquery(url.query.layout).trim().search(/^[1-9]x[1-9]$/) != -1) {
            vars.show_layout = false;
            vars.layout = myutil.fquery(url.query.layout).trim();
        } else {
            vars.show_layout = true;
        }
        
        myutil.write(res, "client.html", vars);
    });
}

function serveClientFrame(url, req, res) {
    if (url.query && !isNaN(myutil.fquery(url.query.cid, "int")) && myutil.fquery(url.query.x, "int") && myutil.fquery(url.query.y, "int")) {
        var cid = myutil.fquery(url.query.cid, "int"),
            x = myutil.fquery(url.query.x, "int"),
            y = myutil.fquery(url.query.y, "int");
        if (clients[cid] && x > 0 && x <= clients[cid].x && y > 0 && y <= clients[cid].y) {
            if (myutil.fquery(url.query.channel) && (myutil.fquery(url.query.channel) == "0" || myutil.fquery(url.query.channel) in settings.channels.data)) {
                var channel = myutil.fquery(url.query.channel);
                var details = settings.channels.data[channel] || {type: "timed"};
                
                var writeme = function (soundlist) {
                    var old_prop = false;
                    if (typeof details.dimness != "undefined") {
                        old_prop = '{dimness: ' + details.dimness + '}';
                    } else if (typeof details.state != "undefined") {
                        old_prop = '{state: ' + details.state + '}';
                    }
                    myutil.write(res, "clientframe2.html", {
                        cid: cid, x: x, y: y,
                        channel: channel.replace(/"/g, '\\"'), channeltype: details.type,
                        sounds: soundlist || false,
                        old_prop: old_prop
                    });
                };
                
                if (details.type == "timed") {
                    fs.readdir(config.SOUND_DIR, function (err, files) {
                        if (err) {
                            myutil.writeError(res, 500);
                        } else {
                            var sounds = myutil.makeFileList(files);
                            var soundlist = "";
                            for (var sound in sounds) {
                                if (sounds.hasOwnProperty(sound)) {
                                    soundlist += '<audio preload="auto" data-sound="' + myutil.escHTML(sound) + '">';
                                    for (var i = 0; i < sounds[sound].files.length; i++) {
                                        var ext = sounds[sound].files[i][0];
                                        var type = sounds[sound].files[i][1];
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
                
                myutil.write(res, "clientframe.html", {
                    cid: cid,
                    x: x,
                    y: y,
                    channellist: channellist
                });
            }
        } else {
            myutil.writeError(res, 404);
        }
    } else {
        myutil.writeError(res, 404);
    }
}

function serveStream(url, req, res) {
    if (url.query && !isNaN(myutil.fquery(url.query.cid, "int")) && myutil.fquery(url.query.x, "int") && myutil.fquery(url.query.y, "int") && myutil.fquery(url.query.channel)) {
        var cid = myutil.fquery(url.query.cid, "int"),
            x = myutil.fquery(url.query.x, "int"),
            y = myutil.fquery(url.query.y, "int"),
            channel = url.query.channel;
        if (clients[cid] && x > 0 && x <= clients[cid].x && y > 0 && y <= clients[cid].y && (channel == "0" || channel in settings.channels.data)) {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            });
            
            console.log("SERVING STREAM: " + cid + ":" + x + "x" + y);
            
            clients[cid].active = true;
            if (!clients[cid].frames[x]) clients[cid].frames[x] = {};
            clients[cid].frames[x][y] = {active: true, res: res, channel: channel};
            
            req.on("timeout", function () {
                console.log("stream: TIMEOUT: " + cid + ":" + x + "x" + y);
                disconnect(cid, x, y);
            });
            req.on("error", function () {
                console.log("stream: ERROR: " + cid + ":" + x + "x" + y);
                disconnect(cid, x, y);
            });
            req.on("close", function () {
                console.log("stream: CLOSE: " + cid + ":" + x + "x" + y);
                disconnect(cid, x, y);
            });
            
            res.write(":\n\n");
            
            sendClientList();
        } else {
            myutil.writeError(res, 404);
        }
    } else {
        myutil.writeError(res, 404);
    }
}

function disconnect(cid, x, y) {
    console.log("stream DISCONNECT: " + cid + ":" + x + "x" + y);
    clients[cid].frames[x][y].active = false;
    if (clients[cid].frames[x][y].res) {
        clients[cid].frames[x][y].res.end();
        clients[cid].frames[x][y].res = null;
    }
    
    var still_active = false;
    for (var xi = 1; xi <= clients[cid].x; xi++) {
        if (still_active) break;
        if (clients[cid].frames[xi]) {
            for (var yi = 1; yi <= clients[cid].y; yi++) {
                if (still_active) break;
                if (clients[cid].frames[xi][yi]) {
                    if (clients[cid].frames[xi][yi].active) {
                        still_active = true;
                    }
                }
            }
        }
    }
    
    if (!still_active) {
        clients[cid].active = false;
    }
    
    sendClientList();
}

function sendMsg(jsonmsg, channel) {
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
    sendMsg();
}, 30000);

function sendForward(about, data) {
    io.of("/control").send(JSON.stringify({
        about: about,
        data: data
    }));
}

function sendClientList() {
    var clientlist = [];
    for (var i = 0; i < clients.length; i++) {
        if (clients[i] && clients[i].active) {
            var client = {
                cid: i,
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
    sendForward("clientlist", clientlist);
}

function sendSetting(setting) {
    sendForward("settings", {
        setting: setting,
        settings: settings[setting].data
    });
}

io.of("/control").on("connection", function (socket) {
    socket.on("message", function (message) {
        try {
            var msg = JSON.parse(message);
        } catch (err) {
            console.log("io (/control): invalid JSON");
        }
        if (typeof msg == "object" && msg.about) {
            switch (msg.about) {
                case "effects_cmd":
                    sendMsg(msg.data, msg.data.channel);
                    if (msg.data.command == "play") {
                        if (typeof msg.data.prop.dimness != "undefined") {
                            settings.channels.data[msg.data.channel].dimness = msg.data.prop.dimness;
                            settings.channels.update();
                        } else if (typeof msg.data.prop.state != "undefined") {
                            var state = settings.channels.data[msg.data.channel].state || 0;
                            if (msg.data.prop.state == -1) {
                                state = Number(!state);
                            } else {
                                state = msg.data.prop.state;
                            }
                            settings.channels.data[msg.data.channel].state = state;
                            settings.channels.update();
                        }
                    }
                    break;
                case "settings":
                    settings[msg.data.setting].data = msg.data.settings;
                    settings[msg.data.setting].update();
                    break;
                default:
                    sendForward(msg.about, msg.data);
            }
        } else {
            console.log("io (/control): no 'msg' or 'msg.about'");
        }
    });
    sendClientList();
});

var attachers = [];
var viewers = [];
io.of("/cameras").on("connection", function (socket) {
    // from attacher
    socket.on("attacher init", function (data) {
        var attacherIndex = attachers.length;
        attachers.push({
            name: data.name,
            location: data.location,
            streams: [],
            socket: socket
        });
        socket.set("attacherIndex", attacherIndex, function () {
            socket.emit("ready");
        });
    });
    
    // from viewer
    socket.on("viewer init", function () {
        var viewerIndex = viewers.length;
        viewers.push({
            socket: socket
        });
        sendAttachers();
        socket.set("viewerIndex", viewerIndex, function () {
            socket.emit("ready");
        });
    });
    
    // from attacher
    socket.on("streams", function (data) {
        socket.get("attacherIndex", function (err, attacherIndex) {
            if (typeof attacherIndex == "number" && attachers[attacherIndex] && data && Array.isArray(data)) {
                attachers[attacherIndex].streams = data;
                sendAttachers();
            } else {
                socket.emit("init");
            }
        });
    });
    
    // from viewer
    socket.on("request signal", function (data, callback) {
        socket.get("viewerIndex", function (err, viewerIndex) {
            if (typeof viewerIndex == "number" && viewers[viewerIndex] && data && typeof data.attacherIndex == "number" && attachers[data.attacherIndex] && typeof data.streamIndex == "number" && attachers[data.attacherIndex].streams[data.streamIndex]) {
                console.log("viewer " + viewerIndex + " is requesting stream " + data.streamIndex + " from " _ data.attacherIndex);
                attachers[data.attacherIndex].socket.emit("request signal", {
                    viewerIndex: viewerIndex,
                    streamIndex: data.streamIndex
                });
            } else {
                socket.emit("init");
            }
        });
    });
    
    // from attacher
    socket.on("offer", function (data) {
        socket.get("attacherIndex", function (err, attacherIndex) {
            if (typeof attacherIndex == "number" && attachers[attacherIndex] && data && typeof data.viewerIndex == "number" && viewers[data.viewerIndex] && typeof data.pcIndex == "number" && data.sdp) {
                viewers[data.viewerIndex].socket.emit("offer", {
                    attacherIndex: attacherIndex,
                    pcIndex: data.pcIndex,
                    sdp: data.sdp
                });
            } else {
                socket.emit("init");
            }
        });
    });
    
    // from viewer
    socket.on("answer", function (data) {
        socket.get("viewerIndex", function (err, viewerIndex) {
            if (typeof viewerIndex == "number" && viewers[viewerIndex] && data && typeof data.attacherIndex == "number" && attachers[data.attacherIndex] && typeof data.pcIndex == "number" && data.sdp) {
                attachers[data.attacherIndex].socket.emit("answer", {
                    viewerIndex: viewerIndex,
                    pcIndex: data.pcIndex,
                    sdp: data.sdp
                });
            } else {
                socket.emit("init");
            }
        });
    });
    
    // from attacher
    socket.on("cantidate from attacher", function (data) {
        socket.get("attacherIndex", function (err, attacherIndex) {
            if (typeof attacherIndex == "number" && attachers[attacherIndex] && data && typeof data.viewerIndex == "number" && viewers[data.viewerIndex] && typeof data.pcIndex == "number" && data.label && data.cantidate) {
                viewers[data.viewerIndex].socket.emit("cantidate", {
                    attacherIndex: attacherIndex,
                    pcIndex: data.pcIndex,
                    label: data.label,
                    cantidate: data.cantidate
                });
            } else {
                socket.emit("init");
            }
        });
    });
    
    // from viewer
    socket.on("cantidate from viewer", function (data) {
        socket.get("viewerIndex", function (err, viewerIndex) {
            if (typeof viewerIndex == "number" && viewers[viewerIndex] && data && typeof data.attacherIndex == "number" && attachers[data.attacherIndex] && typeof data.pcIndex == "number" && data.label && data.cantidate) {
                attachers[data.attacherIndex].socket.emit("cantidate", {
                    viewerIndex: viewerIndex,
                    pcIndex: data.pcIndex,
                    label: data.label,
                    cantidate: data.cantidate
                });
            } else {
                socket.emit("init");
            }
        });
    });
    
    try {
        var attacherIndex, viewerIndex;
        socket.get("attacherIndex", function (err, index) {
            attacherIndex = index;
        });
        socket.get("viewerIndex", function (err, index) {
            viewerIndex = index;
        });
        if (typeof attacherIndex != "number" && typeof viewerIndex != "number") throw true;
    } catch (err) {
        // This socket has not yet been initialized (or we ran into an error with the initialization)
        socket.emit("init");
    }
});

function sendAttachers() {
    var attacherList = [];
    for (var i = 0; i < attachers.length; i++) {
        if (attachers[i] && attachers[i].streams) {
            attacherList[i] = {
                name: attachers[i].name,
                location: attachers[i].location,
                streams: attachers[i].streams
            };
        } else {
            attacherList[i] = null;
        }
    }
    
    for (var j = 0; j < viewers.length; j++) {
        if (viewers[j] && viewers[j].socket) {
            viewers[j].socket.emit("attachers", attacherList);
        }
    }
}