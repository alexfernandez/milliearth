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
	var keycodes = {};
	var keypresses = {};

	var eventMap = {
		65: {key: 'a', event: 'accelerate'},
		83: {key: 's', event: 'brake'},
		37: {key: '←', event: 'turnLeft'},
		38: {key: '↑', event: 'turnUp'},
		39: {key: '→', event: 'turnRight'},
		40: {key: '↓', event: 'turnDown'},
		46: {key: 'Del', event: 'rollLeft'},
		34: {key: 'Down', event: 'rollRight'},
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
		if (keycode in keycodes)
		{
			// already pressed
			return false;
		}
		keycodes[keycode] = event.timeStamp;
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
		var end = event.timeStamp;
		var start = keycodes[keycode];
		if (start)
		{
			var time = end - start;
			if (!(keycode in keypresses))
			{
				keypresses[keycode] = 0;
			}
			keypresses[keycode] += time;
		}
		delete keycodes[keycode];
		return true;
	}

	/**
	 * Get all keys pressed since last time.
	 */
	self.getKeys = function()
	{
		var end = new Date().getTime();
		var recordedEvents = {};
		for (var keycode in keycodes)
		{
			var time = end - keycodes[keycode];
			addKeycode(recordedEvents, keycode, time);
			keycodes[keycode] = end;
		}
		for (var keycode in keypresses)
		{
			addKeycode(recordedEvents, keycode, keypresses[keycode]);
			delete keypresses[keycode]
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
		var start = keycodes[keycode];
		if (!(event in recordedEvents))
		{
			recordedEvents[event] = 0;
		}
		recordedEvents[event] += time;
	}
}

