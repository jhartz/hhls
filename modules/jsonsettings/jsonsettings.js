var fs = require("fs"),
    path = require("path");


exports.default_settings_dir = "";

exports.SettingsFile = function (options) {
    this.options = options || {};
    if (!this.options.settings_dir) this.options.settings_dir = exports.default_settings_dir;
    
    this.loaded = false;
    
    if (!this.options.onerror) this.options.onerror = function (err) {
        if (typeof err == "string") {
            // TODO: Make into an error
            err = "ERROR: " + err;
        }
        throw err;
    };
    if (!this.options.onload) this.options.onload = function () {};
    if (!this.options.onupdate) this.options.onupdate = function () {};
    
    var addWatchers = function (obj, bigman) {
        var newobj = {};
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) && typeof obj[prop] != "function") {
                addWatcher(obj, prop, newobj, bigman);
            }
        }
        Object.defineProperty(newobj, "setProp", {
            value: function (propname, propvalue) {
                // Add/modify a property and make sure we have watchers on it
                var old = {};
                old[propname] = propvalue;
                addWatcher(old, propname, newobj, bigman);
                bigman.update();
            }
        });
        Object.defineProperty(newobj, "getProp", {
            value: function (propname) {
                // Return a property without all our crazy additions
                var safeprop = {a: newobj[propname]};
                return JSON.parse(JSON.stringify(safeprop)).a;
            }
        });
        return newobj;
    };
    
    var addWatcher = function (obj, prop, newobj, bigman) {
        var val = (obj[prop] && typeof obj[prop] == "object") ? addWatchers(obj[prop], bigman) : obj[prop];
        Object.defineProperty(newobj, prop, {
            enumerable: true,
            configurable: true,
            get: function () {
                return val;
            },
            set: function (newval) {
                val = (newval && typeof newval == "object") ? addWatchers(newval, bigman) : newval;
                bigman.update();
            }
        });
    };
    
    this.load = function (newfilename) {
        if (newfilename) this.options.filename = newfilename;
        this.loaded = false;
        console.log("Loading " + this.options.filename);
        var that = this;
        fs.readFile(path.join(this.options.settings_dir, this.options.filename), function (err, data) {
            if (err) {
                that.onerror(err);
            } else {
                var JSONdata = null;
                try {
                    JSONdata = JSON.parse(data);
                } catch (tryerr) {
                    that.onerror(tryerr);
                }
                if (JSONdata) {
                    if (that.options.use_watchers) {
                        var val = addWatchers(JSONdata, that);
                        Object.defineProperty(that, "data", {
                            enumerable: true,
                            configurable: true,
                            get: function () {
                                return val;
                            },
                            set: function (newval) {
                                val = addWatchers(newval, that);
                                that.update();
                            }
                        });
                    } else {
                        that.data = JSONdata;
                    }
                    that.loaded = true;
                    that.options.onload();
                } else {
                    that.onerror("Invalid JSON!");
                }
            }
        });
    };
    
    this.update = function () {
        console.log("Updating " + this.options.filename);
        var that = this;
        fs.writeFile(path.join(this.options.settings_dir, this.options.filename), JSON.stringify(this.data, null, "    "), function (err) {
            if (err) {
                that.options.onerror(err);
            } else {
                that.options.onupdate();
            }
        });
    };
    
    if (this.options.filename) this.load();
};