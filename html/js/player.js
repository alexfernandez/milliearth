"use strict";
/**
 * MilliEarth client players.
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
 * Player answer to server messages.
 */
var clientPlayer = function(canvas)
{
	// self-reference
	var self = this;

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
	// layers and projections
	var viewLayer = createViewLayer();
	var globalLayer = createGlobalLayer();
	// player id sent to the server: random
	self.playerId = randomId();


	/**
	 * Create the view layer.
	 */
	function createViewLayer()
	{
		var width = canvas.width();
		var height = canvas.height();
		var viewParams = {
			canvas: canvas,
			name: 'view',
			origin: new vector(width / 2, height / 2, 0),
			scale: 4/5 * height,
			opacity: 1.0,
		};
		return new paintingLayer(viewParams);
	}

	function createGlobalLayer()
	{
		var width = canvas.width();
		var height = canvas.height();
		var globalWidth = height / 3;
		var margin = 20;
		var globalParams = {
			canvas: canvas,
			name: 'global',
			origin: new vector(width - globalWidth / 2 - margin, globalWidth / 2 + margin, 0),
			scale: 1/3 * globalWidth / 6312,
			planar: true,
			start: new planarPoint(width - globalWidth - margin, margin),
			end: new planarPoint(width - margin, globalWidth + margin),
			autoscale: true,
			opacity: 0.5,
		};
		return new paintingLayer(globalParams);
	}

	/**
	 * Start the game.
	 */
	self.start = function()
	{
		$('#message').text('Simulation started!');
		updateIntervalId = setInterval(self.requestSightUpdate, updateInterval);
		globalIntervalId = setInterval(self.requestGlobalUpdate, globalInterval);
		running = true;
	}

	/**
	 * End the game.
	 */
	self.end = function()
	{
		if (!running)
		{
			return;
		}
		clearInterval(updateIntervalId);
		clearInterval(globalIntervalId);
		running = false;
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
		var requestId = randomId();
		serverConnection.send({
			type: type,
			requestId: requestId,
			events: keymap.getKeys(),
		});
		latencyMap[requestId] = new Date().getTime();
	}

	/**
	 * Global update for the whole world.
	 */
	self.global = function(message)
	{
		if (!running)
		{
			error('Not running');
			return;
		}
		globalMessage = message;
	}

	/**
	 * Update world.
	 */
	self.update = function(message)
	{
		if (!running)
		{
			error('Not running');
			return;
		}
		if (optionSelector.debugShown)
		{
			var contents = JSON.stringify(message, null, '\t');
			optionSelector.display($('<pre>').text(contents));
		}
		countUpdate(message.requestId);
		canvas.clearCanvas();
		viewLayer.paintUpdate(message);
		paintGlobalUpdate();
	}

	/**
	 * Player wins.
	 */
	self.win = function(message)
	{
		viewLayer.alert('Player wins! :)');
	}

	/**
	 * Player loses.
	 */
	self.lose = function(message)
	{
		viewLayer.alert('Player loses :(');
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
		globalLayer.paintUpdate(globalMessage);
		globalLayer.paintText('height:', globalMessage.height, 'm');
		globalLayer.paintText('speed:', globalMessage.speed, 'm/s');
	}

	/**
	 * Count an update.
	 */
	function countUpdate(requestId)
	{
		updates ++;
		if (requestId in latencyMap)
		{
			var lastTime = latencyMap[requestId];
			var newTime = new Date().getTime();
			latencies += newTime - lastTime;
			delete latencyMap[requestId];
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
		$('#message').text('Your opponent abandoned!');
	}

	/**
	 * Show an error from the server.
	 */
	self.error = function(message)
	{
		$('#message').text('Server error: ' + message.message);
	}
}

