window.onload = function () {
    var stuff = shared.getHHLS(document.getElementById("hhls_keyholder"));
    if (stuff && document.addEventListener && document.getElementsByName) {
        document.getElementById("not_controller").style.display = "none";
        
        document.getElementById("btn_skip_controller").addEventListener("click", function (event) {
            event.preventDefault();
            
            document.getElementById("prompt_controller").style.display = "none";
            document.getElementById("not_controller").style.display = "block";
        }, false);
        
        document.getElementById("btn_use_controller").addEventListener("click", function (event) {
            event.preventDefault();
            
            stuff.detectDevices(function (devices) {
                for (var i = 0; i < devices.length; i++) {
                    document.getElementById("devicelist").innerHTML += '<input type="radio" id="controller_' + i + '" name="controller" value="' + shared.escHTML(devices[i].id) + '">&nbsp;<label for="controller_' + i + '">' + shared.escHTML(devices[i].label) + '</label><br>';
                }
            });
            
            document.getElementById("controller_exec_browse").addEventListener("click", function (event) {
                event.preventDefault();
                
                stuff.browse(function (data) {
                    if (data.success) {
                        window._exec_index = data.index;
                        window._exec_sum = data.sum;
                        window._exec_args = [];
                        document.getElementById("controller_exec").value = data.index + "::" + data.sum;
                        document.getElementById("controller_exec_path").innerHTML = shared.escHTML(data.path);
                        document.getElementById("controller_exec_moreinfo").innerHTML = shared.escHTML("(" + data.index + "::" + data.sum + ")");
                        document.getElementById("controller_exec_ifOneArg").style.display = "inline";
                        document.getElementById("controller_exec_ifMultipleArgs").style.display = "none";
                        document.getElementById("controller_exec_arguments").innerHTML = "Arguments";
                    } else {
                        alert("Error browsing for file: " + data.error);
                    }
                });
            }, false);
            
            document.getElementById("controller_exec_arguments").addEventListener("click", function (event) {
                event.preventDefault();
                
                if (typeof window._exec_index == "number") {
                    var oldargs = "";
                    if (!window._exec_args) window._exec_args = [];
                    for (var i = 0; i < window._exec_args.length; i++) {
                        if (oldargs.length) oldargs += " ";
                        oldargs += window._exec_args[i].replace(/ /g, "\\ ");
                    }
                    console.log("oldargs:", oldargs);
                    var args = (prompt("Enter any extra arguments (space-separated)\nEscape literal spaces with a backslash", oldargs) || "").split(" ");
                    var newargs = [], withnext = "";
                    for (var i = 0; i < args.length; i++) {
                        if (args[i]) {
                            if (args[i].charAt(args[i].length - 1) == "\\") {
                                withnext = args[i].substring(0, args[i].length - 1) + " ";
                            } else {
                                newargs.push(withnext + args[i]);
                                withnext = "";
                            }
                        }
                    }
                    window._exec_args = newargs;
                    console.log("newargs:", newargs);
                    stuff.setExecArgs(function (result) {
                        if (result.success) {
                            document.getElementById("controller_exec_ifOneArg").style.display = "none";
                            document.getElementById("controller_exec_ifMultipleArgs").style.display = "inline";
                            document.getElementById("controller_exec_arguments").innerHTML = "Arguments...";
                        } else {
                            alert("Error setting arguments: " + result.error);
                        }
                    }, [window._exec_index, window._exec_sum, window._exec_args]);
                } else {
                    alert("ERROR: Please browse for an executable first!");
                }
            }, false);
            
            var controller_exec_change = function () {
                if (document.getElementById("controller_exec_option").checked) {
                    document.getElementById("controller_ifexec").style.display = "";
                } else {
                    document.getElementById("controller_ifexec").style.display = "none";
                }
            };
            controller_exec_change();
            document.getElementById("controller_exec_option").addEventListener("change", controller_exec_change, false);
            
            document.getElementById("use_controller").value = "yes";
            document.getElementById("controller_options").style.display = "block";
            
            document.getElementById("theform").addEventListener("submit", function (event) {
                var msg = "Please select a device or \"Custom Executable\"";
                var inputs = document.getElementsByName("controller");
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].checked) {
                        if (inputs[i].id != "controller_exec_option" || document.getElementById("controller_exec").value) {
                            return true;
                        } else {
                            msg = "Please select an executable";
                        }
                    }
                }
                
                // If we're still here, nothing was checked
                event.preventDefault();
                alert(msg);
                return false;
            }, false);
            
            document.getElementById("prompt_controller").style.display = "none";
            document.getElementById("not_controller").style.display = "block";
        }, false);
    } else {
        document.getElementById("prompt_controller").style.display = "none";
    }
    document.getElementById("loading").style.display = "none";
    document.getElementById("panel_start").style.display = "block";
};