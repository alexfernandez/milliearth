'use strict';
/**
 * MilliEarth players.
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
 * Requirements.
 */
var autoComputer = require('./computer.js').autoComputer;
var gameSelector = require('./game.js').gameSelector;
var util = require('./util/util.js');
var parser = util.parser;
var extend = util.extend;
var log = require('./util/log.js');
var debug = log.debug;
var info = log.info;
var error = log.error;


/**
 * One of the players in a game.
 */
function gamePlayer(params)
{
	// self-reference
	var self = this;
	self.setSelf = function(that)
	{
		self = that;
	}

	// attributes
	self.playerId = params.playerId;
	self.game = null;
	self.computer = null;
	self.name = null;

	/**
	 * Start a game.
	 */
	self.startGame = function(game)
	{
		self.game = game;
		self.robot = game.world.addRobot(self.playerId);
		self.postStart(game);
	}

	/**
	 * Do any initialization after the game has started.
	 */
	self.postStart = function(game)
	{
		info(self.playerId + ' game started');
		self.send({
			type: 'start',
			players: game.getPlayerIds(),
		});
	}

	/**
	 * Keep a message for the auto player.
	 */
	self.send = function(message)
	{
		debug('Auto: ' + parser.convert(message));
	}

	/**
	 * End the game for the player.
	 */
	self.endGame = function()
	{
		info(self.playerId + ' game ended');
		self.game = false;
		self.postEnd();
	}

	/**
	 * Do any tasks after the game has ended.
	 */
	self.postEnd = function()
	{
	}

	/**
	 * Check if the player has lost.
	 */
	self.hasLost = function()
	{
		if (!self.robot || !self.robot.alive)
		{
			return true;
		}
	}
}


/**
 * One of the players connected to a game.
 */
function connectedPlayer(params)
{
	// self-reference
	var self = this;
	// extend gamePlayer
	extend(new gamePlayer(params), self);

	// attributes
	var connection = params.connection;
	connection.on('message', receiveMessage);
	connection.on('error', connectionError);
	connection.on('close', connectionClosed);

	/**
	 * Receive a message through the connection.
	 */
	function receiveMessage(payload)
	{
		if (payload.type != 'utf8')
		{
			self.error(index, 'Invalid message type ' + payload.type);
			return;
		}
		var message;
		try
		{
			message = parser.parse(payload.utf8Data);
		}
		catch (e)
		{
			self.error(index, 'Invalid JSON: ' + payload.utf8Data);
			return;
		}
		if (!message.type)
		{
			self.error('Missing message type');
			return;
		}
		debug('Player ' + self.playerId + ' sent a message ' + message.type);
		if (message.type == 'rivals')
		{
			if (message.name)
			{
				self.name = message.name;
			}
			self.send({
				type: 'rivals',
				rivals: playerSelector.getRivals(self.playerId),
			});
			return;
		}
		if (message.type == 'fight')
		{
			self.fight(message);
			return;
		}
		if (!self.game)
		{
			self.error('No game');
			return;
		}
		self.game.message(self, message);
	}

	/**
	 * Fight a human or a computer on the server.
	 */
	self.fight = function(message)
	{
		var rival = null;
		if (message.playerId)
		{
			rival = playerSelector.getFreeRival(message.playerId, self.playerId);
			if (rival == null)
			{
				self.error('Invalid rival ' + message.playerId);
				return;
			}
		}
		else if (message.scriptId)
		{
			self.error('Script selection not implemented yet.');
			return;
		}
		else
		{
			// fight default computer
			rival = new autoPlayer({
				playerId: 'computer1',
			});
		}
		var game = gameSelector.create();
		game.add(self);
		game.add(rival);
	}

	/**
	 * Receive an error from the connection.
	 */
	function connectionError(message)
	{
		error('Error ' + message);
	}

	/**
	 * The connection was closed; check winner if applicable.
	 */
	function connectionClosed()
	{
		info('Client ' + connection.remoteAddress + ' disconnected.');
		if (self.game)
		{
			self.game.remove(self);
			self.game = null;
		}
		playerSelector.remove(self.playerId);
	}

	/**
	 * Send an error to the client.
	 */
	self.error = function(message)
	{
		error('Player ' + self.playerId + ' error: ' + message);
		self.send({
			type: 'error',
			message: message
		});
	}

	/**
	 * Send a message to the player.
	 */
	self.send = function(message)
	{
		connection.sendUTF(parser.convert(message));
	}

	/**
	 * Process a client-side event.
	 */
	self.event = function(name, period)
	{
		var callback = self.robot[name];
		if (!callback)
		{
			error('Event ' + name + ' for player ' + self.playerId + ' without callback');
			return;
		}
		callback(period / 1000);
	}

	/**
	 * Do any initialization after the game has started.
	 */
	self.postStart = function(game)
	{
		self.send({
			type: 'start',
			players: game.getPlayerIds(),
		});
	}

	/**
	 * End the game for the player: let them know.
	 */
	self.postEnd = function()
	{
		self.send({
			type: 'end',
		});
	}
}

