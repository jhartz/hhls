// Haunted House Logistics Server - main node.js server

// node modules
var app = require("http").createServer(handler),
    fs = require("fs"),
    path = require("path"),
    dns = require("dns"),
    url_module = require("url");

// required modules
var mime = require("mime"),
    io = require("socket.io").listen(app);

// my modules
var config = require("./config"),
    shared = require("./static/shared"),
    writer = require("./modules/writer"),
    staticserve = require("./modules/staticserve"),
    jsonsettings = require("./modules/jsonsettings");


// Default config
if (!config.PORT) config.PORT = process.env.PORT || 8080;
if (typeof config.debug != "boolean") config.debug = !!(process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() == "development");
config.VIDEOS_DIR = pickExistingDir(config.VIDEOS_DIR, "content/videos");
config.SOUNDS_DIR = pickExistingDir(config.SOUNDS_DIR, "content/sounds");
config.RESOURCES_DIR = pickExistingDir(config.RESOURCES_DIR, "content/resources");
config.SETTINGS_DIR = pickExistingDir(config.SETTINGS_DIR, "content/settings");

// These aren't normally set in config file
config.TEMPLATES_DIR = pickExistingDir(config.TEMPLATES_DIR, "templates");
config.STATIC_DIR = pickExistingDir(config.STATIC_DIR, "static");
config.COMPONENTS_DIR = pickExistingDir(config.COMPONENTS_DIR, "components");

// Update module config
writer.setTemplateDir(config.TEMPLATES_DIR);
jsonsettings.default_settings_dir = config.SETTINGS_DIR;

io.configure(function () {
    io.enable("browser client minification");
    io.enable("browser client gzip");
    io.enable("browser client etag");
    io.set("log level", 1);
    io.set("transports", ["websocket", "flashsocket", "htmlfile", "xhr-polling", "jsonp-polling"]);
});

console.log("Starting HHLS server on port " + config.PORT);
app.listen(config.PORT);

function handler(req, res) {
    var url = url_module.parse(req.url, true);
    
    // Assuming /dir/file
    // If we have "/mydir/mysubdir/myfile", dir=="mydir" and file=="mysubdir/myfile"
    var dir = url.pathname.substring(1);
    if (dir.indexOf("/") != -1) dir = dir.substring(0, dir.indexOf("/"));
    var file = url.pathname.substring(dir.length + 2);
    
    // If it's looking for an event stream
    if (req.headers.accept && req.headers.accept == "text/event-stream") {
        if (dir == "client" && file == "stream") {
            serveStream(url, req, res);
        } else {
            writer.writeError(res, 406);
        }
    // All of our static content
    } else if (dir == "static" || dir == "resources" || dir == "videos" || dir == "sounds") {
        // No access to any URL containing ".." or any README files
        if (("/" + file + "/").indexOf("/../") != -1 || path.basename(file).toLowerCase() == "readme") {
            writer.writeError(res, 404);
        } else {
            staticserve.serve(req, res, file, config[dir.toUpperCase() + "_DIR"]);
        }
    // The home page
    } else if (dir == "") {
        serveResources(req, res);
    // The /control stuff
    } else if (dir == "control" && file == "") {
        serveControl(url, req, res);
    // The /client stuff
    } else if (dir == "client") {
        switch (file) {
            case "":
                serveClient(url, req, res);
                break;
            case "frame":
                serveClientFrame(url, req, res);
                break;
            case "addon.xpi":
                staticserve.zipfile(req, res, path.join(config.COMPONENTS_DIR, "addon"), "application/x-xpinstall");
                break;
            default:
                writer.writeError(res, 404);
        }
    // The /cameras stuff
    } else if (dir == "cameras") {
        switch (file) {
            case "attacher":
                serveCamerasAttacher(url, req, res);
                break;
            case "viewer":
                serveCamerasViewer(url, req, res);
                break;
            default:
                writer.writeError(res, 404);
        }
    // Our lovely test file
    } else if (dir == "test" && file == "") {
        writer.write(res, "test.html");
    // Anything else
    } else {
        writer.writeError(res, 404);
    }
}

