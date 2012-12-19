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
var clientPlayer = new function()
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
	// canvas and layers
	self.viewLayer = null;
	self.globalLayer = null;

	/**
	 * Initialize the views.
	 */
	self.init = function(viewLayer, globalLayer)
	{
		self.viewLayer = viewLayer;
		self.globalLayer = globalLayer;
	}

	/**
	 * Connect to the game.
	 */
	self.connect = function()
	{
		serverConnection.send({
			type: 'fight',
		});
	}

	/**
	 * Connect to the game against a given rival.
	 */
	self.fightRival = function(playerId)
	{
		serverConnection.send({
			type: 'fight',
			playerId: playerId,
		});
	}

	/**
	 * Fight an auto enemy with the given script.
	 */
	self.fightScript = function(scriptId)
	{
		serverConnection.send({
			type: 'fight',
			scriptId: scriptId,
		});
	}

	/**
	 * Start the game.
	 */
	self.start = function()
	{
		if (running)
		{
			self.end();
		}
		$('#message').text('Simulation started!');
		updateIntervalId = setInterval(self.requestSightUpdate, updateInterval);
		globalIntervalId = setInterval(self.requestGlobalUpdate, globalInterval);
		running = true;
	}

	/**
	 * Disconnect from the game.
	 */
	self.disconnect = function()
	{
		$('#status').text('Disconnected from server');
		self.end();
	}

	/**
	 * End the game.
	 */
	self.end = function()
	{
		$('#message').text('Simulation ended');
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
		self.viewLayer.clearCanvas();
		self.viewLayer.paintUpdate(message);
		paintGlobalUpdate();
	}

	/**
	 * Player wins.
	 */
	self.win = function(message)
	{
		self.viewLayer.alert('Player wins! :)');
	}

	/**
	 * Player loses.
	 */
	self.lose = function(message)
	{
		self.viewLayer.alert('Player loses :(');
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
		self.globalLayer.paintUpdate(globalMessage);
		self.globalLayer.paintText('height:', globalMessage.height, 'm');
		self.globalLayer.paintText('speed:', globalMessage.speed, 'm/s');
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
			$('#status').text('Not running');
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

	/**
	 * Receive the code from the server.
	 */
	self.code = function(message)
	{
		codeEditor.showCode(message);
	}

	/**
	 * Receive the list of rivals from the server.
	 */
	self.rivals = function(message)
	{
		rivalList.receiveRivals(message);
	}

	/**
	 * Receive the list of scripts from the server.
	 */
	self.scripts = function(message)
	{
		codeEditor.receiveScripts(message);
	}

	/**
	 * Find out if a game is in progress.
	 */
	self.isPlaying = function()
	{
		return running;
	}
}

