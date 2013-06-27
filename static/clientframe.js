window.onload = function () {
    var stuff = shared.getHHLS(document.getElementById("hhls_keyholder"));
    if (stuff && typeof stuff.i == "undefined" && document.addEventListener && document.getElementsByName) {
        document.getElementById("not_controller").style.display = "none";
        
        document.getElementById("btn_skip_controller").addEventListener("click", function (event) {
            event.preventDefault();
            
            document.getElementById("prompt_controller").style.display = "none";
            document.getElementById("not_controller").style.display = "block";
        }, false);
        
        document.getElementById("btn_use_controller").addEventListener("click", function (event) {
            event.preventDefault();
            
            stuff.detectDevices(function (devices) {
                var id, label, html = '', errorhtml = '';
                for (var i = 0; i < devices.length; i++) {
                    if (devices[i].error) {
                        errorhtml += '<strong>Error loading <code>' + shared.escHTML(devices[i].device) + '</code>: </strong>' + shared.escHTML(devices[i].error) + '<br>';
                    } else {
                        id = JSON.stringify([devices[i].device, devices[i].id]);
                        label = devices[i].id + " (" + devices[i].device + ")";
                        html += '<input type="radio" id="controller_' + i + '" name="controller" value="' + shared.escHTML(id) + '">&nbsp;<label for="controller_' + i + '">' + shared.escHTML(label) + '</label><br>';
                    }
                }
                // Make sure errors show up last, after working devices
                document.getElementById("devicelist").innerHTML = html + errorhtml;
            });
            
            var success = function (index, sum, path) {
                window._exec_index = index;
                window._exec_sum = sum;
                window._exec_path = path;
                window._exec_args = [];
                document.getElementById("controller_exec").value = index + "::" + sum;
                document.getElementById("controller_exec_path").innerHTML = shared.escHTML(path);
                document.getElementById("controller_exec_moreinfo").innerHTML = shared.escHTML("(" + index + "::" + sum + ")");
                document.getElementById("controller_exec_ifOneArg").style.display = "inline";
                document.getElementById("controller_exec_ifMultipleArgs").style.display = "none";
                document.getElementById("controller_exec_arguments").style.display = "inline";
                document.getElementById("controller_exec_arguments").innerHTML = "Arguments";
            };
            
            stuff.getPreviousExecs(function (execs) {
                if (execs.length > 0) {
                    execs.reverse();
                    for (var i = 0; i < execs.length; i++) {
                        var option = document.createElement("option");
                        option.value = execs[i].index + "::" + execs[i].sum;
                        option.innerHTML = "<i>" + shared.escHTML(execs[i].path) + "</i>";
                        option.setAttribute("data-path", execs[i].path);
                        if (execs[i].args.length > 0) {
                            var newargs = [];
                            for (var j = 0; j < execs[i].args.length; j++) {
                                newargs.push(execs[i].args[j].replace(/ /g, "\\ "));
                            }
                            option.innerHTML += "&nbsp; &nbsp; &nbsp;" + shared.escHTML(newargs.join(" "));
                        }
                        document.getElementById("controller_exec_prev").appendChild(option);
                    }
                    document.getElementById("controller_exec_prev").addEventListener("change", function () {
                        var val = document.getElementById("controller_exec_prev").value;
                        var option = document.getElementById("controller_exec_prev").options[document.getElementById("controller_exec_prev").selectedIndex];
                        if (val && val.indexOf("::") != -1) {
                            var index = parseInt(val.substring(0, val.indexOf("::")), 10);
                            var sum = val.substring(val.indexOf("::") + 2);
                            if (!isNaN(index) && sum) {
                                stuff.getExecArgs([index, sum], function (result) {
                                    if (result.success) {
                                        success(index, sum, option.getAttribute("data-path"));
                                        window._exec_args = result.args;
                                        if (result.args.length > 0) {
                                            document.getElementById("controller_exec_ifOneArg").style.display = "none";
                                            document.getElementById("controller_exec_ifMultipleArgs").style.display = "inline";
                                            document.getElementById("controller_exec_arguments").innerHTML = "Arguments...";
                                        }
                                    } else {
                                        alert("Error loading executable data: " + result.error);
                                    }
                                });
                            }
                        }
                        document.getElementById("controller_exec_prev").value = "nil";
                    }, false);
                } else {
                    document.getElementById("controller_exec_prev_container").style.display = "none";
                }
            });
            
            document.getElementById("controller_exec_browse").addEventListener("click", function (event) {
                event.preventDefault();
                
                if (event.shiftKey) {
                    var path = prompt("Path:", window._exec_path || "");
                    if (path && shared.trim(path)) {
                        stuff.setExec([shared.trim(path)], function (result) {
                            if (result.success) {
                                success(result.index, result.sum, result.path);
                            } else {
                                alert("Error setting file path: " + result.error);
                            }
                        });
                    }
                } else {
                    stuff.browse(function (result) {
                        if (result.success) {
                            success(result.index, result.sum, result.path);
                        } else if (result.error) {
                            alert("Error browsing for file: " + result.error);
                        }
                    });
                }
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
                    stuff.setExecArgs([window._exec_index, window._exec_sum, window._exec_args], function (result) {
                        if (result.success) {
                            if (result.empty) {
                                document.getElementById("controller_exec_ifOneArg").style.display = "inline";
                                document.getElementById("controller_exec_ifMultipleArgs").style.display = "none";
                                document.getElementById("controller_exec_arguments").innerHTML = "Arguments";
                            } else {
                                document.getElementById("controller_exec_ifOneArg").style.display = "none";
                                document.getElementById("controller_exec_ifMultipleArgs").style.display = "inline";
                                document.getElementById("controller_exec_arguments").innerHTML = "Arguments...";
                            }
                        } else {
                            alert("Error setting arguments: " + result.error);
                        }
                    });
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
            document.getElementById("devicelist").addEventListener("change", controller_exec_change, false);
            
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