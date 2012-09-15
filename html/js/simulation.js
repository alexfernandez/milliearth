"use strict";
/**
 * MilliEarth simulation.
 */

/**
 * Player answer to server messages.
 */
var clientPlayer = function(index)
{
	// self-reference
	var self = this;

	// keep track of the websocket
	var websocket;
	// check server latency
	var lastTime;

	// player index: 0 or 1
	self.index = index;

	$('#status' + index).html('Press connect');

	/**
	 * Click on the connect or disconnect button.
	 */
	function click()
	{
		if (!websocket)
		{
			connect();
			return;
		}
		disconnect();
		websocket = null;
	}
	$('#connect' + index).click(click);

	/**
	 * Connect using a websocket.
	 */
	function connect()
	{
		console.log('connecting player ' + index);
		var gameId = $('#gameid' + index).val();
		var playerId = $('#playerid' + index).val();
		// open websocket
		var wsUrl = 'ws://' + location.host + '/serve?game=' + gameId + '&player=' + playerId;
		websocket = new WebSocket(wsUrl);

		websocket.onopen = function ()
		{
			$('#status' + index).text('Connected to ' + wsUrl);
		};

		/**
		 * Connection error.
		 */
		websocket.onerror = function (error)
		{
			console.error(error);
			$('#status' + index).text('Error');
			$('#message' + index).text(error);
		};

		/**
		 * Incoming message.
		 */
		websocket.onmessage = function (message)
		{
			var newTime = new Date().getTime();
			if (lastTime)
			{
				$('#latency' + index).text(newTime - lastTime);
				lastTime = null;
			}
			$('#message' + index).html(message.data);
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
				$('#status' + index).text('Invalid message type ' + json.type);
				return;
			}
			self[json.type](json);
		};

		/**
		 * The websocket was closed.
		 */
		websocket.onclose = function(message)
		{
			$('#status' + index).text('Disconnected');
			websocket = null;
			$('#connect' + index).val('Connect');
		}

		console.log('connected player ' + index);
		$('#connect' + index).val('Disconnect');
	}

	/**
	 * Disconnect from the game.
	 */
	function disconnect()
	{
		websocket.close();
		$('#connect' + index).val('Connect');
	}

	/**
	 * Start the game.
	 */
	self.start = function()
	{
		$('#status' + index).text('Ready to fight!');
		$('#submit' + index).removeAttr('disabled');
		$('#punch' + index).submit(function() {
				var message = {
					type: 'hit',
					force: $('#force' + index).val(),
					position: {
						x: $('#x' + index).val(),
						y: $('#y' + index).val()
					}
				};
				websocket.send(JSON.stringify(message));
				lastTime = new Date().getTime();
				return false;
		});
	}

	/**
	 * Update world.
	 */
	self.update = function(message)
	{
		$('#status' + index).text('Update just arrived!');
		paint(message.milliearth);
		paint(message.player1);
		paint(message.player2);
	}

	/**
	 * The other part abandoned.
	 */
	self.abandoned = function(message)
	{
		$('#status' + index).text('Your opponent abandoned!');
	}

	self.error = function(message)
	{
		$('#status' + index).text('Server error: ' + message.message);
	}

	function paint(body)
	{
		$('#simulation');
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
});