/*
    UTIL FUNCTIONS
*/

// Pick the first directory from the arguments that exists, automatically resolving relative directories from the location of the script
function pickExistingDir() {
    var dir = "";
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i]) {
            dir = path.resolve(__dirname, arguments[i]);
            if (fs.existsSync(dir)) break;
        }
    }
    return dir;
}

// "Format query" - to test/format a member of require("url").parse(..., true).query
function fquery(query, helper) {
    var formatter = function (endstring) {
        if (typeof helper == "string") {
            switch (helper.toLowerCase()) {
                case "int":
                    return parseInt(endstring, 10);
                    break;
                case "num":
                case "number":
                    return Number(endstring);
                    break;
                default:
                    return endstring;
            }
        } else if (typeof helper == "function") {
            return helper(endstring);
        } else {
            return endstring;
        }
    };
    
    if (Array.isArray(query)) {
        var real = "";
        query.forEach(function (item) {
            if (!real && item) real = item;
        });
        if (!real) real = query[0];
        return formatter(real);
    } else if (typeof query == "string") {
        return formatter(query);
    } else {
        return formatter("");
    }
}

function testLocationData(url, req, res, successCallback, failCallback) {
    //dns.reverse(req.connection.remoteAddress, function (err, domains) {
        var hostname = "";
        /*
        if (!err && domains && domains.length > 0) {
            for (var i = 0; i < domains.length; i++) {
                if (domains[i]) {
                    hostname = domains[i];
                    break;
                }
            }
        }
        */
        
        if (url.query && fquery(url.query.location)) {
            var name = (fquery(url.query.name) || hostname).trim();
            var location = fquery(url.query.location).trim();
            
            var d = new Date(), expires = new Date(d.getFullYear() + 1, 0, 1);
            var cookieoptions = "; Path=/; Expires=" + expires.toUTCString();
            
            successCallback(name, location, ["name=" + name + cookieoptions, "location=" + location + cookieoptions]);
        } else {
            var cookies = req.headers.cookie ? shared.parseCookies(req.headers.cookie) : {};
            failCallback(cookies.name || "", cookies.location || "", hostname);
        }
    //});
}

function makeFileList(files, separateMetadata, includeReadme) {
    var fileList = {};
    for (var i = 0; i < files.length; i++) {
        if (includeReadme || files[i] != "README") {
            var bname = files[i].indexOf(".") != -1 ? files[i].substring(0, files[i].lastIndexOf(".")) : files[i];
            var ext = files[i].indexOf(".") != -1 ? files[i].substring(files[i].lastIndexOf(".") + 1) : "";
            if (!fileList[bname]) fileList[bname] = {};
            if (!fileList[bname].files) fileList[bname].files = [];
            if (separateMetadata && ext.toLowerCase() == "json") {
                fileList[bname].json = true;
            } else if (separateMetadata && ext.toLowerCase() == "vtt") {
                fileList[bname].track = "vtt";
            } else {
                fileList[bname].files.push([ext, mime.lookup(ext)]);
            }
        }
    }
    return fileList;
}

/*
    SERVE FUNCTIONS
*/

function serveResources(req, res) {
    fs.readdir(config.RESOURCES_DIR, function (err, files) {
        if (err) {
            writer.writeError(res, 500);
        } else {
            var filelist = [];
            for (var i = 0; i < files.length; i++) {
                if (files[i] != "README") {
                    filelist.push({file: files[i]});
                }
            }
            writer.write(res, "resources.html", {files: filelist});
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
    }}),
    sequences: new jsonsettings.SettingsFile({filename: "sequences.json", onupdate: function () {
        sendSetting("sequences");
    }})
};

