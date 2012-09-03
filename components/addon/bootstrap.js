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
    hello: function (args, return_obj) {
        if (args[0] == "spanish") {
            return_obj.value = "Hola mundo";
        } else {
            return_obj.value = "Hello world";
        }
    },
    
    detectDevices: function (args, return_obj) {
        // TODO: detect devices
        return_obj.value = [{
            id: 6,
            label: "My External Controller"
        }, {
            id: 3,
            label: "My Other External Controller"
        }];
    },
    
    setDevice: function ([device, state], return_obj) {
        if (device) {
            if (typeof state == "boolean") state = Number(state);
            if (typeof state == "number" && (state == 0 || state == 1)) {
                // TODO: change device state
                return_obj.value = {success: true};
            } else {
                return_obj.value = {
                    success: false,
                    error: "invalid state"
                };
            }
        } else {
            return_obj.value = {
                success: false,
                error: "invalid device"
            };
        }
    },
    
    browse: function (args, return_obj) {
        var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        fp.init(Services.wm.getMostRecentWindow("navigator:browser"), "Select an Executable", Ci.nsIFilePicker.modeOpen);
        if (fp.show() == Ci.nsIFilePicker.returnOK && fp.file && fp.file.path) {
            return_obj.value = storeExec(fp.file);
        } else {
            return_obj.value = {success: false};
        }
    },
    
    setExec: function ([path], return_obj) {
        var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        try {
            file.initWithPath(path);
        } catch (err) {}
        if (path && file.path) {
            return_obj.value = storeExec(file);
        } else {
            return_obj.value = {
                success: false,
                error: "invalid path"
            };
        }
    },
    
    getPreviousExecs: function (args, return_obj) {
        var execs = [];
        for (var i = 0; i < executables.length; i++) {
            execs[i] = {
                index: i,
                sum: getHash(i + "::path:" + executables[i].file.path),
                path: executables[i].file.path,
                args: executables[i].args
            };
        }
        return_obj.value = execs;
    },
    
    getExecArgs: function ([index, sum], return_obj) {
        if (index in executables) {
            if (getHash(index + "::path:" + executables[index].file.path) == sum) {
                return_obj.value = {
                    success: true,
                    args: executables[index].args
                };
            } else {
                return_obj.value = {
                    success: false,
                    error: "invalid executable sum"
                };
            }
        } else {
            return_obj.value = {
                success: false,
                error: "invalid executable index"
            };
        }
    },
    
    setExecArgs: function ([index, sum, args], return_obj) {
        if (index in executables) {
            if (getHash(index + "::path:" + executables[index].file.path) == sum) {
                if (Array.isArray(args)) {
                    executables[index].args = args;
                    return_obj.value = {
                        success: true,
                        empty: !args.length
                    };
                } else {
                    return_obj.value = {
                        success: false,
                        error: "invalid args"
                    };
                }
            } else {
                return_obj.value = {
                    success: false,
                    error: "invalid executable sum"
                };
            }
        } else {
            return_obj.value = {
                success: false,
                error: "invalid executable index"
            };
        }
    },
    
    runExec: function ([index, sum, state], return_obj) {
        if (index in executables) {
            if (getHash(index + "::path:" + executables[index].file.path) == sum) {
                if (typeof state == "boolean") state = Number(state);
                if (typeof state == "number" && (state == 0 || state == 1)) {
                    var args = executables[index].args;
                    args.push(String(state));
                    var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
                    process.init(executables[index].file);
                    process.runAsync(args, args.length);
                    return_obj.value = {success: true};
                } else {
                    return_obj.value = {
                        success: false,
                        error: "invalid state"
                    };
                }
            } else {
                return_obj.value = {
                    success: false,
                    error: "invalid executable sum"
                };
            }
        } else {
            return_obj.value = {
                success: false,
                error: "invalid executable index"
            };
        }
    }
};

/* Client Command Helpers
   Any "util" or "common" functions between client command functions above should go here
*/

var executables = [];

function getHash(str) {
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var result = {};
    var data = converter.convertToByteArray("._-+MYHASH+-_." + str + "_____#$HGFDXHkjgfdsyui87654", result);
    var ch = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.nsICryptoHash);
    ch.init(ch.MD5);
    ch.update(data, data.length);
    var hash = ch.finish(false);
    var toHexString = function (charCode) {
        return ("0" + charCode.toString(16)).slice(-2);
    };
    var sum = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
    return sum;
}

function storeExec(file) {
    if (file.exists()) {
        if (!file.isDirectory()) {
            var index = executables.length;
            executables[index] = {
                file: file,
                args: []
            };
            
            // Create a hash of the executable URL (in case we restart and have new stuff in "executables" but someone still has an old index)
            var sum = getHash(index + "::path:" + file.path);
            
            return {
                success: true,
                index: index,
                sum: sum,
                path: file.path
            };
        } else {
            return {
                success: false,
                error: "file is a directory"
            };
        }
    } else {
        return {
            success: false,
            error: "file doesn't exist"
        };
    }
}


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