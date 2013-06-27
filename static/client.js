window.onload = function () {
    if (document.getElementById && document.getElementById("customizer_span") && document.addEventListener && document.createElement) {
        if (navigator.userAgent.indexOf("Firefox") != -1) {
            document.getElementById("client_addon_container").style.display = "block";
        }
        
        document.getElementById("customizer_span").innerHTML += '<input id="customizer_input1" name="layout_x" size="2" type="number" min="1" max="9">x<input id="customizer_input2" name="layout_y" size="2" type="number" min="1" max="9">';
        
        document.getElementById("customizer_select").addEventListener("change", function (event) {
            if (this.value == "custom") {
                document.getElementById("customizer_span").style.visibility = "visible";
                document.getElementById("customizer_input1").pattern = document.getElementById("customizer_input2").pattern = "[1-9]";
            } else {
                document.getElementById("customizer_span").style.visibility = "hidden";
                document.getElementById("customizer_input1").pattern = document.getElementById("customizer_input2").pattern = "*";
            }
        }, false);
        
        var option = document.createElement("option");
        option.value = "custom";
        option.innerText = option.textContent = "Custom";
        document.getElementById("customizer_select").appendChild(option);
        
        document.getElementById("customizer_form").addEventListener("submit", function (event) {
            if (document.getElementById("customizer_select").value != "custom") {
                document.getElementById("customizer_span").innerHTML = "";
            }
        }, false);
    }
};