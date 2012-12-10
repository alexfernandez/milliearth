"use strict";
/**
 * MilliEarth connection to the server.
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
 * Connection to the server.
 */
var serverConnection = new function()
{
	// self-reference
	var self = this;

	// attributes
	var websocket = null;
	self.dispatcher = null;

	/**
	 * Connect using a websocket with game id and player id.
	 */
	self.connect = function(gameId, playerId)
	{
		var wsUrl = 'ws://' + location.host + '/serve?game=' + gameId + '&player=' + playerId;
		debug('Connecting to ' + wsUrl);
		websocket = new WebSocket(wsUrl);
		websocket.onopen = open;
		websocket.onerror = error;
		websocket.onmessage = receive;
		websocket.onclose = close;
		$('#connect').val('Disconnect');
	}

	/**
	 * The websocket is open.
	 */
	function open()
	{
		$('#message').text('Connected to ' + location.host);
	}

	/**
	 * Error on the websocket.
	 */
	function error(message)
	{
		error(message);
		$('#status').text('Error');
	}

	/**
	 * The websocket closes.
	 */
	function close(message)
	{
		$('#message').text('Disconnected');
		disconnect();
	}

	/**
	 * Receive a server message.
	 */
	function receive(message)
	{
		// check it is valid JSON
		try
		{
			var json = JSON.parse(message.data);
		}
		catch (e)
		{
			error('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}
		if (!json.type)
		{
			error('Missing message type: ' + json);
			return;
		}
		self.dispatcher.dispatch(json);
	}

	/**
	 * Disconnect from the server.
	 */
	self.disconnect = function()
	{
		if (websocket != null)
		{
			websocket.close();
		}
		$('#connect').val('Connect');
		websocket = null;
		player.end();
	}

	/**
	 * Send a message to the server.
	 */
	self.send = function(message)
	{
		websocket.send(JSON.stringify(message));
	}
}

