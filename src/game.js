'use strict';
/**
 * MilliEarth.
 * Game logic.
 * (C) 2012 Alex Fernández
 */


/**
 * Requirements.
 */
var params = require('./params.js').params;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var trace = util.trace;
// util.enableTrace();

function massiveBody()
{
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
 * A game object
 */
function meGame(id)
{
	// self-reference
	var self = this;

	self.id = id;
	var players = [];
	var active = false;

	/**
	 * Connect a new player.
	 */
	self.connect = function(id, connection)
	{
		var player = new connectedPlayer(id, connection);
		var index = players.push(player) - 1;
		log('Player ' + id + ' connected to game ' + self.id + '; ' + players.length + ' connected');
		if (players.length == 2)
		{
			self.start();
		}
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
				self.message(index, info);

		});

		connection.on('error', function(error) {
				log('Error ' + error);
		});

		// when a connection is closed check winner
		connection.on('close', function() {
				log('Client ' + connection.remoteAddress + ' disconnected.');
				self.close(player);
		});     
	}

	self.start = function()
	{
		var playerIds = [players[0].id, players[1].id];
		self.broadcast({
				type: 'start',
				players: playerIds
		});
		active = true;
		trace('Fight ' + self.id + ' started!');
		setInterval(self.loop, 20);
	}

	/**
	 * Send an error to the client.
	 */
	self.error = function(index, message)
	{
		log('Player ' + index + ' error: ' + message);
		var player = players[index];
		if (!player)
		{
			return;
		}
		var error = {
			type: 'error',
			message: message
		};
		player.send(error);
	}

	/**
	 * One of the players has sent a message.
	 */
	self.message = function(index, message)
	{
		if (!active)
		{
			self.error(index, 'Game not started');
			return;
		}
		trace('Player ' + index + ' sent a message');
		var player = players[index];
		var rival = players[1 - index];
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
		if (!active)
		{
			return;
		}
		active = false;
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
	 * Main loop: update object positions.
	 */
	self.loop = function()
	{
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
	 * Send an update to all players.
	 */
	self.sendUpdate = function(message, player, rival)
	{
		var update = {
			life1: player.life,
			life2: rival.life,
		};
		player.send(update);
		var update = {
			life1: rival.life,
			life2: player.life,
		};
		rival.send(update);
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
			if (games.hasOwnProperty(id))
			{
				count++;
			}
		}
		return count;
	}
}

module.exports.gameSelector = gameSelector;


