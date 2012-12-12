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
var player = require('./player.js');
var autoPlayer = player.autoPlayer;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var extend = util.extend;
var highResolutionTimer = util.highResolutionTimer;


/**
 * A game object
 */
function meGame(id)
{
	// self-reference
	var self = this;

	self.id = id;
	self.world = new gameWorld(id);
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
		log.i('Player ' + player.id + ' joined the game ' + self.id + '; ' + players.length + ' connected');
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
		log.d('Game ' + self.id + ' started!');
	}

	/**
	 * Get the ids of every player.
	 */
	self.getPlayerIds = function()
	{
		var playerIds = [];
		for (var index in players)
		{
			playerIds.push(players[index].id);
		}
		return playerIds;
	}

	/**
	 * Start a game with one computer player.
	 */
	self.autostart = function()
	{
		var player = new autoPlayer({
			id: 'computer1',
			world: self.world,
		});
		self.add(player);
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
			self.sendUpdate(player, message.id);
			return;
		}
		if (message.type == 'global')
		{
			self.processEvents(player, message.events);
			self.sendGlobalUpdate(player, message.id);
			return;
		}
		player.error('Unknown message type ' + message.type);
	}

	/**
	 * The connection has been closed.
	 */
	self.close = function(player)
	{
		if (!self.active)
		{
			return;
		}
		if (!remove(player))
		{
			log.e('Could not remove ' + player.id + ' from players list');
			return;
		}
		self.world.stop();
		if (players.length == 0)
		{
			log.e('nobody left!?');
			return
		}
		if (players.length > 1)
		{
			log.e('Too many (' + players.length + ') people left!?');
			return;
		}
		var rival = players[0];
		var abandoned = {
			type: 'abandoned',
			life: rival.life,
		};
		log.i('Player ' + player.id + ' disconnected; ' + rival.id + ' won by points');
		rival.send(abandoned);
		self.finish();
	}

	/**
	 * Remove a player from the list.
	 */
	function remove(player)
	{
		for (var index in players)
		{
			if (players[index].id == player.id)
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
		remove(player);
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
		gameSelector.remove(self.id);
		for (var index in players)
		{
			players[index].endGame();
		}
		log.i('Game ' + self.id + ' finished');
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
	self.sendUpdate = function(player, id)
	{
		var update = self.world.getUpdate(player.id);
		update.type = 'update';
		update.id = id;
		player.send(update);
	}

	/**
	 * Send a global update to a player.
	 */
	self.sendGlobalUpdate = function(player, id)
	{
		var update = self.world.getGlobalUpdate(player.id);
		update.type = 'global';
		update.id = id;
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
			log.e('Empty code received');
			return;
		}
		var computer = findComputer();
		if (!computer)
		{
			return;
		}
		computer.installCode(message.contents, player.id);
		log.i('Installed code for ' + player.id + ', finishing');
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
			if (player instanceof autoPlayer)
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
	 * Find any given game, or create if not present.
	 */
	self.find = function(id)
	{
		if (!(id in games))
		{
			games[id] = new meGame(id);
			games[id].autostart();
		}
		return games[id];
	}

	/**
	 * Remove a game from the list.
	 */
	self.remove = function(id)
	{
		delete games[id];
	}

	/**
	 * Short loop all worlds.
	 */
	function shortLoop(delay)
	{
		for (var id in games)
		{
			games[id].shortLoop(delay);
		}
	}

	/**
	 * Long loop all worlds.
	 */
	function longLoop(delay)
	{
		var count = 0;
		for (var id in games)
		{
			games[id].longLoop(delay);
			count++;
		}
		if (count > 0)
		{
			log.i('games in progress: ' + count);
		}
	}

	var shortTimer = new highResolutionTimer(shortDelay, shortLoop);
	var longTimer = new highResolutionTimer(longDelay, longLoop);
}

module.exports.gameSelector = gameSelector;


