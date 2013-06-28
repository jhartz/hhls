# Haunted House Logistics Server (HHLS)

## About

HHLS is a server-client system written entirely in JavaScript (node.js on the server, browser-based JS on the client) that can be used to automatically control lighting, sound, and other effects throughout a building (as the name suggests, it was originally created to run the effects for a haunted house).

Once the node.js HTTP server is started, multiple computers throughout the building can connect to the server through a web browser as either a *control* (a computer that controls the effects) or a *client* (a computer that receives the effects and relays it to the external lighting/sound/etc.).

### Controls

The *control* allows the user to run effects on different channels to which the clients throughout the building are connected. It has simple systems for timed sequences of effects and keyboard shortcuts. Additionally, the *control* has built-in support for video presentations (and for syncing effects with the video).

### Clients

The *client* can be connected to external lighting or other electrical devices in a variety of ways (in reality, the sky is the limit - common methods include the use of photoelectric switches positioned against the computer screen or software that hooks in with the HHLS Client Add-on (see `components/addon/README`) to control special hardware).

### Cameras

Another interesting feature of HHLS is a basic live camera monitoring system (entirely separate from the rest of the system). This allows a computer connected to the server to remotely monitor any computer with a webcam attached that is connected to the camera monitoring system. NOTE: Work on this is still in progress, and it is based on WebRTC, which is commonly only available in the beta or nightly builds of most browsers.

## Pre-reqs

The computer acting as the server must have a recent version of [node.js](http://www.nodejs.org/) and [npm](https://npmjs.org/) (usually installed with node.js). Additionally, to install dependencies and start the server, you should have basic experience using the terminal.

Any computers connecting to the server as a *control* or a *client* must have a modern web browser, such as the latest version of Firefox or Chrome. The HHLS Client Add-on (optional) requires Firefox 14 or later.

## Getting Started

1. Install the node.js dependencies by running `npm install` inside the root directory. Also, make sure the submodule in `modules/jsonsettings/` is there (if you cloned the git repo, run `git submodule init` and/or `git submodule update`).
2. If desired, modify the config in `config.js`.
    - `exports.PORT` is the port on which the HTTP server will run.
    - `exports.VIDEOS_DIR` is a directory containing videos for use by the HHLS *control*, if you choose to use this feature.
    - `exports.SOUNDS_DIR` is a directory containing any sounds used as part of the effects.
    - `exports.RESOURCES_DIR` is a directory containing any downloads or resources that should be made available to other computers on the network (see step 4).
    - `exports.SETTINGS_DIR` is a directory where the HHLS server stores its data; it **must** be writable by the node process.
3. Start the server by running `scripts/dev` or `node server.js`.
4. From a web browser on the server or another computer on the network, connect to the server through the port specified in `config.js` (example: `http://my.server.ip.here:8080`). If all goes well, you will reach a page with two sections: on the left are links to the different parts of HHLS, and on the right are a list of the files available for download from the directory specified by `exports.RESOURCES_DIR` in `config.js`. This can be used as a simple system for distributing necessary files to other computers on the network.
5. Start by clicking "Control" to go the control page. This page is broken up into sections; to minimize an opened section, click its title bar, or to maximize a minimized section, click its button in the bar at the bottom of the page. Using the sections on the control page, you can...
    - set up different channels on which clients can listen ("Manage Channels" button in "Effects Controller" section)
    - manually send effects to clients ("Effects Controller" section)
    - make keyboard shortcuts for effects ("Keyboard Shortcuts" button in "Effects Controller") 
    - create timed sequences of effects ("Sequences" section)
    - show a video (optionally on another monitor or screen) with effects synced to it; see `examples/videos/README` ("Video" section)
    - show an embedded client page in the control page for testing ("Mini-Client" section)
    - see details about any clients connected to the server ("Server Connection" section)
6. On other computers, use a web browser to connect to the server (like in step 4), but instead of clicking "Control", click "Client". Here, after entering details to differentiate this client from the others, you can set up the client to listen on any of the channels that you created in step 5, bullet 1. Additionally, if you're using Firefox, you can install the HHLS Client Add-on for more ways to control devices using the client.

This is the simplest way to get started using HHLS. However, HHLS is not a one-method-fits-all system. From here, you must figure out how you can make HHLS work for your needs. If you have any questions, feel free to contact me (jhartz) on GitHub, or if you find any bugs or have any ideas to improve HHLS, please [file an issue report on GitHub](https://github.com/jhartz/hhls/issues).

## License

Copyright (C) 2013  Jake Hartz

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
