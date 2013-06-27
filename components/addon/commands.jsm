var EXPORTED_SYMBOLS = ["client_commands"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
var prefs = Services.prefs.getBranch("extensions.hhls.");
Cu.import("resource://hhls-client/devices.jsm");

/* Client Commands...
    - Include any commands that should be visible to the client here. (The functions are not called directly, so none of the code in the functions in this object is actually visible to the client.)
    - Each function is passed an Array of arguments (supplied by the client) and a callback function.
    - To send a result back to the client, call `callback` with one and only one argument, which will be sent back via a callback function specified by the client. (NOTE: If the argument is an object or an array of objects, __exposedProps__ will automatically be set (if not already set) to allow read-only access to these objects by the client.)
*/
var client_commands = {
    hello: function (args, callback) {
        if (args[0] == "spanish") {
            callback("Hola mundo");
        } else {
            callback("Hello world");
        }
    },
    
    detectDevices: function (args, callback) {
        var mydevices = [];
        for (var device in devices) {
            if (devices.hasOwnProperty(device)) {
                mydevices.push(device);
            }
        }
        
        var devs = [], completed = 0, total = mydevices.length;
        var tryCallback = function () {
            completed++;
            if (completed == total) callback(devs);
        };
        var handleDevice = function (device) {
            if (devices[device] && typeof devices[device].detect == "function") {
                devices[device].detect(function (result) {
                    if (result.success) {
                        for (var i = 0; i < result.devices.length; i++) {
                            devs.push({
                                device: device,
                                id: result.devices[i]
                            });
                        }
                    } else {
                        devs.push({
                            device: device,
                            error: result.error
                        });
                    }
                    tryCallback();
                });
            } else {
                devs.push({
                    device: device,
                    error: "detect() function missing"
                });
                tryCallback();
            }
        };
        
        for (var i = 0; i < total; i++) {
            handleDevice(mydevices[i]);
        }
    },
    
    setDevice: function ([device, id, state], callback) {
        if (device && devices[device]) {
            if (id) {
                if (typeof state == "boolean") state = Number(state);
                if (typeof state == "number" && (state == 0 || state == 1)) {
                    devices[device].stateChange(id, state, function (result) {
                        if (result.success) {
                            callback({
                                success: true
                            });
                        } else {
                            callback({
                                success: false,
                                error: result.error
                            });
                        }
                    });
                } else {
                    callback({
                        success: false,
                        error: "invalid state"
                    });
                }
            } else {
                callback({
                    success: false,
                    error: "invalid id"
                });
            }
        } else {
            callback({
                success: false,
                error: "invalid device"
            });
        }
    },
    
    browse: function (args, callback) {
        var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        fp.init(Services.wm.getMostRecentWindow("navigator:browser"), "Select an Executable", Ci.nsIFilePicker.modeOpen);
        if (fp.show() == Ci.nsIFilePicker.returnOK && fp.file && fp.file.path) {
            callback(storeExec(fp.file));
        } else {
            callback({
                success: false
            });
        }
    },
    
    setExec: function ([path], callback) {
        var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        try {
            file.initWithPath(path);
        } catch (err) {
            Cu.reportError(err);
        }
        if (path && file.path) {
            callback(storeExec(file));
        } else {
            callback({
                success: false,
                error: "invalid path"
            });
        }
    },
    
    getPreviousExecs: function (args, callback) {
        var executables = getExecutables();
        var execs = [];
        for (var i = 0; i < executables.length; i++) {
            execs[i] = {
                index: i,
                sum: getHash(i + "::path:" + executables[i].path),
                path: executables[i].path,
                args: executables[i].args
            };
        }
        callback(execs);
    },
    
    getExecArgs: function ([index, sum], callback) {
        var executables = getExecutables();
        if (executables[index]) {
            if (getHash(index + "::path:" + executables[index].path) == sum) {
                callback({
                    success: true,
                    args: executables[index].args
                });
            } else {
                callback({
                    success: false,
                    error: "invalid executable sum"
                });
            }
        } else {
            callback({
                success: false,
                error: "invalid executable index"
            });
        }
    },
    
    setExecArgs: function ([index, sum, args], callback) {
        var executables = getExecutables();
        if (executables[index]) {
            if (getHash(index + "::path:" + executables[index].path) == sum) {
                if (Array.isArray(args)) {
                    executables[index].args = args;
                    setExecutables(executables);
                    callback({
                        success: true,
                        empty: !args.length
                    });
                } else {
                    callback({
                        success: false,
                        error: "invalid args"
                    });
                }
            } else {
                callback({
                    success: false,
                    error: "invalid executable sum"
                });
            }
        } else {
            callback({
                success: false,
                error: "invalid executable index"
            });
        }
    },
    
    runExec: function ([index, sum, state], callback) {
        var executables = getExecutables();
        if (executables[index]) {
            if (getHash(index + "::path:" + executables[index].path) == sum) {
                if (typeof state == "boolean") state = Number(state);
                if (typeof state == "number" && (state == 0 || state == 1)) {
                    var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
                    var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
                    try {
                        file.initWithPath(executables[index].path);
                    } catch (err) {
                        Cu.reportError(err);
                    }
                    if (file.path && file.exists()) {
                        process.init(file);
                        process.runAsync(executables[index].args.concat(String(state)), executables[index].args.length + 1);
                        callback({
                            success: true
                        });
                    } else {
                        callback({
                            success: false,
                            error: "invalid path"
                        });
                    }
                } else {
                    callback({
                        success: false,
                        error: "invalid state"
                    });
                }
            } else {
                callback({
                    success: false,
                    error: "invalid executable sum"
                });
            }
        } else {
            callback({
                success: false,
                error: "invalid executable index"
            });
        }
    }
};


// Util functions used in the client commands

function getExecutables() {
    // Return array of all executables
    var executables;
    try {
        executables = JSON.parse(prefs.getCharPref("executables"));
    } catch (err) {}
    if (!executables || !Array.isArray(executables)) executables = [];
    return executables;
}

function setExecutables(executables) {
    // Set array of all executables
    try {
        prefs.setCharPref("executables", JSON.stringify(executables));
    } catch (err) {
        return false;
    }
    return true;
}

function getHash(str) {
    // Get MD5 hash of a string
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var result = {};
    var data = converter.convertToByteArray(str, result);
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
            var executables = getExecutables();
            var index = executables.length;
            executables[index] = {
                path: file.path,
                args: []
            };
            setExecutables(executables);
            
            // Create a hash of the executable URL (in case something happens and we have new stuff in "executables" but someone still has an old index)
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