"use strict";
/**
 * MilliEarth simulation.
 */

/**
 * Player answer to server messages.
 */
var clientPlayer = function()
{
	// self-reference
	var self = this;

	// interval between updates in milliseconds
	var interval = 1000;
	// keep track of the websocket
	var websocket;
	// check server latency
	var lastTime;

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
			var newTime = new Date().getTime();
			if (lastTime)
			{
				$('#latency').text(newTime - lastTime);
				lastTime = null;
			}
			$('#message').html(message.data);
			console.log(message.data);
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
			websocket = null;
			$('#connect').val('Connect');
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
	}

	/**
	 * Start the game.
	 */
	self.start = function()
	{
		$('#status').text('Simulation started!');
		setInterval(self.requestUpdate, interval);
	}

	/**
	 * Request an update from the server.
	 */
	self.requestUpdate = function()
	{
		var message = {
			type: 'update',
		};
		websocket.send(JSON.stringify(message));
		lastTime = new Date().getTime();
	}

	/**
	 * Update world.
	 */
	self.update = function(message)
	{
		$('#status').text('Update just arrived!');
		paint(message.milliEarth);
		paint(message.player1);
		paint(message.player2);
	}

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
	 * Paint a celestial body.
	 */
	function paint(body)
	{
		var zstart = 6000;
		var scale = 200;
		var startx = 400;
		var starty = 200;
		var x = body.position.x / (body.position.z + 6000) * scale + startx;
		var y = body.position.y / (body.position.z + 6000) * scale + starty;
		console.log('At ' + x + ', ' + y);
		$('#simulation').drawArc( {
				fillStyle: 'black',
				x: x,
				y: y,
				radius: 5
		} );
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

