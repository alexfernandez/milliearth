MilliEarth
==========

MilliEarth is a fast-paced spaceship fight game, with macros.

Installation and Requirements
=============================

MilliEarth requires node.js to run on the server, and an HTML5-compliant
 browser in the client.

Server: install node.js. Install the module websocket:
  $ npm install websocket
Now go to the root directory and run:
  $ node src/milliearth.js
Optionally install supervisor, as root and globally:
  # npm install supervisor -g
and run using supervisor:
  $ supervisor src/milliearth.js

Debian-specific instructions: package nodejs is only in unstable (sid).
 If you want to run MilliEarth on port 80 you will need libcap2-bin:
  # apt-get install libcap2-bin
  # setcap 'cap_net_bind_service=+ep' /usr/local/bin/node
to give the permission cap_net_bind_service to node.js.

Client: just point your browser to the port configured in src/params.js:
    // the default port
    this.port = 80;
For port 80 you can omit it:
  http://localhost/
and enjoy!

Gameplay
========

Two or more players engage in a mortal battle on MilliEarth: a unique
 asteroid beyond the orbit of Neptune. MilliEarth has one thousand of the
 Earth's orbit, and its weight is about one millionth -- by a phenomenal
 coincidence, its gravity very closely matches Earth's 9.8 m/s².

Point your cannon at the enemy and shoot! You can also move around, and even
 (if you accelerate fast enough) start flying in orbit. Be careful with enemy
 shots and with violent crashes.

Multi-player: press the "find opponent" button and look for an opponent that
 matches your skills.

Atescript
========

One essential part of MilliEarth is to be able to develop your own enemies.
 Use atescript to control the computer and do amazing feats of space-battle-
 craft-man-ship, if that makes any sense at all.

Just edit the script that appears at the right of your computer opponent and
 start hacking!

See the enclosed file doc/atescript.txt for more info.

License
=======

(C) 2012 Alex Fernández.

MilliEarth is published under the GPL. See the file LICENSE.txt for details.

 This file is part of MilliEarth.

 MilliEarth is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 MilliEarth is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with MilliEarth.  If not, see <http://www.gnu.org/licenses/>.


