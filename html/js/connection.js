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

	/**
	 * Connect with the given callback.
	 */
	self.connect = function(callback)
	{
		var wsUrl = 'ws://' + location.host + '/serve?player=' + getPlayerId();
		debug('Connecting to ' + wsUrl);
		websocket = new WebSocket(wsUrl);
		websocket.onopen = getOpener(callback);
		websocket.onerror = self.error;
		websocket.onmessage = receive;
		websocket.onclose = closed;
		$('#connect').val('Disconnect');
	}

	/**
	 * Get the player id, always the same.
	 */
	function getPlayerId()
	{
		// have a single player id per browser; commented for tests.
		if (!localStorage['playerId'])
		{
			localStorage['playerId'] = randomId();
		}
		return localStorage['playerId'];
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
			if (callback)
			{
				callback();
			}
			clientPlayer.fight();
		};
	}

	/**
	 * Error on the websocket.
	 */
	self.error = function(event)
	{
		error('Connection error: ' + event);
		$('#status').text('Connection error');
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
	function receive(rawMessage)
	{
		// check it is valid JSON
		try
		{
			var message = JSON.parse(rawMessage.data);
		}
		catch (e)
		{
			error('This doesn\'t look like a valid JSON: ', rawMessage.data);
			return;
		}
		if (!message.type)
		{
			error('Missing message type: ' + message);
			return;
		}
		if (clientPlayer[message.type])
		{
			clientPlayer[message.type](message);
			return;
		}
		error('Invalid message type ' + message.type);
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
		clientPlayer.end();
	}
}

