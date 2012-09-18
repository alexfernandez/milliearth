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


var paintingProjection = function(startx, starty, startz, scale)
{
	// self-reference
	var self = this;

	/**
	 * Project the x coordinate.
	 */
	self.projectX = function(x, z)
	{
		return self.project(x, z) + startx;
	}

	/**
	 * Project the y coordinate.
	 */
	self.projectY = function(y, z)
	{
		return self.project(y, z) + starty;
	}

	/**
	 * Project a length on the z axis.
	 */
	self.project = function(length, z)
	{
		return length / (z + startz) * scale;
	}
}

/**
 * A painting layer.
 */
var paintingLayer = function(name, projection)
{
	// self-reference
	var self = this;

	var canvas = $('#simulation');

	/**
	 * Clear the layer.
	 */
	self.clear = function()
	{
	}

	/**
	 * Show the layer.
	 */
	self.show = function()
	{
	}

	/**
	 * Paint the milliEarth.
	 */
	self.paintMilliEarth = function(body)
	{
		canvas.drawArc( {
				layer: true,
				name: name,
				fillStyle: '#ccc',
				x: projection.projectX(body.position.x, body.position.z),
				y: projection.projectY(body.position.y, body.position.z),
				radius: projection.project(body.radius, body.position.z),
				opacity: 0.5
		});
	}

	/**
	 * Paint a celestial body.
	 */
	self.paint = function(body)
	{
		var radius = Math.max(projection.project(body.radius, body.position.z), 1);
		canvas.drawArc( {
				layer: true,
				name: name,
				fillStyle: '#000',
				x: projection.projectX(body.position.x, body.position.z),
				y: projection.projectY(body.position.y, body.position.z),
				radius: radius,
		});
	}

	/**
	 * Paint a filled polygon sent by the server.
	 */
	self.paintPolygon = function(polygon)
	{
		// The drawLine() object
		var draw = {
			layer: true,
			name: name,
			strokeStyle: "#00f",
			strokeWidth: 1,
			rounded: true
		};
		// Add the points from the array to the object
		for (var i = 0; i < polygon.points.length; i += 1)
		{
			var point = polygon.points[i];
			draw['x' + (i+1)] = projection.projectX(point.x, point.z);
			draw['y' + (i+1)] = projection.projectY(point.y, point.z);
		}
		// Draw the line
		canvas.drawLine(draw);
	}
}

/**
 * Player answer to server messages.
 */
var clientPlayer = function()
{
	// self-reference
	var self = this;

	// keep track of the websocket
	var websocket;
	// check if running
	var running = false;
	// interval between updates in milliseconds
	var updateInterval = 50;
	// id to clear interval
	var updateIntervalId;
	// interval between global update
	var globalInterval = 1000;
	var globalMessage = null;
	// id to clear global interval
	var globalIntervalId;
	// number of updates per second
	var updates = 0;
	// latency total and map
	var latencies = 0;
	var latencyMap = {};
	// layers
	var width = $('#simulation').width();
	var height = $('#simulation').height();
	var mainProjection = new paintingProjection(width / 2, height / 2, 10, 4/5 * height);
	var mainLayer = new paintingLayer('main', mainProjection);
	var globalProjection = new paintingProjection(width * 7 / 8, height / 8, 6000, 4/5 * height / 8);
	var globalLayer = new paintingLayer('global', globalProjection);

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
			clearInterval(updateIntervalId);
			clearInterval(globalIntervalId);
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
		updateIntervalId = setInterval(self.requestSightUpdate, updateInterval);
		globalIntervalId = setInterval(self.requestGlobalUpdate, globalInterval);
		running = true;
	}

	/**
	 * Request a line-of-sight update from the server.
	 */
	self.requestSightUpdate = function(type)
	{
		self.requestUpdate('update');
	}

	/**
	 * Request a global update from the server.
	 */
	self.requestGlobalUpdate = function(type)
	{
		self.requestUpdate('global');
	}

	/**
	 * Request an update from the server ('update' or 'global').
	 */
	self.requestUpdate = function(type)
	{
		var id = Math.floor(Math.random() * 0x100000000).toString(16);
		var message = {
			type: type,
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
		$('#message').text(JSON.stringify(message));
		countUpdate(message.id);
		$('#simulation').clearCanvas();
		mainLayer.clear();
		for (var name in message.sight)
		{
			mainLayer.paint(message.sight[name]);
		}
		paintGlobalUpdate();
	}

	/**
	 * Global update for the whole world.
	 */
	self.global = function(message)
	{
		if (!running)
		{
			console.error('Not running');
			return;
		}
		globalMessage = message;
	}

	/**
	 * Paint the latest global update we have."
	 */
	function paintGlobalUpdate()
	{
		if (!globalMessage)
		{
			return;
		}
		globalLayer.paintMilliEarth(globalMessage.milliEarth);
		for (var name in globalMessage.players)
		{
			globalLayer.paint(globalMessage.players[name]);
		}
		for (var name in globalMessage.arrows)
		{
			globalLayer.paintPolygon(globalMessage.arrows[name]);
		}
		globalLayer.show();
	}

	function countUpdate(id)
	{
		updates ++;
		if (id in latencyMap)
		{
			var lastTime = latencyMap[id];
			var newTime = new Date().getTime();
			latencies += newTime - lastTime;
			delete latencyMap[id];
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
}

/**
 * Start the simulation.
 */
$(function () {

		$('#status').html('Starting');

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