/**
 * An auto player.
 */
function autoPlayer(params)
{
	// self-reference
	var self = this;
	// extend gamePlayer
	extend(new gamePlayer(params), self);

	// attributes
	self.computer = null;
	var engine = null;

	/**
	 * Do any initialization after the game has started.
	 */
	self.postStart = function(game)
	{
		var script = getFilename(params);
		self.computer = new autoComputer(self.robot, script);
		engine = self.computer.getEngine();
	}

	/**
	 * Get the current code for the computer.
	 */
	self.getCode = function()
	{
		return engine.get();
	}

	/**
	 * Set the code for the engine.
	 */
	self.installCode = function(code, playerId, callback)
	{
		engine.writeScript('custom-' + playerId + '.8s', code, callback);
	}

	/**
	 * Run some instructions on our engine.
	 */
	self.shortLoop = function(delay)
	{
		var interval = delay / 1000;
		self.computer.update(interval, self.game.world.bodiesExcept(self.playerId));
		engine.run(interval);
	}

	/**
	 * Get the correct filename for the given params.
	 */
	function getFilename(params)
	{
		if ('scriptId' in params)
		{
			return 'custom-' + params.scriptId + '.8s';
		}
		return 'basic-enemy.8s';
	}
}

/**
 * A selector for human players.
 */
var playerSelector = new function()
{
	// self-reference
	var self = this;

	// attributes
	var players = {};

	/**
	 * Add a new human player to the server.
	 */
	self.add = function(playerId, connection)
	{
		var player = new connectedPlayer({
			playerId: playerId,
			connection: connection,
		});
		players[player.playerId] = player;
		return player;
	}

	/**
	 * Remove a human player from the server.
	 */
	self.remove = function(playerId)
	{
		delete players[playerId];
	}

	/**
	 * Send the list of rivals to the given player.
	 */
	self.getRivals = function(playerId)
	{
		var rivals = [];
		for (var rivalId in players)
		{
			var rival = getRivalDescription(rivalId, playerId);
			if (rival)
			{
				rivals.push(rival);
			}
		}
		return rivals;
	}

	/**
	 * Check out if the player makes a valid rival; if so, return a message describing it
	 * and if it is free.
	 */
	function getRivalDescription(rivalId, playerId)
	{
		var rival = getRival(rivalId, playerId);
		if (!rival)
		{
			return null;
		}
		var free = false;
		if (!rival.game)
		{
			free = true;
		}
		return {
			playerId: rivalId,
			name: rival.name,
			free: free,
		};
	}

	/**
	 * Check out if the player makes a valid rival and is free; if so, return it.
	 */
	self.getFreeRival = function(rivalId, playerId)
	{
		var rival = getRival(rivalId, playerId);
		if (!rival)
		{
			error('Rival ' + rivalId + ' is invalid');
			return null;
		}
		if (rival.game)
		{
			error('Rival ' + rivalId + ' not free');
			return null;
		}
		return rival;
	}

	/**
	 * Get a rival. If it does not exist, is self or has no name, return null.
	 */
	function getRival(rivalId, playerId)
	{
		if (rivalId == playerId)
		{
			return null;
		}
		var rival = players[rivalId];
		info('Rival ' + rivalId + ': ' + rival);
		if (!rival.name)
		{
			return null;
		}
		return rival;
	}
}

module.exports.autoPlayer = autoPlayer;
module.exports.playerSelector = playerSelector;

