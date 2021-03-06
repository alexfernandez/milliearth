'use strict';
/**
 * MilliEarth Runtime parameters.
 * (C) 2012 Alex Fernández
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
 * Prototypes.
 */
String.prototype.endsWith = function(suffix)
{
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

/**
 * Requirements.
 */
var WebSocketClient = require('websocket').client;
var log = require('./util/log.js');
var debug = log.debug;
var info = log.info;
var error = log.error;

/**
 * Globals.
 */
var concurrency = 10;
var requestsSecond = 20;
var secondsMeasured = 5;
var server = 'localhost:80';
if (process.argv.length > 2)
{
	server = process.argv[2];
}

/**
 * Latency measurements.
 */
var latency = new function()
{
	// self-reference
	var self = this;

	// attributes
	var requests = {};
	var measurements = [];
	var index = 0;
	var max = concurrency * requestsSecond * secondsMeasured;
	var total = 0;

	/**
	 * Start the request with the given id.
	 */
	self.start = function(requestId)
	{
		requests[requestId] = Date.now();
	}

	/**
	 * Compute elapsed time and add the measurement.
	 */
	self.end = function(requestId)
	{
		if (!(requestId in requests))
		{
			console.error('Message id ' + requestId + ' not found');
			return;
		}
		add(Date.now() - requests[requestId]);
		delete requests[requestId];
	}

	/**
	 * Add a new measurement, possibly removing an old one.
	 */
	function add(value)
	{
		measurements.push(value);
		total += value;
		if (measurements.length > max)
		{
			var removed = measurements.shift();
			total -= removed;
		}
		index++;
		debug('Index: ' + index);
		if (index > max)
		{
			var mean = total / measurements.length;
			info('Mean latency: ' + mean);
			index = 0;
		}
	}
}

/**
 * A player in the game.
 */
function gamePlayer(gameId, playerId)
{
	// self-reference
	var self = this;

	// attributes
	self.gameId = gameId;
	self.playerId = playerId;
	var connection;
	var lastCall;

	/**
	 * Start the websocket client.
	 */
	self.start = function()
	{
		var client = new WebSocketClient();
		client.on('connectFailed', function(error) {
				error('Connect Error: ' + error.toString());
		});
		client.on('connect', connect);
		var url = 'ws://' + server + '/serve?game=' + gameId + '&player=' + playerId;
		client.connect(url, []);
		info('WebSocket client connected to ' + url);
	}

	/**
	 * Connect the player.
	 */
	function connect(localConnection)
	{
		connection = localConnection;
		connection.on('error', function(error) {
				error("Connection error: " + error.toString());
		});
		connection.on('close', function() {
				info('Connection closed');
		});
		connection.on('message', function(message) {
				if (message.type != 'utf8')
				{
					error('Invalid message type ' + message.type);
					return;
				}
				if (lastCall)
				{
					var newCall = Date.now();
					latency.add(newCall - lastCall);
					entry += ', latency: ' + (newCall - lastCall);
					lastCall = null;
				}
				var json;
				try
				{
					json = JSON.parse(message.utf8Data);
				}
				catch(e)
				{
					error('Invalid JSON: ' + message.utf8Data);
					return;
				}
				receive(json);
		});

	}

	/**
	 * Receive a message from the server.
	 */
	function receive(message)
	{
		if (!message || !message.type)
		{
			error('Wrong message ' + JSON.stringify(message));
			return;
		}
		if (message.type == 'start')
		{
			info('Starting game for ' + self.playerId);
			setInterval(requestUpdate, Math.round(1000 / requestsSecond));
			return;
		}
		if (message.requestId)
		{
			latency.end(message.requestId);
		}
	}

	/**
	 * Request an update from the server.
	 */
	function requestUpdate()
	{
		if (connection.connected)
		{
			var update = {
				requestId: Math.floor(Math.random() * 0x100000000).toString(16),
				type: 'update',
			};
			connection.sendUTF(JSON.stringify(update));
			latency.start(update.requestId);
		}
	}
}

/**
 * Start clients.
 */
for (var index = 0; index < concurrency; index++)
{
	var gameId = 'game' + index;
	var playerId = 'player' + index;
	var player = new gamePlayer(gameId, playerId);
	// start each client 100 ms after the last
	setTimeout(player.start, (index * 100) % 1000);
}


