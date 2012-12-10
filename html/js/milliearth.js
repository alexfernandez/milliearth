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
	var player = null;

	/**
	 * Initialize the simulation.
	 */
	self.init = function()
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

		player = new clientPlayer($('#simulation'));
		$('#connect').click(clickButton);
		$('#canvas').click(clickCanvas);
		connect();
		optionSelector.init();
		optionSelector.selectLast();
	}

	/**
	 * Click on the connect or disconnect button.
	 */
	function clickButton()
	{
		disconnect();
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
		serverConnection.dispatcher = self;
		serverConnection.connect(gameId, player.playerId);
	}

	/**
	 * Dispatch a message from the server.
	 */
	function dispatch(json)
	{
		if (json.type == 'code')
		{
			codeEditor.showCode(json);
			return;
		}
		if (player[json.type])
		{
			player[json.type](json);
			return;
		}
		error('Invalid message type ' + json.type);
	}

	/**
	 * Disconnect from the game.
	 */
	function disconnect()
	{
		serverConnection.disconnect();
		player.end();
	}
}

