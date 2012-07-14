function closeall() {
    var frames = document.getElementsByTagName("iframe");
    for (var i = 0; i < frames.length; i++) {
        frames[i].contentWindow.closeconn();
    }
}