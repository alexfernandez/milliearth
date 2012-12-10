"use strict";
/**
 * MilliEarth simulation.
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
 * Main MilliEarth object.
 */
var milliEarth = new function()
{
	// self-reference
	var self = this;

	// attributes
	var websocket = null;

	/**
	 * Start the simulation.
	 */
	self.start = function()
	{
		$('#status').html('Starting');

		// if user is running mozilla then use it's built-in WebSocket
		window.WebSocket = window.WebSocket || window.MozWebSocket;

		// if browser doesn't support WebSocket, just show some notification and exit
		if (!window.WebSocket)
		{
			$('#status1').html('Browser error');
			$('#status2').html('Browser error');
			$('#message').html('<p>Sorry, but your browser doesn\'t support WebSockets.</p>' );
			$('#submit').hide();
			$('input').hide();
			return;
		}

		$(document).keydown(keymap.keydown);
		$(document).keyup(keymap.keyup);
		$(document).blur(keymap.blur);

		var player = new clientPlayer($('#simulation'));
		$('#connect').click(clickButton);
		$('#canvas').click(clickCanvas);
		connect();
	}

	/**
	 * Click on the connect or disconnect button.
	 */
	function clickButton()
	{
		if (!websocket)
		{
			connect();
			return;
		}
		disconnect(false);
		websocket = null;
	}

	/**
	 * Manage a click on the canvas: reconnect if disconnected.
	 */
	function clickCanvas()
	{
		if (!websocket)
		{
			connect();
		}
	}

	/**
	 * Connect using a websocket using a random game id.
	 */
	function connect()
	{
		var gameId = randomId();
		// open websocket
		var wsUrl = 'ws://' + location.host + '/serve?game=' + gameId + '&player=' + playerId;
		websocket = new WebSocket(wsUrl);

		websocket.onopen = function ()
		{
			$('#message').text('Connected to ' + wsUrl);
		};

		/**
		 * Connection error.
		 */
		websocket.onerror = function (error)
		{
			error(error);
			$('#status').text('Error');
		};

		/**
		 * Incoming message.
		 */
		websocket.onmessage = dispatch;

		/**
		 * The websocket was closed.
		 */
		websocket.onclose = function(message)
		{
			$('#message').text('Disconnected');
			disconnect(false);
		}
		$('#connect').val('Disconnect');
	}

	/**
	 * Dispatch a websocket message.
	 */
	function dispatch(message)
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
		if (self[json.type])
		{
			self[json.type](json);
			return;
		}
		player.dispatch(json);
	}

	/**
	 * Disconnect from the game.
	 */
	function disconnect(reconnect)
	{
		if (websocket != null)
		{
			websocket.close();
		}
		$('#connect').val('Connect');
		websocket = null;
		player.end();
		if (reconnect)
		{
			// automatic reconnect
			setTimeout(connect, 100);
		}
	}

	/**
	 * Request the code for a computer player.
	 */
	self.requestCode = function()
	{
		debug('Requesting code');
		var message = {
			type: 'code',
		}
		websocket.send(JSON.stringify(message));
	}

	/**
	 * Receive the code for a computer player.
	 */
	self.code = function(message)
	{
		codeEditor.showCode(message.contents);
	}

	/**
	 * Send the code for a computer player.
	 */
	self.sendCode = function()
	{
		debug('Sending code');
		var message = {
			type: 'install',
			contents: $('#editor').val(),
		}
		websocket.send(JSON.stringify(message));
	}
}

