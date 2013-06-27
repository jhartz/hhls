var EXPORTED_SYMBOLS = ["devices"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

// For each device, add a member to the `devices` object like...
/*
    "name or type of device": {
        detect: function (callback) {
            // This function must create an array of the ids/names of all the devices of this type.
            // Then, it MUST call `callback` with an object describing the results.
            // NOTE: If no devices are found, but the search completed without errors, then it should be deemed successful.
            
            // In the case of success...
            callback({
                success: true,
                devices: ["device 1 id/name", "device 2 id/name", ...]
            });
            
            // In the case of failure...
            callback({
                success: false,
                error: "error message here"
            });
        },
        
        stateChange: function (id, state, callback) {
            // This function must change the state of the device whose id/name matches `id` (`state` is either 0, indicating "off", or 1, indicating "on").
            // Then, it MUST call `callback` with an object describing the results.
            
            // In the case of success...
            callback({
                success: true
            });
            
            // In the case of failure...
            callback({
                success: false,
                error: "error message here"
            });
        }
    }
*/
var devices = {
    "test device": {
        detect: function (callback) {
            callback({
                success: true,
                devices: ["test1", "test2"]
            });
        },
        
        stateChange: function (id, state, callback) {
            callback({
                success: true
            });
        }
    },
    
    "bad test device": {
        detect: function (callback) {
            callback({
                success: true,
                devices: ["test1"]
            });
        },
        
        stateChange: function (id, state, callback) {
            callback({
                success: false,
                error: "couldn't change state of device " + id + " to " + state
            });
        }
    },
    
    "nonexistant test device": {
        detect: function (callback) {
            callback({
                success: false,
                error: "device not found"
            });
        },
        
        stateChange: function (id, state, callback) {
            callback({
                success: false,
                error: "device not found"
            });
        }
    },
};