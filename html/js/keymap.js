"use strict";
/**
 * MilliEarth key mapping.
 * (C) 2012 Alex Fernández.
 *
 * This file is part of MilliEarth.
 *
 * MilliEarth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MilliEarth is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with MilliEarth.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Map of keys.
 */
var keymap = new function()
{
	// self-reference
	var self = this;

	// current keycode
	var keysPressed = {};
	var keysReleased = {};
	var notSent = 1;
	var sent = 2;

	var eventMap = {
		65: {key: 'a', event: 'accelerate'},
		83: {key: 's', event: 'brake'},
		37: {key: '←', event: 'turnLeft'},
		38: {key: '↑', event: 'turnUp'},
		39: {key: '→', event: 'turnRight'},
		40: {key: '↓', event: 'turnDown'},
		79: {key: 'o', event: 'rollLeft'},
		80: {key: 'p', event: 'rollRight'},
		32: {key: 'Space', event: 'shoot', single: true},
	};

	/**
	 * A key has been pressed.
	 */
	self.keydown = function(event)
	{
		var keycode = event.which;
		$('#keycode').text(keycode);
		if (!(keycode in eventMap))
		{
			return true;
		}
		if (keycode in keysPressed)
		{
			// already pressed
			return false;
		}
		if (isSinglePress(keycode))
		{
			keysPressed[keycode] = notSent;
		}
		else
		{
			keysPressed[keycode] = event.timeStamp;
		}
		return false;
	}

	/**
	 * A key has been released.
	 */
	self.keyup = function(event)
	{
		var keycode = event.which;
		if (!(keycode in eventMap))
		{
			return false;
		}
		if (!isSinglePress(keycode))
		{
			var end = event.timeStamp;
			var start = keysPressed[keycode];
			if (start)
			{
				var time = end - start;
				if (!(keycode in keysReleased))
				{
					keysReleased[keycode] = 0;
				}
				keysReleased[keycode] += time;
			}
		}
		delete keysPressed[keycode];
		return true;
	}

	/**
	 * Lose focus; depress all pressed keys.
	 */
	self.blur = function()
	{
		for (var keycode in keysPressed)
		{
			self.keyup({
				which: keycode,
				timeStamp: new Date().getTime(),
			});
		}
	}

	/**
	 * Get all keys pressed since last time.
	 */
	self.getKeys = function()
	{
		var end = new Date().getTime();
		var recordedEvents = {};
		for (var keycode in keysPressed)
		{
			if (isSinglePress(keycode))
			{
				if (keysPressed[keycode] == notSent)
				{
					addKeycode(recordedEvents, keycode, sent);
					keysPressed[keycode] = sent;
				}
			}
			else
			{
				var time = end - keysPressed[keycode];
				addKeycode(recordedEvents, keycode, time);
				keysPressed[keycode] = end;
			}
		}
		for (var keycode in keysReleased)
		{
			addKeycode(recordedEvents, keycode, keysReleased[keycode]);
			delete keysReleased[keycode]
		}
		return recordedEvents;
	}

	/**
	 * Add a keycode to the map of recordedEvents.
	 */
	function addKeycode(recordedEvents, keycode, time)
	{
		if (!keycode in eventMap)
		{
			console.err('Unknown keycode ' + keycode);
			return;
		}
		var event = eventMap[keycode].event;
		var start = keysPressed[keycode];
		if (!(event in recordedEvents))
		{
			recordedEvents[event] = 0;
		}
		recordedEvents[event] += time;
	}

	/**
	 * Find out if the key fires only once when pressed.
	 */
	function isSinglePress(keycode)
	{
		return eventMap[keycode].single;
	}

	/**
	 * Display the key map.
	 */
	self.display = function(element)
	{
		var table = $('<table>').attr('id', 'keymap-table');
		for (var keycode in eventMap)
		{
			var event = eventMap[keycode];
			var row = $('<tr>');
			row.append($('<td>').text(event.key));
			row.append($('<td>').text(event.event));
			table.append(row);
		}
		element.append(table);
	}
}

