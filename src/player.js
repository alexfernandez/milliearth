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
var globalParams = require('./params.js').globalParams;
var gameWorld = require('./world/world.js').gameWorld;
var scriptingEngine = require('./atescript.js').scriptingEngine;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var extend = util.extend;


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
	self.id = params.id;
	self.game = null;

	/**
	 * Start a game.
	 */
	self.startGame = function(game)
	{
		self.game = game;
		self.robot = game.world.addRobot(self.id);
		self.postStart(game);
	}

	/**
	 * Do any initialization after the game has started.
	 */
	self.postStart = function(game)
	{
		log.i(self.id + ' game started');
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
		log.d('Auto: ' + parser.convert(message));
	}

	/**
	 * End the game for the player.
	 */
	self.endGame = function()
	{
		log.i(self.id + ' game ended');
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
	self.connection = params.connection;
	self.connection.on('message', receiveMessage);
	self.connection.on('error', connectionError);
	self.connection.on('close', connectionClosed);

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
		log.d('Player ' + self.id + ' sent a message ' + message.type);
		if (message.type == 'rivals')
		{
			self.send({
				type: 'rivals',
				rivals: playerSelector.getRivals(self.id),
			});
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
	 * Receive an error from the connection.
	 */
	function connectionError(error)
	{
		log.e('Error ' + error);
	}

	/**
	 * The connection was closed; check winner if applicable.
	 */
	function connectionClosed()
	{
		log.i('Client ' + connection.remoteAddress + ' disconnected.');
		if (self.game)
		{
			self.game.close(self);
		}
	}

	/**
	 * Send an error to the client.
	 */
	self.error = function(message)
	{
		log.e('Player ' + self.id + ' error: ' + message);
		var error = {
			type: 'error',
			message: message
		};
		self.send(error);
	}

	/**
	 * Send a message to the player.
	 */
	self.send = function(message)
	{
		self.connection.sendUTF(parser.convert(message));
	}

	/**
	 * Process a client-side event.
	 */
	self.event = function(name, period)
	{
		var callback = self.robot[name];
		if (!callback)
		{
			log.e('Event ' + name + ' for player ' + self.id + ' without callback');
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
	self.endGame = function()
	{
		self.send({
			type: 'end',
		});
	}
}

/**
 * A computer that controls an auto player.
 */
function autoComputer(robot)
{
	// self-reference
	var self = this;

	// attributes
	self.view = {};
	self.cannon = {};
	self.scope = {};
	self.map = {};
	self.speed = 0;

	/**
	 * Run an update of the outside world.
	 */
	self.update = function(interval, bodies)
	{
		var update = robot.computeViewUpdate(bodies);
		self.speed = update.speed;
		self.view = {};
		self.cannon = {};
		self.scope = {};
		for (var index in update.objects)
		{
			var object = update.objects[index];
			self.view[object.id] = object;
			if (object.type == 'robot')
			{
				object.enemy = true;
			}
		}
		update = robot.computeCannonUpdate(bodies);
		for (var index in update.objects)
		{
			var object = update.objects[index];
			self.cannon[object.id] = object;
			var scopeDistance = Math.sqrt(object.position.x * object.position.x + object.position.y * object.position.y);
			if (scopeDistance < globalParams.scopeWidth && object.position.z > 0)
			{
				self.scope[object.id] = object;
			}
		}
	}

	/**
	 * Point at an object with position.
	 */
	self.pointAt = function(interval, object)
	{
		//refresh object
		var object = self.view[object.id];
		var position = object.position;
		if (position.z < 0)
		{
			if (position.x < 0)
			{
				robot.turnLeft(interval);
			}
			else
			{
				robot.turnRight(interval);
			}
			if (position.y > 0)
			{
				robot.turnUp(interval);
			}
			else
			{
				robot.turnDown(interval);
			}
			return interval;
		}
		if (position.x < 0)
		{
			robot.turnLeft(interval);
		}
		else
		{
			robot.turnRight(interval);
		}
		if (position.y > 0)
		{
			robot.turnUp(interval);
		}
		else
		{
			robot.turnDown(interval);
		}
		return interval;
	}

	/**
	 * Point the cannon at an object with position.
	 */
	self.pointCannonAt = function(interval, object)
	{
		//refresh object
		var object = self.cannon[object.id];
		if (!object)
		{
			// log.e('Object not found in cannon view');
			return interval;
		}
		var position = object.position;
		if (position.z < 0)
		{
			if (position.x < 0)
			{
				robot.pointLeft(interval);
			}
			else
			{
				robot.pointRight(interval);
			}
			if (position.y > 0)
			{
				robot.pointUp(interval);
			}
			else
			{
				robot.pointDown(interval);
			}
			return interval;
		}
		if (position.x < 0)
		{
			robot.pointLeft(interval);
		}
		else
		{
			robot.pointRight(interval);
		}
		if (position.y > 0)
		{
			robot.pointUp(interval);
		}
		else
		{
			robot.pointDown(interval);
		}
		return interval;
	}

	/**
	 * Fine tune the scope.
	 */
	self.refineScopeAt = function(interval, object)
	{
		//refresh object
		var object = self.cannon[object.id];
		if (!object)
		{
			// log.e('Object not found in cannon view');
			return interval;
		}
		var position = object.position;
		var tx = position.x / position.z / globalParams.turningAngle;
		if (position.x < 0)
		{
			robot.pointLeft(Math.min(interval, -tx));
		}
		else
		{
			robot.pointRight(Math.min(interval, tx));
		}
		var ty = position.y / position.z / globalParams.turningAngle;
		if (position.y > 0)
		{
			robot.pointUp(Math.min(interval, ty));
		}
		else
		{
			robot.pointDown(Math.min(interval, -ty));
		}
		return interval;
	}

	/**
	 * Make the robot accelerate.
	 */
	self.accelerate = function(interval)
	{
		robot.accelerate(interval);
		return interval;
	}

	/**
	 * Shoot.
	 */
	self.shoot = function(interval)
	{
		robot.shoot();
		return globalParams.projectileRechargeTime;
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
	var computer = null;
	var engine = null;

	/**
	 * Do any initialization after the game has started.
	 */
	self.postStart = function(game)
	{
		computer = new autoComputer(self.robot);
		engine = new scriptingEngine({
			file: getFilename(params),
			computer: computer,
		});
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
		computer.update(interval, self.game.world.bodiesExcept(self.id));
		engine.run(interval);
	}

	/**
	 * Get the correct filename for the given params.
	 */
	function getFilename(params)
	{
		if ('playerId' in params)
		{
			return 'custom-' + params.playerId + '.8s';
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

	self.add = function(player)
	{
		players[player.id] = player;
	}

	/**
	 * Send the list of rivals to the given player.
	 */
	self.getRivals = function(playerId)
	{
		var rivals = [];
		for (var id in players)
		{
			if (id != playerId)
			{
				var rival = { id: id };
				rivals.push(rival);
			}
		}
		return rivals;
	}
}

module.exports.connectedPlayer = connectedPlayer;
module.exports.autoPlayer = autoPlayer;
module.exports.playerSelector = playerSelector;

