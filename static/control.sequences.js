var sequences = {
    init: function () {
        $("#ctrl_sequences > footer button").click(function () {
            if ($(this).hasClass("active")) {
                sequences.toggle("main");
            } else {
                sequences.toggle($(this).attr("data-btn"));
            }
        });
        
        // Load settings
        this.update_sequences();
    },
    
    toggle: function (newbie, oncomplete) {
        toggle_buttonbox("sequences", newbie, oncomplete);
    },
    
    update_sequences: function () {
        // TODO
    }
};

init.push(function () {
    sequences.init();
});

onConnection.push(function () {
    sequences.toggle("main");
});
onNoConnection.push(function () {
    sequences.toggle("waiting");
});

settings_onupdate.sequences.push(function () {
    sequences.update_sequences();
});