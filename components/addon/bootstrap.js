var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

function install(data, reason) {}
function uninstall(data, reason) {}

function startup(data, reason) {
    // Register the resource:// mappings
    var res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
    var resourceURI = Services.io.newURI(__SCRIPT_URI_SPEC__ + "/../", null, null);
    res.setSubstitution("hhls-client", resourceURI);
    
    // Load client commands
    Cu.import("resource://hhls-client/commands.jsm");
    
    // Set default prefs (NOTE: not user prefs)
    try {
        var branch = Services.prefs.getDefaultBranch("");
        branch.setCharPref("extensions.hhls.server", "http://");
    } catch (err) {
        Cu.reportError(err);
    }
    
    // Load into all existing browser windows
    var enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
        loadWindow(enumerator.getNext());
    }
    
    // Listen for new windows
    Services.ww.registerNotification(windowWatcher);
}

function shutdown(data, reason) {
    // Remove "new window" listener
    Services.ww.unregisterNotification(windowWatcher);
    
    // Unload from all existing browser windows
    var enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        if (win) {
            unloadWindow(win)
        }
    }
    
    // Unload client commands
    Cu.unload("resource://hhls-client/commands.jsm");
    
    // Clear our resource registration
    var res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
    res.setSubstitution("hhls-client", null);
}

var windowWatcher = function windowWatcher(win, topic) {
    if (topic != "domwindowopened") return;
    
    win.addEventListener("load", function onLoad() {
        win.removeEventListener("load", onLoad, false);
        if (win.document.documentElement.getAttribute("windowtype") == "navigator:browser") {
            loadWindow(win);
        }
    }, false);
}

function loadWindow(win) {
    if (win.gBrowser) {
        win.gBrowser.addEventListener("DOMContentLoaded", handleContent, false);
    }
}

function unloadWindow(win) {
    if (win.gBrowser) {
        win.gBrowser.removeEventListener("DOMContentLoaded", handleContent, false);
    }
}

function run_client_command(name, callback, args) {
    if (typeof client_commands != "undefined" && client_commands[name]) {
        if (typeof callback != "function") callback = function () {};
        if (!Array.isArray(args)) args = [];
        
        var return_obj = {};
        var data = null;
        Object.defineProperty(return_obj, "value", {
            enumerable: true,
            configurable: true,
            get: function () {
                return data;
            },
            set: function (val) {
                data = val;
                callback(data);
            }
        });
        client_commands[name](args, return_obj);
    }
}

function handleContent(event) {
    if (event && event.originalTarget) {
        var contentDocument = event.originalTarget;
        var contentWindow = contentDocument.defaultView;
        if (contentWindow && contentDocument instanceof contentWindow.HTMLDocument && contentWindow.location && contentWindow.location.href.indexOf("://") != -1) {
            var branch = Services.prefs.getBranch("extensions.hhls.");
            var server, content;
            try {
                server = Services.io.newURI(branch.getCharPref("server"), null, null);
                content = Services.io.newURI(contentWindow.location.href, null, null);
            } catch (err) {
                Cu.reportError(err);
            }
            if (server && content && server.prePath == content.prePath && contentWindow.document.getElementById("hhls_keyholder")) {
                var secret = [];
                for (var i = 0; i < 12; i++) secret[i] = Math.random() * 2;
                
                var key_creation = new Date();
                contentWindow.wrappedJSObject.document.getElementById("hhls_keyholder")["y" + key_creation.getFullYear()] = secret;
                
                var checkkey = function (key) {
                    var stuff = {};
                    
                    // Begin key checking...
                    var d = new Date();
                    // 30 seconds max between key creation and use
                    if ((d.getTime() - key_creation.getTime()) < 30000 && key && Array.isArray(key) && key.a == key_creation.getMonth() && key.b == d.getDay() + d.getDate() && key.c == secret[key_creation.getMonth()]) {
                        var valid = true;
                        for (var i = 0; i < 12; i++) {
                            if (key[i] != secret[i]) {
                                valid = false;
                                break;
                            }
                        }
                        if (valid) {
                            var cmds = [];
                            for (var prop in client_commands) {
                                if (client_commands.hasOwnProperty(prop) && typeof client_commands[prop] == "function") {
                                    cmds.push(prop);
                                }
                            }
                            cmds.forEach(function (cmd) {
                                if (cmd != "i") {
                                    stuff[cmd] = function (callback, args) {
                                        run_client_command(cmd, callback, args);
                                    };
                                }
                            });
                        } else {
                            stuff.i = i;
                        }
                    } else {
                        stuff.i = key.c;
                    }
                    
                    // Return whatever we have
                    return stuff;
                };
                
                var thekeyfunc = function () {
                    return function (key) {
                        return function () {
                            return checkkey(key);
                        };
                    };
                };
                contentWindow.wrappedJSObject.__hhls__ = function () {
                    return thekeyfunc();
                };
            }
        }
    }
}