'use strict';
/**
 * MilliEarth game logic.
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
var util = require('./util/util.js');
var parser = util.parser;
var extend = util.extend;
var randomId = util.randomId;
var highResolutionTimer = util.highResolutionTimer;
var log = require('./util/log.js');
var debug = log.debug;
var info = log.info;
var error = log.error;


/**
 * A game object
 */
function meGame(gameId)
{
	// self-reference
	var self = this;

	self.gameId = gameId;
	self.world = new gameWorld(gameId);
	self.active = false;
	var players = [];

	/**
	 * Add a new player to the game.
	 */
	self.add = function(player)
	{
		players.push(player);
		if (self.active)
		{
			player.startGame(self);
		}
		else if (players.length >= 2)
		{
			self.start();
		}
		info('Player ' + player.playerId + ' joined the game ' + self.gameId + '; ' + players.length + ' connected');
	}

	/**
	 * Start the game officially.
	 */
	self.start = function()
	{
		for (var index in players)
		{
			players[index].startGame(self);
		}
		self.active = true;
		debug('Game ' + self.gameId + ' started!');
	}

	/**
	 * Get the ids of every player.
	 */
	self.getPlayerIds = function()
	{
		var playerIds = [];
		for (var index in players)
		{
			playerIds.push(players[index].playerId);
		}
		return playerIds;
	}

	/**
	 * One of the players has sent a message.
	 */
	self.message = function(player, message)
	{
		if (message.type == 'code')
		{
			self.sendCode(player);
			return;
		}
		if (message.type == 'install')
		{
			self.installCode(player, message);
			return;
		}
		// the remaining messages are only valid if the game is active
		if (!self.active)
		{
			player.error('Game not started');
			return;
		}
		if (message.type == 'update')
		{
			self.processEvents(player, message.events);
			self.sendUpdate(player, message.requestId);
			return;
		}
		if (message.type == 'global')
		{
			self.processEvents(player, message.events);
			self.sendGlobalUpdate(player, message.requestId);
			return;
		}
		player.error('Unknown message type ' + message.type);
	}

	/**
	 * Remove a player from the game.
	 */
	self.remove = function(player)
	{
		if (!self.active)
		{
			return;
		}
		if (!removeFromList(player))
		{
			error('Could not remove ' + player.playerId + ' from players list');
			return;
		}
		if (players.length == 0)
		{
			error('nobody left!?');
			return
		}
		if (players.length > 1)
		{
			error('Too many (' + players.length + ') people left!?');
			return;
		}
		var rival = players[0];
		var abandoned = {
			type: 'abandoned',
			life: rival.life,
		};
		info('Player ' + player.playerId + ' disconnected; ' + rival.playerId + ' won by points');
		rival.send(abandoned);
		self.finish();
	}

	/**
	 * Remove a player from the list.
	 */
	function removeFromList(player)
	{
		for (var index in players)
		{
			if (players[index].playerId == player.playerId)
			{
				players.splice(index, 1);
				return true;
			}
		}
		return false;
	}

	/**
	 * Tell a player that they lost.
	 */
	self.sendLost = function(player)
	{
		var lose = {
			type: 'lose',
		};
		player.send(lose);
		player.endGame();
		removeFromList(player);
	}

	/**
	 * Tell a player that they won, finish.
	 */
	self.sendWon = function(player)
	{
		var win = {
			type: 'win',
		};
		player.send(win);
		self.finish();
	}

	/**
	 * Finish the current game.
	 */
	self.finish = function()
	{
		self.active = false;
		gameSelector.remove(self.gameId);
		for (var index in players)
		{
			players[index].endGame();
		}
		info('Game ' + self.gameId + ' finished');
	}

	/**
	 * Process client-side events.
	 */
	self.processEvents = function(player, events)
	{
		for (var name in events)
		{
			player.event(name, events[name]);
		}
	}

	/**
	 * Send an update to a player.
	 */
	self.sendUpdate = function(player, requestId)
	{
		var update = self.world.getUpdate(player.playerId);
		update.type = 'update';
		update.requestId = requestId;
		player.send(update);
	}

	/**
	 * Send a global update to a player.
	 */
	self.sendGlobalUpdate = function(player, requestId)
	{
		var update = self.world.getGlobalUpdate(player.playerId);
		update.type = 'global';
		update.requestId = requestId;
		player.send(update);
	}

	/**
	 * Broadcast a message to all players.
	 */
	self.broadcast = function(message)
	{
		for (var index in players)
		{
			players[index].send(message);
		}
	}

	/**
	 * Send the computer code to the given player.
	 */
	self.sendCode = function(player)
	{
		var computer = findComputer();
		if (!computer)
		{
			info('No computer opponent; cannot fetch code');
			return;
		}
		var message = {
			type: 'code',
			contents: computer.getCode(),
		};
		player.send(message);
	}

	/**
	 * Receive the computer code, install on computer players.
	 */
	self.installCode = function(player, message)
	{
		if (!message.contents)
		{
			error('Empty code received');
			return;
		}
		var computer = findComputer();
		if (!computer)
		{
			return;
		}
		computer.installCode(message.contents, player.playerId);
		info('Installed code for ' + player.playerId + ', finishing');
		self.finish();
	}

	/**
	 * Find a computer player.
	 */
	function findComputer()
	{
		for (var index in players)
		{
			var player = players[index];
			if (player.computer)
			{
				return player;
			}
		}
		return null;
	}

	/**
	 * Do a short loop on the world.
	 */
	self.shortLoop = function(delay)
	{
		if (!self.active)
		{
			return;
		}
		self.world.shortLoop(delay);
		var playersCopy = players.slice();
		for (var index in playersCopy)
		{
			var player = playersCopy[index];
			if (player.shortLoop)
			{
				player.shortLoop(delay);
			}
			if (player.hasLost())
			{
				self.sendLost(player);
			}
		}
		if (players.length == 1)
		{
			self.sendWon(players[0]);
		}
	}

	/**
	 * Run a long loop of the world.
	 */
	self.longLoop = function(delay)
	{
		if (!self.active)
		{
			return;
		}
	}
}


/**
 * Selector for games.
 */
var gameSelector = new function()
{
	// self-reference
	var self = this;

	// timers
	var shortDelay = 20;
	var longDelay = 1000;

	// map of games
	var games = {};

	/**
	 * Create a game with a random game id.
	 */
	self.create = function()
	{
		var gameId = randomId();
		games[gameId] = new meGame(gameId);
		return games[gameId];
	}

	/**
	 * Find any given game, or create if not present.
	 */
	self.find = function(gameId)
	{
		if (!(gameId in games))
		{
			error('Game ' + gameId + ' not found');
			return null;
		}
		return games[gameId];
	}

	/**
	 * Remove a game from the list.
	 */
	self.remove = function(gameId)
	{
		delete games[gameId];
	}

	/**
	 * Short loop all worlds.
	 */
	function shortLoop(delay)
	{
		for (var gameId in games)
		{
			games[gameId].shortLoop(delay);
		}
	}

	/**
	 * Long loop all worlds.
	 */
	function longLoop(delay)
	{
		var count = 0;
		for (var gameId in games)
		{
			games[gameId].longLoop(delay);
			count++;
		}
		if (count > 0)
		{
			info('games in progress: ' + count);
		}
	}

	var shortTimer = new highResolutionTimer(shortDelay, shortLoop);
	var longTimer = new highResolutionTimer(longDelay, longLoop);
}

module.exports.gameSelector = gameSelector;


