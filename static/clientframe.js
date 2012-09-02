window.onload = function () {
    var stuff = shared.getHHLS(document.getElementById("hhls_keyholder"));
    if (stuff && document.addEventListener && document.getElementsByName) {
        document.getElementById("not_controller").style.display = "none";
        
        document.getElementById("btn_skip_controller").addEventListener("click", function () {
            document.getElementById("prompt_controller").style.display = "none";
            document.getElementById("not_controller").style.display = "block";
            return false;
        }, false);
        
        document.getElementById("btn_use_controller").addEventListener("click", function () {
            stuff.detectDevices(function (devices) {
                for (var i = 0; i < devices.length; i++) {
                    document.getElementById("devicelist").innerHTML += '<input type="radio" id="controller_' + i + '" name="controller" value="' + shared.escHTML(devices[i].id) + '">&nbsp;<label for="controller_' + i + '">' + shared.escHTML(devices[i].label) + '</label><br>';
                }
            });
            
            document.getElementById("use_controller").value = "yes";
            document.getElementById("controller_options").style.display = "block";
            
            document.getElementById("theform").addEventListener("submit", function (event) {
                var inputs = document.getElementsByName("controller");
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].checked) return true;
                }
                
                // If we're still here, nothing was checked
                event.preventDefault();
                alert("Please select a device or \"Custom Executable\"");
                return false;
            }, false);
            
            document.getElementById("prompt_controller").style.display = "none";
            document.getElementById("not_controller").style.display = "block";
            return false;
        }, false);
    } else {
        document.getElementById("prompt_controller").style.display = "none";
    }
    document.getElementById("loading").style.display = "none";
    document.getElementById("panel_start").style.display = "block";
};