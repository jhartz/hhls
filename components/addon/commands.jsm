var EXPORTED_SYMBOLS = ["client_commands"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

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
        } catch (err) {
            Cu.reportError(err);
        }
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
                    var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
                    process.init(executables[index].file);
                    process.runAsync(executables[index].args.concat(String(state)), executables[index].args.length + 1);
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