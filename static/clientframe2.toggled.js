oneffectplay = function (prop) {
    switch (prop.state) {
        case 1:
            status("Toggled on");
            on();
            break;
        case 0:
            status("Toggled off");
            off();
            break;
        default:
            status("Toggled");
            toggle();
    }
};