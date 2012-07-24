window.onload = function () {
    if (window._hhls_ && document.addEventListener && document.getElementsByName) {
        // NOTE: Same code in clientframe2.js (update that when you update this)
        var d = new Date(), key = [];
        for (var i = 0; i < 12; i++) key[i] = document.getElementById("hhls_keyholder")["y" + d.getFullYear()][i];
        key.a = d.getMonth();
        key.b = d.getDay() + d.getDate();
        key.c = key[key.a];
        var stuff = _hhls_()(key)();
        
        document.getElementById("noext_controller").style.display = "none";
        
        document.getElementById("ext_skipper").addEventListener("click", function () {
            document.getElementById("ext_controller").style.display = "none";
            document.getElementById("noext_controller").style.display = "block";
            return false;
        }, false);
        
        document.getElementById("ext_user").addEventListener("click", function () {
            document.getElementById("useext").value = "yes";
            document.getElementById("ext_options").style.display = "block";
            
            document.getElementById("former").addEventListener("submit", function (event) {
                var inputs = document.getElementsByName("ext_device");
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].checked) return true;
                }
                
                // If we're still here, nothing was checked
                event.preventDefault();
                alert("Please select a device or \"Custom Executable\"");
                return false;
            }, false);
            
            document.getElementById("ext_controller").style.display = "none";
            document.getElementById("noext_controller").style.display = "block";
            return false;
        }, false);
    } else {
        document.getElementById("ext_controller").style.display = "none";
    }
    document.getElementById("loading").style.display = "none";
    document.getElementById("panel_start").style.display = "block";
};