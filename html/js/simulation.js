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
 * Globals.
 */
// projection values
var startx = 0;
var starty = 0;
var startz = 6000;
var scale = 200;

/**
 * Player answer to server messages.
 */
var clientPlayer = function()
{
	// self-reference
	var self = this;

	// interval between updates in milliseconds
	var interval = 50;
	// id to clear interval
	var intervalId;
	// keep track of the websocket
	var websocket;
	// check if running
	var running = false;
	// number of updates per second
	var updates = 0;
	// latency total and map
	var latencies = 0;
	var latencyMap = {};

	$('#status').html('Press connect');

	/**
	 * Click on the connect or disconnect button.
	 */
	self.click = function()
	{
		if (!websocket)
		{
			connect();
			return;
		}
		disconnect();
		websocket = null;
	}
	$('#connect').click(self.click);

	/**
	 * Connect using a websocket.
	 */
	function connect()
	{
		console.log('connecting player ');
		var gameId = 'simulation';
		var playerId = 'human';
		// open websocket
		var wsUrl = 'ws://' + location.host + '/serve?game=' + gameId + '&player=' + playerId;
		websocket = new WebSocket(wsUrl);

		websocket.onopen = function ()
		{
			$('#status').text('Connected to ' + wsUrl);
		};

		/**
		 * Connection error.
		 */
		websocket.onerror = function (error)
		{
			console.error(error);
			$('#status').text('Error');
			$('#message').text(error);
		};

		/**
		 * Incoming message.
		 */
		websocket.onmessage = function (message)
		{
			// check it is valid JSON
			try
			{
				var json = JSON.parse(message.data);
			}
			catch (e)
			{
				console.error('This doesn\'t look like a valid JSON: ', message.data);
				return;
			}
			if (!json.type || !self[json.type])
			{
				console.error(json);
				$('#status').text('Invalid message type ' + json.type);
				return;
			}
			self[json.type](json);
		};

		/**
		 * The websocket was closed.
		 */
		websocket.onclose = function(message)
		{
			$('#status').text('Disconnected');
			disconnect();
		}

		console.log('connected player ');
		$('#connect').val('Disconnect');
	}

	/**
	 * Disconnect from the game.
	 */
	function disconnect()
	{
		websocket.close();
		$('#connect').val('Connect');
		websocket = null;
		if (running)
		{
			clearInterval(intervalId);
			// automatic reconnect
			setTimeout(connect, 100);
			running = false;
		}
		running = false;
	}

	/**
	 * Start the game.
	 */
	self.start = function()
	{
		$('#status').text('Simulation started!');
		intervalId = setInterval(self.requestUpdate, interval);
		running = true;
	}

	/**
	 * Request an update from the server.
	 */
	self.requestUpdate = function()
	{
		var id = Math.floor(Math.random() * 0x100000000).toString(16);
		var message = {
			type: 'update',
			id: id,
		};
		websocket.send(JSON.stringify(message));
		latencyMap[id] = new Date().getTime();
	}

	/**
	 * Update world.
	 */
	self.update = function(message)
	{
		if (!running)
		{
			console.error('Not running');
			return;
		}
		$('#simulation').clearCanvas();
		paintMilliEarth(message.milliEarth);
		for (var name in message.players)
		{
			paint(message.players[name]);
		}
		for (var name in message.arrows)
		{
			paintPolygon(message.arrows[name]);
		}
		updates ++;
		if (message.id in latencyMap)
		{
			var lastTime = latencyMap[message.id];
			var newTime = new Date().getTime();
			latencies += newTime - lastTime;
			delete latencyMap[message.id];
		}
	}

	/**
	 * Control heartbeat.
	 */
	function control(message)
	{
		if (!running)
		{
			return;
		}
		$('#status').text(updates + ' updates per second');
		$('#latency').text(Math.round(10 * latencies / updates) / 10);
		updates = 0;
		latencies = 0;
	}
	setInterval(control, 1000);

	/**
	 * The other part abandoned.
	 */
	self.abandoned = function(message)
	{
		$('#status').text('Your opponent abandoned!');
	}

	/**
	 * Show an error from the server.
	 */
	self.error = function(message)
	{
		$('#status').text('Server error: ' + message.message);
	}

	/**
	 * Paint the milliEarth.
	 */
	function paintMilliEarth(body)
	{
		$('#simulation').drawArc( {
				fillStyle: '#ccc',
				x: projectX(body.position.x, body.position.z),
				y: projectY(body.position.y, body.position.z),
				radius: project(body.radius, body.position.z)
		});
	}

	/**
	 * Paint a celestial body.
	 */
	function paint(body)
	{
		$('#simulation').drawArc( {
				fillStyle: '#000',
				x: projectX(body.position.x, body.position.z),
				y: projectY(body.position.y, body.position.z),
				radius: 1
		});
	}

	/**
	 * Paint a filled polygon sent by the server.
	 */
	function paintPolygon(polygon)
	{
		// The drawLine() object
		var draw = {
			strokeStyle: "#00f",
			strokeWidth: 1,
			rounded: true
		};
		// Add the points from the array to the object
		for (var i = 0; i < polygon.points.length; i += 1)
		{
			var point = polygon.points[i];
			draw['x' + (i+1)] = projectX(point.x, point.z);
			draw['y' + (i+1)] = projectY(point.y, point.z);
		}

		// Draw the line
		$("canvas").drawLine(draw);

	}

	/**
	 * Project a length on the z axis.
	 */
	function project(length, z)
	{
		return length / (z + startz) * scale;
	}

	/**
	 * Project the x coordinate.
	 */
	function projectX(x, z)
	{
		return project(x, z) + startx;
	}

	/**
	 * Project the y coordinate.
	 */
	function projectY(y, z)
	{
		return project(y, z) + starty;
	}
}

/**
 * Start the simulation.
 */
$(function () {

		$('#status').html('Starting');
		startx = $('#simulation').width() / 2;
		starty = $('#simulation').height() / 2;

		// player id sent to the server
		var playerId = 'dddddd';
		// game id
		var gameId = 'pppp';

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

		var player = new clientPlayer();
		player.click();
});

