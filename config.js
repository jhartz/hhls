// Haunted House Logistics Server - config file

// Port on which to run the HTTP server
// default: process.env.PORT || 8080
exports.PORT = 80;

// Directory in which videos are stored (see examples/videos/README)
// default: "content/videos"
exports.VIDEOS_DIR = "examples/videos";

// Directory in which sounds are stored (see examples/sounds/README)
// default: "content/sounds"
exports.SOUNDS_DIR = "examples/sounds";

// Directory in which resources are stored (see examples/resources/README)
// default: "content/resources"
exports.RESOURCES_DIR = "examples/resources";

// Directory in which settings are stored (must be writable by node process)
// default: "content/settings"
exports.SETTINGS_DIR = "examples/settings";
