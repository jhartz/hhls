// Haunted House Logistics Server - config file

exports.PORT = process.env.PORT || 80;

// Directory in which videos are stored (see examples/videos/README)
// default: "videos"
exports.VIDEO_DIR = "examples/videos";

// Directory in which sounds are stored (see examples/sounds/README)
// default: "sounds"
exports.SOUND_DIR = "examples/sounds";

// Directory in which resources are stored (see examples/resources/README)
// default: "resources"
exports.RESOURCES_DIR = "examples/resources";

// Directory in which settings are stored (must be writable by node process)
// default: "settings"
exports.SETTINGS_DIR = "examples/settings";