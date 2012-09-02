var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

/* Client Commands...
    - Include any commands that should be visible to the client here. (The functions are not called directly, so none of the code in the functions in this object is actually visible to the client.)
    - Each function is passed 2 arguments: "args" and "return_obj"
    - Any arguments passed by the client are stored in "args" (which is guaranteed to be a real array).
    - To send a result back to the client, update return_obj.value (data in this property is automatically sent back to a callback function supplied by the client).
*/
var client_commands = {
    browse: function (args, return_obj) {
        return_obj.value = "HELLO.WORLD";
    }
};

function install(data, reason) {}
function uninstall(data, reason) {}

function startup(data, reason) {
    // Set default prefs
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
    if (client_commands[name]) {
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
            // TODO: Test location against extensions.hhls.server
            if (contentWindow.document.getElementById("hhls_keyholder")) {
                var secret = [];
                for (var i = 0; i < 12; i++) secret[i] = Math.random() * 2;
                
                var key_creation = new Date();
                contentWindow.wrappedJSObject.document.getElementById("hhls_keyholder")["y" + key_creation.getFullYear()] = secret;
                
                var checkkey = function (key, that) {
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
                                if (client_commands.hasOwnProperty(prop)) {
                                    cmds.push(prop);
                                }
                            }
                            cmds.forEach(function (cmd) {
                                stuff[cmd] = function (callback, args) {
                                    run_client_command(cmd, callback, args);
                                };
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