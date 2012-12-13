"use strict";
/**
 * MilliEarth rival players.
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
 * List of rivals from the server.
 */
var rivalList = new function()
{
	// self-reference
	var self = this;

	// attributes
	var list = [];

	/**
	 * Request a list of rivals from the server.
	 */
	self.requestRivals = function()
	{
		serverConnection.send({
			type: 'rivals',
		});
	}

	/**
	 * Get the list of rivals and display it.
	 */
	self.receiveRivals = function(message)
	{
		var contents = $('<div>');
		if (message.rivals.length == 0)
		{
			contents.append($('<div class="heading">').html('No rivals'));
			optionSelector.display(contents);
			return;
		}
		var contents = $('<div>').append($('<div class="heading">').html('Rivals'));
		for (var index in message.rivals)
		{
			var rival = message.rivals[index];
			var box = $('<div class="rival">').html(rival.playerId);
			contents.append(box);
		}
		optionSelector.display(contents);
	}
}

