window.onload = function () {
    var stuff = shared.getHHLS(document.getElementById("hhls_keyholder"));
    if (stuff && document.addEventListener && document.getElementsByName) {
        document.getElementById("noext_controller").style.display = "none";
        
        document.getElementById("ext_skipper").addEventListener("click", function () {
            document.getElementById("ext_controller").style.display = "none";
            document.getElementById("noext_controller").style.display = "block";
            return false;
        }, false);
        
        document.getElementById("ext_user").addEventListener("click", function () {
            stuff.detectDevices(function (devices) {
                for (var i = 0; i < devices.length; i++) {
                    document.getElementById("ext_devicelist").innerHTML += '<input type="radio" id="ext_device' + i + '" name="ext_device" value="' + shared.escHTML(devices[i].id) + '">&nbsp;<label for="ext_device' + i + '">' + shared.escHTML(devices[i].label) + '</label><br>';
                }
            });
            
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