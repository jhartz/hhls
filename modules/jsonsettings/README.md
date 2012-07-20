# jsonsettings

A simple way to read and write settings from a JSON file

## Usage

    var jsonsettings = require("jsonsettings");
    jsonsettings.default_settings_dir = "my_fav_settings";  // optional
    var mysettings = new jsonsettings.SettingsFile({ ... options ... });
    
    mysettings.data  // the JSON data
    
    // When mysettings.data is changed, call mysettings.update() to write the changes back to the file
    // (unless watchers are enabled - see below)

options:
 - *filename:* the name of the settings file (if not specified, you must manually call `load(filename)`)
 - *settings_dir:* the directory in which *filename* exists (default: `default_settings_dir`)
 - *use_watchers:* implement watchers on the JSON object to detect changes and automatically update the JSON file (default: false)
 - *onload:* `function ()` called after data is loaded
 - *onerror:* `function (err)` called on an error (instead of just throwing the error)
 - *onupdate:* `function ()` called after data file is updated without error

Some notes on watchers:
  - As soon as any property is modified, the JSON file will be automatically updated IFF the property already had a value. If it did not (or just to make sure), you must call `parent.setProp(name, value)`
    Example:
      Instead of `mysettings.data.bob = 2`
      Do `mysettings.data.setProp("bob", 2)`
      Or `mysettings.data.setProp("bob"); mysettings.data.bob = 2;`

  - To get the "raw" value of any property, call `parent.getProp(name)`
    Example:
      Instead of `mysettings.data.foo.bar`
      Use `mysettings.data.foo.getProp("bar")`

  - If you do NOT use watchers, you must call `object.update()` after each modification (where `object` is a SettingsFile object)

## Examples

    var jsonsettings = require("jsonsettings");
    
    // Load settings from "mysettings/stuff.json" and log them to console when loaded
    var mysettings = new jsonsettings.SettingsFile({
        filename: "stuff.json",
        settings_dir: "mysettings",
        onload: function () {
            console.log(mysettings.data);
        }
    });
    
    // Make some changes to the settings we loaded and write the changes back to the file
    mysettings.data.newstuff = {hello: "world"};
    mysettings.data.oldstuff.favorite = 3;
    mysettings.update();



    var jsonsettings = require("jsonsettings");
    jsonsettings.default_settings_dir = "/serversettings";
    
    var server_config = new jsonsettings.SettingsFile({
        use_watchers: true,
        onerror: function (err) {
            console.log(err);
        }
    });
    
    // Later on...
    server_config.load("mystuff.json");
    server_config.data.bob = "jim";
    // As long as "bob" had a previous value, the changes have automatically been written back to the file.
    // To make sure, we could have done this instead:
    server_config.data.setProp("bob", "jim");
    // or this:
    server_config.data.setProp("bob");
    server_config.data.bob = "jim";