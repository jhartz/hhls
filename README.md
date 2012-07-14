# Haunted House Logistics Server (HHLS)

## About

HHLS is a server-client system written entirely in JavaScript (node.js on the server, browser-based JS on the client) that can be used to automatically control lighting and sound effects throughout a building (as the name suggests, it was originally created to service a haunted house).

Multiple computers throughout the building can connect through a web browser to either the *control* (to control the effects) or the *client* (to receive the effects). The *client* can be connected to external lighting or other electrical things in a variety of ways (in reality, the sky is the limit - common methods include the use of photoelectric switches positioned against the computer screen or software that hooks in with the HHLS API to control special hardware).

Additionally, the *control* has built-in support for video presentations (and for syncing effects with the video), and a microphone hooked up to a computer connected as a *control* can be used as an intercom system to broadcast an audio message to each computer connected as a *client*.

Another interesting feature of HHLS is a basic live security camera system (entirely separate from the rest of the system). This allows any computer with a webcam to be used as a monitor, visible from any computer connected as a security camera viewer.

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
