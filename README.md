# Haunted House Logistics Server (HHLS)

## About

HHLS is a server-client system written entirely in JavaScript (node.js on the server, browser-based JS on the client) that can be used to automatically control lighting and sound effects throughout a building (as the name suggests, it was originally created to run a haunted house).

Multiple computers throughout the building can connect to the server through a web browser as either a *control* (a computer that controls the effects) or a *client* (a computer that receives the effects and relays it to the external lighting). The *client* can be connected to external lighting or other electrical things in a variety of ways (in reality, the sky is the limit - common methods include the use of photoelectric switches positioned against the computer screen or software that hooks in with the HHLS API to control special hardware).

The *control* allows the user to run effects on different channels to which the clients throughout the building are connected. It has simple systems for timed sequences of effects and keyboard shortcuts. Additionally, the *control* has built-in support for video presentations (and for syncing effects with the video).

Another interesting feature of HHLS is a basic live camera monitoring system (entirely separate from the rest of the system). This allows a computer connected to the server to remotely monitor any computer with a webcam attached that is connected to the camera monitoring system. NOTE: Work on this is still in progress, and it is based on WebRTC, which is commonly only available in the beta or nightly builds of most browsers.

## License

Copyright (C) 2012  Jake Hartz

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