function serveControl(url, req, res) {
    var writeme = function (videolist) {
        fs.readdir(config.SOUNDS_DIR, function (err, files) {
            if (err) {
                writer.writeError(res, 500);
            } else {
                var soundlist = "";
                var sounds = makeFileList(files);
                for (var sound in sounds) {
                    if (sounds.hasOwnProperty(sound)) {
                        soundlist += '<option value="' + shared.escHTML(sound) + '">' + shared.escHTML(sound) + '</option>';
                    }
                }
                
                writer.write(res, "control.html", {
                    videos: videolist || false,
                    sounds: soundlist,
                    miniclient: !!(!url.query || typeof url.query.nominiclient == "undefined"),
                    channels: JSON.stringify(settings.channels.data),
                    keyboard: JSON.stringify(settings.keyboard.data),
                    presets: JSON.stringify(settings.presets.data),
                    sequences: JSON.stringify(settings.sequences.data)
                });
            }
        });
    };
    
    if (url.query && typeof url.query.novideo != "undefined") {
        writeme();
    } else {
        fs.readdir(config.VIDEOS_DIR, function (err, files) {
            if (err) {
                writer.writeError(res, 500);
            } else {
                var videos = makeFileList(files, true);
                var videolist = "";
                var counter = 0;
                for (var video in videos) {
                    if (videos.hasOwnProperty(video)) {
                        var extra = "";
                        if (videos[video].track) {
                            extra += ' data-track="' + shared.escHTML(videos[video].track) + '"';
                        }
                        if (videos[video].json) {
                            try {
                                var control = JSON.parse(fs.readFileSync(path.join(config.VIDEOS_DIR, video + ".json"), "utf-8"));
                            } catch (err) {
                                console.log("ERROR in serveControl, in parsing json for data-control...", err);
                            }
                            if (control) {
                                extra += ' data-control="' + shared.escHTML(JSON.stringify(control)) + '"';
                            }
                        }
                        counter++;
                        if (counter == 1) videolist += "<tr>\n";
                        videolist += '<td><button type="button" class="vidbtn" data-vidbtn="/videos/' + shared.escHTML(video) + '" data-formats="' + shared.escHTML(JSON.stringify(videos[video].files)) + '"' + extra + ' style="min-width: 50%;">' + shared.escHTML(video) + '</button></td>\n';
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
        writer.write(res, "cameras.attacher.html", {
            config: JSON.stringify({
                name: name,
                location: location
            })
        }, {"Set-Cookie": cookies});
    }, function (name, location, hostname) {
        writer.write(res, "cameras.attacher.idform.html", {
            name: name,
            location: location,
            hostname: hostname
        });
    });
}

function serveCamerasViewer(url, req, res) {
    writer.write(res, "cameras.viewer.html");
}

// client stuff

var clients = [];

function serveClient(url, req, res) {
    testLocationData(url, req, res, function (name, location, cookies) {
        var xval, yval;
        if (fquery(url.query.layout) == "custom") {
            xval = fquery(url.query.layout_x, "int");
            yval = fquery(url.query.layout_y, "int");
        } else {
            var split = fquery(url.query.layout).split("x");
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
        if (config.debug) console.log("SERVING CLIENT: " + cid);
        clients.push({
            active: false,
            name: name,
            location: location,
            ip: req.connection.remoteAddress,
            x: xval,
            y: yval,
            frames: {}
        });
        
        var calc = function (prop, val) {
            return prop + ": -webkit-calc(" + val + "); " + prop + ": -moz-calc(" + val + "); " + prop + ": calc(" + val + ");";
        };
        
        var iframes = [], x, y;
        for (y = 1; y <= yval; y++) {
            for (x = 1; x <= xval; x++) {
                var iframe = {};
                var extra = "";
                ["channel", "controller", "controller_exec"].forEach(function (item) {
                    if (fquery(url.query[item + "_" + x + "x" + y])) {
                        extra += "&" + item + "=" + encodeURIComponent(fquery(url.query[item + "_" + x + "x" + y]));
                    }
                });
                iframe.cid = cid;
                iframe.x = x;
                iframe.y = y;
                iframe.extra = extra;
                iframe.top = "(100% - 20px) / " + yval + " * " + (y - 1) + " + 20px";
                iframe.height = "(100% - 20px) / " + yval + " - 2px";
                iframe.left = "100% / " + xval + " * " + (x - 1);
                iframe.width = "100% / " + xval + " - 2px";
                iframe.borderradius = false;
                if (url.query && typeof url.query.roundedbottom != "undefined" && y == yval) {
                    if (x == 1 && xval == 1) iframe.borderradius = "0 0 9px 9px";
                    else if (x == 1) iframe.borderradius = "0 0 0 9px";
                    else if (x == xval) iframe.borderradius = "0 0 9px 0";
                }
                iframes.push(iframe);
            }
        }
        
        writer.write(res, "client2.html", {
            name: name,
            location: location,
            closebtn: !(xval == 1 && yval == 1),
            iframes: iframes
        }, {"Set-Cookie": cookies});
    }, function (name, location, hostname) {
        var vars = {
            name: name,
            location: location,
            hostname: hostname,
            styling: !(url.query && typeof url.query.nostyle != "undefined"),
            roundedbottom: (url.query && typeof url.query.roundedbottom != "undefined")
        };
        if (url.query && fquery(url.query.layout) && fquery(url.query.layout).trim().search(/^[1-9]x[1-9]$/) != -1) {
            vars.layout = fquery(url.query.layout).trim();
        }
        
        writer.write(res, "client.html", vars);
    });
}

function serveClientFrame(url, req, res) {
    if (url.query && !isNaN(fquery(url.query.cid, "int")) && fquery(url.query.x, "int") && fquery(url.query.y, "int")) {
        var cid = fquery(url.query.cid, "int"),
            x = fquery(url.query.x, "int"),
            y = fquery(url.query.y, "int");
        if (clients[cid] && x > 0 && x <= clients[cid].x && y > 0 && y <= clients[cid].y) {
            if (fquery(url.query.channel) && (fquery(url.query.channel) == "0" || fquery(url.query.channel) in settings.channels.data)) {
                var channel = fquery(url.query.channel);
                var details = settings.channels.data[channel] || {type: "timed"};
                
                var writeme = function (soundlist) {
                    var old_prop = false;
                    if (typeof details.dimness != "undefined") {
                        old_prop = '{dimness: ' + details.dimness + '}';
                    } else if (typeof details.state != "undefined") {
                        old_prop = '{state: ' + details.state + '}';
                    }
                    
                    var controller = null, controller_exec = null;
                    if (fquery(url.query.use_controller) != "no") {
                        controller = fquery(url.query.controller);
                        controller_exec = fquery(url.query.controller_exec);
                    }
                    
                    writer.write(res, "clientframe2.html", {
                        cid: cid, x: x, y: y,
                        channel_js: JSON.stringify(channel),
                        channeltype_js: JSON.stringify(details.type),
                        controller: JSON.stringify(controller),
                        controller_exec: JSON.stringify(controller_exec),
                        old_prop: old_prop,
                        sounds: soundlist || false,
                        channel: channel == "0" ? "Default Channel" : channel,
                        channeltype: details.type
                    });
                };
                
                if (details.type == "timed") {
                    fs.readdir(config.SOUNDS_DIR, function (err, files) {
                        if (err) {
                            writer.writeError(res, 500);
                        } else {
                            var sounds = makeFileList(files);
                            var soundlist = "";
                            for (var sound in sounds) {
                                if (sounds.hasOwnProperty(sound)) {
                                    soundlist += '<audio preload="auto" data-sound="' + shared.escHTML(sound) + '">';
                                    for (var i = 0; i < sounds[sound].files.length; i++) {
                                        var ext = sounds[sound].files[i][0];
                                        var type = sounds[sound].files[i][1];
                                        soundlist += '<source src="/sounds/' + shared.escHTML(sound) + '.' + shared.escHTML(ext) + '" type="' + shared.escHTML(type) + '">';
                                    }
                                    soundlist += '</audio>\n';
                                }
                            }
                            if (!soundlist) soundlist = "none";
                            
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
                        channellist += '<br><input type="radio" name="channel" value="' + shared.escHTML(channel) + '" id="channel_radio' + counter + '"><label for="channel_radio' + counter + '" style="' + css + '"' + (details.description ? ' title="' + shared.escHTML(details.description) + '"' : '') + '> ' + shared.escHTML(channel) + '</label>';
                    }
                }
                
                writer.write(res, "clientframe.html", {
                    cid: cid,
                    x: x,
                    y: y,
                    channellist: channellist
                });
            }
        } else {
            writer.writeError(res, 404);
        }
    } else {
        writer.writeError(res, 404);
    }
}

function serveStream(url, req, res) {
    if (url.query && !isNaN(fquery(url.query.cid, "int")) && fquery(url.query.x, "int") && fquery(url.query.y, "int") && fquery(url.query.channel)) {
        var cid = fquery(url.query.cid, "int"),
            x = fquery(url.query.x, "int"),
            y = fquery(url.query.y, "int"),
            channel = url.query.channel;
        if (clients[cid] && x > 0 && x <= clients[cid].x && y > 0 && y <= clients[cid].y && (channel == "0" || channel in settings.channels.data)) {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            });
            
            if (config.debug) console.log("SERVING STREAM: " + cid + ":" + x + "x" + y);
            
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
            writer.writeError(res, 404);
        }
    } else {
        writer.writeError(res, 404);
    }
}

function disconnect(cid, x, y) {
    if (config.debug) console.log("stream DISCONNECT: " + cid + ":" + x + "x" + y);
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
                    if (msg.data && msg.data.channel) {
                        sendMsg(msg.data, msg.data.channel);
                        if (msg.data.command && msg.data.command == "effect" && msg.data.prop) {
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
                    }
                    break;
                case "settings":
                    if (settings[msg.data.setting]) {
                        settings[msg.data.setting].data = msg.data.settings;
                        settings[msg.data.setting].update();
                    } else {
                        console.log("io (/control): invalid setting");
                    }
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
    socket.on("attacher init", function (msg) {
        var attacherIndex = attachers.length;
        attachers.push({
            name: msg.name,
            location: msg.location,
            streams: [],
            socket: socket
        });
        socket.set("attacherIndex", attacherIndex, function () {
            socket.emit("ready");
        });
    });
    
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
    
    socket.on("streams", function (msg) {
        socket.get("attacherIndex", function (err, attacherIndex) {
            if (typeof attacherIndex == "number" && attachers[attacherIndex] && msg && Array.isArray(msg)) {
                attachers[attacherIndex].streams = msg;
                sendAttachers();
            } else {
                socket.emit("init");
            }
        });
    });
    
    socket.on("to attacher", function (msg) {
        socket.get("viewerIndex", function (err, viewerIndex) {
            if (typeof viewerIndex == "number" && viewers[viewerIndex] && typeof msg.destination == "number" && attachers[msg.destination] && msg.event && msg.data) {
                attachers[msg.destination].socket.emit(msg.event, {
                    source: viewerIndex,
                    data: msg.data
                });
            } else {
                socket.emit("init");
            }
        });
    });
    
    socket.on("to viewer", function (msg) {
        socket.get("attacherIndex", function (err, attacherIndex) {
            if (typeof attacherIndex == "number" && attachers[attacherIndex] && typeof msg.destination == "number" && viewers[msg.destination] && msg.event && msg.data) {
                viewers[msg.destination].socket.emit(msg.event, {
                    source: attacherIndex,
                    data: msg.data
                });
            } else {
                socket.emit("init");
            }
        });
    });
    
    try {
        var attacher = false,
            viewer = false;
        socket.get("attacherIndex", function (err, attacherIndex) {
            if (typeof attacherIndex == "number" && attachers[attacherIndex]) {
                attacher = true;
            }
        });
        socket.get("viewerIndex", function (err, viewerIndex) {
            if (typeof viewerIndex == "number" && viewers[viewerIndex]) {
                viewer = true;
            }
        });
        if (!attacher && !viewer) throw "no valid attacher or viewer";
    } catch (err) {
        // This socket has not yet been initialized (or we ran into an error with the initialization)
        console.log("Initializing socket (reason: " + err + ")");
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
