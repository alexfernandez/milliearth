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
	var initialized = false;
	self.dispatcher = null;

	/**
	 * Connect using a websocket with game id and player id.
	 */
	self.connect = function(gameId, playerId, callback)
	{
		var wsUrl = 'ws://' + location.host + '/serve?game=' + gameId + '&player=' + playerId;
		debug('Connecting to ' + wsUrl);
		websocket = new WebSocket(wsUrl);
		websocket.onopen = getOpener(callback);
		websocket.onerror = self.error;
		websocket.onmessage = receive;
		websocket.onclose = closed;
		$('#connect').val('Disconnect');
	}

	/**
	 * Get an opener function called after the websocket is open,
	 * which initializes and run the callback.
	 */
	function getOpener(callback)
	{
		return function() {
			$('#message').text('Connected to ' + location.host);
			initialized = true;
			callback();
		};
	}

	/**
	 * Error on the websocket.
	 */
	self.error = function(message)
	{
		error(message);
		$('#status').text('Error');
	}

	/**
	 * The websocket closes.
	 */
	function closed(message)
	{
		$('#message').text('Disconnected');
		self.disconnect();
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
	 * Send a message to the server.
	 */
	self.send = function(message)
	{
		if (websocket == null)
		{
			error('No connection');
			return;
		}
		if (!initialized)
		{
			error('Websocket not open yet');
			return;
		}
		websocket.send(JSON.stringify(message));
	}

	/**
	 * Find out if the connection is open or not.
	 */
	self.isConnected = function()
	{
		return (websocket != null);
	}

	/**
	 * Disconnect from the server.
	 */
	self.disconnect = function()
	{
		if (websocket == null)
		{
			// already disconnected
			return;
		}
		var pending = websocket;
		websocket = null;
		pending.close();
		$('#connect').val('Connect');
		self.dispatcher.disconnect();
	}
}

