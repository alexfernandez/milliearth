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
var gameWorld = require('./world.js').gameWorld;
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
	self.robot = params.world.addRobot(self.id);

	/**
	 * Keep a message for the auto player.
	 */
	self.send = function(message)
	{
		log.d('Auto: ' + parser.convert(message));
	}

	/**
	 * Disconnect the player.
	 */
	self.disconnect = function()
	{
		log.i(self.id + ' disconnected');
	}

	/**
	 * Check if the player has lost.
	 */
	self.hasLost = function()
	{
		if (!self.robot || !self.robot.active)
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
	 * Disconnect the player.
	 */
	self.disconnect = function()
	{
		self.connection.close();
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
	self.scope = {};
	self.map = {};
	self.delay = 0;

	/**
	 * Run an update of the outside world.
	 */
	self.update = function(delay)
	{
		self.delay = delay;
		return;
		var update = robot.computeViewUpdate();
		for (var index in update.objects)
		{
			var object = update.objects[index];
			self.view[object.id] = object;
			if (object.type == 'robot')
			{
				object.enemy = true;
				// log.i('position: ' + object.position);
			}
			var scopeDistance = Math.sqrt(object.position.x * object.position.x + object.position.y * object.position.y);
			if (scopeDistance < globalParams.scopeWidth)
			{
				self.scope[object.id] = object;
			}
		}
	}

	/**
	 * Point at an object with position.
	 */
	self.pointAt = function(object)
	{
		var position = robot.computePosition(object);
		if (position.x > 0)
		{
			robot.turnLeft(self.delay);
		}
		else if (position.x < 0)
		{
			robot.turnRight(self.delay);
		}
		if (position.y > 0)
		{
			robot.turnDown(self.delay);
		}
		else if (position.y < 0)
		{
			robot.turnUp(self.delay);
		}
	}

	/**
	 * Make the robot accelerate.
	 */
	self.accelerate = function()
	{
		// robot.accelerate(self.delay);
	}

	/**
	 * Shoot.
	 */
	self.shoot = function()
	{
		robot.shoot();
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
	var computer = new autoComputer(self.robot);
	var engine = new scriptingEngine({
		file: 'forrest.8s',
		computer: computer,
	});

	/**
	 * Run some instructions on our engine.
	 */
	self.shortLoop = function(delay)
	{
		computer.update(delay / 1000);
		var instructions = globalParams.instructionsPerMs * delay;
		engine.run(instructions);
	}
}

module.exports.connectedPlayer = connectedPlayer;
module.exports.autoPlayer = autoPlayer;

