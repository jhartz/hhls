// Haunted House Logistics Server - JSON settings manager
// Provides a simple way to read and write settings from a JSON file


// node modules
var fs = require("fs"),
    path = require("path");


exports.SettingsFile = function (fname, settings_dir, noload) {
    this.fname = fname;
    this.settings_dir = settings_dir || "settings";
    this.loaded = false;
    
    this.onerror = function (err) {
        throw err;
    };
    
    this.onload = function () {};
    
    this.load = function () {
        console.log("Loading " + this.fname);
        var that = this;
        fs.readFile(path.join(this.settings_dir, this.fname), function (err, data) {
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
                    that.data = JSONdata;
                    that.loaded = true;
                    that.onload();
                }
            }
        });
    };
    
    this.update = function () {
        var that = this;
        fs.writeFile(path.join(this.settings_dir, this.fname), JSON.stringify(this.data, null, "    "), function (err) {
            if (err) that.onerror(err);
        });
    };
    
    if (!noload) this.load();
};