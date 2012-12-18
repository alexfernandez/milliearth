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
var util = require('./util/util.js');
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
	 * Keep a message for the game player.
	 */
	self.send = function(message)
	{
		debug('Auto: ' + message);
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


module.exports.gamePlayer = gamePlayer;

