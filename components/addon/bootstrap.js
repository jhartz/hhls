var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
var prefs = Services.prefs.getBranch("extensions.hhls.");

/* BOOTSTRAPPED ADD-ON FUNCTIONS */

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
        branch.setCharPref("extensions.hhls.executables", "[]");
    } catch (err) {
        Cu.reportError(err);
    }
    
    // Add pref UI observers
    Services.obs.addObserver(observer, "addon-options-displayed", false);
    Services.obs.addObserver(observer, "addon-options-hidden", false);
    
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
    
    // Remove pref UI observers
    Services.obs.removeObserver(observer, "addon-options-displayed");
    Services.obs.removeObserver(observer, "addon-options-hidden");
    
    // Unload client commands
    Cu.unload("resource://hhls-client/commands.jsm");
    
    // Clear our resource registration
    var res = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
    res.setSubstitution("hhls-client", null);
}

/* WINDOW/PREF WATCHERS/OBSERVERS */

var observer = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "addon-options-displayed" && aData == "hhls@jhartz.github.com") {
            var document = aSubject;
            var control = document.getElementById("hhls-client-clear-executables");
            control.addEventListener("command", clearExecutables, false);
        } else if (aTopic == "addon-options-hidden" && aData == "hhls@jhartz.github.com") {
            // unload
            var document = aSubject;
            var control = document.getElementById("hhls-client-clear-executables");
            control.removeEventListener("command", clearExecutables, false);
        }
    }
};

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

/* CONTENT FUNCTIONS */

function checkHHLSClientEnabled(contentWindow) {
    // Check contentWindow to see if it could possibly be using the HHLS Client API
    if (contentWindow.document && typeof contentWindow.document.getElementById == "function" && contentWindow.document.getElementById("hhls_keyholder") && contentWindow.wrappedJSObject && typeof contentWindow.wrappedJSObject.__hhls__ == "function") {
        return true;
    } else {
        // check frames
        if (contentWindow.frames && contentWindow.frames.length > 0) {
            for (var i = 0; i < contentWindow.frames.length; i++) {
                if (checkHHLSClientEnabled(contentWindow.frames[i])) return true;
            }
        }
    }
    return false;
}

function clearExecutables(event) {
    // First, check and make sure that no HHLS client page might be using the executables
    var enumerator = Services.wm.getEnumerator("navigator:browser");
    var inuse = false, win, index, cur;
    while (!inuse && enumerator.hasMoreElements()) {
        win = enumerator.getNext();
        if (win.gBrowser) {
            for (index = 0; index < win.gBrowser.browsers.length; index++) {
                cur = win.gBrowser.getBrowserAtIndex(index);
                if (cur && cur.contentWindow && checkHHLSClientEnabled(cur.contentWindow)) {
                    inuse = true;
                    break;
                }
            }
        }
    }
    
    if (inuse) {
        Services.prompt.alert(null, "HHLS Client", "Please close all open HHLS client webpages and try again.");
    } else {
        prefs.clearUserPref("executables");
        Services.prompt.alert(null, "HHLS Client", "The list of previous executables has been cleared.");
    }
}

function testProps(obj) {
    // Make all properties of obj read-only if not already specified in __exposedProps__
    if (typeof obj.__exposedProps__ == "undefined") obj.__exposedProps__ = {};
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop) && typeof obj.__exposedProps__[prop] == "undefined") {
            obj.__exposedProps__[prop] = "r";
        }
    }
}

function run_client_command(name, args, callback) {
    if (client_commands.hasOwnProperty(name) && typeof client_commands[name] == "function") {
        if (typeof callback != "function") callback = function () {};
        if (!Array.isArray(args)) args = [];
        
        client_commands[name](args, function (result) {
            if (Array.isArray(result)) {
                for (var i = 0; i < result.length; i++) {
                    if (typeof result[i] == "object" && typeof result[i].__exposedProps__ == "undefined") {
                        testProps(result[i]);
                    }
                }
            } else if (typeof result == "object" && typeof result.__exposedProps__ == "undefined") {
                testProps(result);
            }
            callback(result);
        });
    }
}

function handleContent(event) {
    if (event && event.originalTarget) {
        var contentDocument = event.originalTarget;
        var contentWindow = contentDocument.defaultView;
        if (contentWindow && contentDocument instanceof contentWindow.HTMLDocument && contentWindow.location && contentWindow.location.href.indexOf("://") != -1) {
            var server, content;
            try {
                server = Services.io.newURI(prefs.getCharPref("server"), null, null);
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
                    var stuff = {__exposedProps__: {i: "r"}};
                    
                    if (key && Array.isArray(key)) {
                        // Begin key checking...
                        var d = new Date();
                        // 30 seconds max between key creation and use
                        if ((d.getTime() - key_creation.getTime()) < 30000 && key.a == key_creation.getMonth() && key.b == d.getDay() + d.getDate() && key.c == secret[key_creation.getMonth()]) {
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
                                        stuff[cmd] = function (args, callback) {
                                            // "args" is optional
                                            if (typeof callback == "undefined" && typeof args == "function") {
                                                callback = args;
                                                args = [];
                                            }
                                            run_client_command(cmd, args, callback);
                                        };
                                        stuff.__exposedProps__[cmd] = "r";
                                    }
                                });
                            } else {
                                stuff.i = i;
                            }
                        } else {
                            stuff.i = key_creation.getTime();
                        }
                    } else {
                        stuff.i = null;
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