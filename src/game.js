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
var params = require('./params.js').params;
var gameWorld = require('./world.js').gameWorld;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var trace = util.trace;


/**
 * A high resolution timer.
 */
function timer(delay, callback)
{
	// self-reference
	var self = this;

	// attributes
	var counter = 0;
	var start = new Date().getTime();

	/**
	 * Delayed running of the callback.
	 */
	function delayed()
	{
		callback();
		counter ++;
		var diff = (new Date().getTime() - start) - counter * delay;
		setTimeout(delayed, delay - diff);
	}

	/**
	 * Show the drift of the timer.
	 */
	self.traceDrift = function()
	{
		var diff = new Date().getTime() - start;
		var drift = diff / delay - counter;
		trace('Seconds: ' + Math.round(diff / 1000) + ', counter: ' + counter + ', drift: ' + drift);
	}

	// start timer
	delayed();
	setTimeout(delayed, delay);
}


/**
 * One of the players connected to a game.
 */
function connectedPlayer(id, connection)
{
	// self-reference
	var self = this;

	self.id = id;
	self.life = 100;
	self.connection = connection;

	/**
	 * Send a message to the player.
	 */
	self.send = function(message)
	{
		trace('Sending client: ' + message);
		self.connection.sendUTF(parser.convert(message));
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
 * A computer player.
 */
function autoPlayer(id)
{
	// self-reference
	var self = this;

	self.id = id;
	self.life = 100;

	/**
	 * Keep a message for the auto player.
	 */
	self.send = function(message)
	{
		trace('Auto: ' + parser.convert(message));
	}

	/**
	 * Disconnect the player.
	 */
	self.disconnect = function()
	{
	}
}

/**
 * A game object
 */
function meGame(id)
{
	// self-reference
	var self = this;

	self.id = id;
	self.world = new gameWorld(id);
	var players = [];

	/**
	 * Add a new player to the game.
	 */
	self.add = function(player)
	{
		players.push(player);
		self.world.add(player);
		log('Player ' + player.id + ' connected to game ' + self.id + '; ' + players.length + ' connected');
	}

	/**
	 * Connect a new player.
	 */
	self.connect = function(id, connection)
	{
		var player = new connectedPlayer(id, connection);
		self.add(player);
		connection.on('message', function(message) {
				if (message.type != 'utf8')
				{
					self.error(index, 'Invalid message type ' + message.type);
					return;
				}
				var info;
				try
				{
					info = parser.parse(message.utf8Data);
				}
				catch (e)
				{
					self.error(index, 'Invalid JSON: ' + message.utf8Data);
					return;
				}
				self.message(player, info);
		});

		connection.on('error', function(error) {
				log('Error ' + error);
		});

		// when a connection is closed check winner
		connection.on('close', function() {
				log('Client ' + connection.remoteAddress + ' disconnected.');
				self.close(player);
		});
		if (self.world.active)
		{
			self.startAfter(player);
		}
		else if (players.length == 2)
		{
			self.start();
		}
	}

	/**
	 * Start the game officially.
	 */
	self.start = function()
	{
		var playerIds = [];
		for (var i = 0; i < players.length; i++)
		{
			if (players[i])
			{
				playerIds.push(players[i].id);
			}
		}
		self.broadcast({
				type: 'start',
				players: playerIds
		});
		self.world.start();
		trace('Game ' + self.id + ' started!');
	}

	/**
	 * Start a player after the game has started.
	 */
	self.startAfter = function(player)
	{
		player.send({
				type: 'start',
				players: [player.id]
		});
	}

	/**
	 * Start a game with one computer player.
	 */
	self.autostart = function()
	{
		self.add(new autoPlayer('computer1'));
		// self.add(new autoPlayer('computer2'));
	}

	/**
	 * Send an error to the client.
	 */
	self.error = function(player, message)
	{
		log('Player ' + player.id + ' error: ' + message);
		var error = {
			type: 'error',
			message: message
		};
		player.send(error);
	}

	/**
	 * One of the players has sent a message.
	 */
	self.message = function(player, message)
	{
		if (!self.world.active)
		{
			self.error(player, 'Game not started');
			return;
		}
		if (!message.type)
		{
			self.error(player, 'Missing game type');
		}
		trace('Player ' + player.id + ' sent a message ' + message.type);
		if (message.type == 'update')
		{
			self.sendUpdate(player, message.id);
			return;
		}
		self.error(player, 'Unknown message type ' + message.type);
	}

	/**
	 * The connection has been closed.
	 */
	self.close = function(player)
	{
		if (!remove(player))
		{
			log('Could not remove ' + player.id + ' from players list');
			return;
		}
		if (!self.world.active)
		{
			return;
		}
		self.world.stop();
		if (players.length == 0)
		{
			log('nobody left!?');
			return
		}
		if (players.length > 1)
		{
			log('Too many (' + players.length + ') people left!?');
			return;
		}
		var rival = players[0];
		var abandoned = {
			type: 'abandoned',
			life: rival.life,
		};
		log('Player ' + player.id + ' disconnected; ' + rival.id + ' won by points');
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
	 * Send finish information to all players.
	 */
	self.sendFinish = function(message, player, rival)
	{
		var win = {
			type: 'win',
			life1: player.life,
			hit: message,
		};
		player.send(win);
		var lose = {
			type: 'lose',
			life2: player.life,
			hit: message,
		};
		rival.send(lose);
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
			players[index].disconnect();
		}
		log('Game ' + self.id + ' finished');
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
	 * Broadcast a message to all players.
	 */
	self.broadcast = function(message)
	{
		for (var index in players)
		{
			players[index].send(message);
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
	 * Count the number of games in progress.
	 */
	self.count = function()
	{
		var count = 0;
		for (var id in games)
		{
			count++;
		}
		return count;
	}

	/**
	 * Short loop all worlds.
	 */
	function shortLoop()
	{
		for (var id in games)
		{
			games[id].world.shortLoop(shortDelay);
		}
	}

	/**
	 * Long loop all worlds.
	 */
	function longLoop()
	{
		for (var id in games)
		{
			games[id].world.longLoop(longDelay);
		}
	}

	var shortTimer = new timer(shortDelay, shortLoop);
	var longTimer = new timer(longDelay, longLoop);
}

module.exports.gameSelector = gameSelector;


