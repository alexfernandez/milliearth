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

/**
 * Globals.
 */
var bigG = 6.67384e-11;
// 1 thousandth the radius of Earth
var meRadius = 6312.32;
// 1 millionth the mass of Earth
var meMass = 5.97219e18;

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
 * Three-dimensional vector, in meters.
 */
function vector(x, y, z)
{
	// self-reference
	var self = this;

	self.x = x;
	self.y = y;
	self.z = z;

	/**
	 * Add another vector to this one.
	 */
	self.add = function(point)
	{
		self.x += point.x;
		self.y += point.y;
		self.z += point.z;
	}

	self.addScaled = function(point, scale)
	{
		self.x += point.x * scale;
		self.y += point.y * scale;
		self.z += point.z * scale;
	}

	/**
	 * Substract another point in space, return the difference as vector.
	 */
	self.difference = function(point)
	{
		return new vector(self.x - point.x, self.y - point.y, self.z - point.z);
	}

	/**
	 * Multiply by a scalar.
	 */
	self.scale = function(factor)
	{
		self.x *= factor;
		self.y *= factor;
		self.z *= factor;
	}

	/**
	 * Return the length of the vector, squared.
	 */
	self.squaredLength = function()
	{
		return self.x * self.x + self.y * self.y + self.z * self.z;
	}

	/**
	 * Return the length of the given vector.
	 */
	self.length = function()
	{
		var squared = self.squaredLength();
		return Math.sqrt(squared);
	}

	self.toString = function()
	{
		return '(' + Math.round(self.x) + ',' + Math.round(self.y) + ',' + Math.round(self.z) + ')';
	}
}

/**
 * A massive body. Mass is given in kg.
 */
function massiveBody(mass, radius)
{
	// self-reference
	var self = this;

	// attributes
	self.mass = mass;
	self.radius = radius;
	self.position = new vector(0, 0, 0);
	self.speed = new vector(0, 0, 0);

	/**
	 * Place the object at the given position.
	 */
	self.setPosition = function(x, y, z)
	{
		self.position = new vector(x, y, z);
	}

	/**
	 * Set the speed.
	 */
	self.setSpeed = function(x, y, z)
	{
		self.speed = new vector(x, y, z);
	}

	/**
	 * Compute gravitational attraction by another body in the given period (in seconds).
	 */
	self.computeAttraction = function(attractor, period)
	{
		var difference = attractor.position.difference(self.position);
		var distance = difference.length();
		var factor = bigG * attractor.mass / Math.pow(distance, 3);
		self.speed.addScaled(difference, factor * period);
		self.position.addScaled(self.speed, period);
	}
}

/**
 * The world where the game runs.
 */
var gameWorld = function()
{
	// self-reference
	var self = this;

	// attributes
	var milliEarth = new massiveBody(meMass, meRadius);
	var bodies = [];
	var seconds = 0;
	var shortDelay = 20;
	var longDelay = 1000;

	/**
	 * Start timers.
	 */
	self.start = function()
	{
		var shortTimer = new timer(shortDelay, shortLoop);
		var longTimer = new timer(longDelay, longLoop);
	};

	/**
	 * Get an update message.
	 */
	self.getUpdate = function()
	{
		var update = {
			milliEarth: milliEarth,
		};
		iterate(function(body) {
				update[body.name] = body;
		});
		return update;
	}

	/**
	 * Add the body for a new player.
	 */
	self.add = function(player)
	{
		var body = new massiveBody(100, 2);
		var index = bodies.push(body);
		body.name = 'player' + index;
		if (index % 2)
		{
			body.setPosition(-meRadius, 0, 0);
			body.setSpeed(0, 95, 0);
		}
		else
		{
			body.setPosition(meRadius, 0, 0);
			body.setSpeed(0, 251.28, 0);
		}
	}

	/**
	 * Run a short loop of the world.
	 */
	function shortLoop()
	{
		iterate(function(body) {
				body.computeAttraction(milliEarth, shortDelay / 1000);
		});
	}

	function longLoop()
	{
		var message = 'Distances: ';
		iterate(function(body) {
				var distance = Math.round(meRadius - body.position.length());
				message += body.name + ' ' + body.position + ': ' + distance + ', ';
		});
		log(message);
	}

	/**
	 * Iterate over all bodies, call the callback for each.
	 */
	function iterate(callback)
	{
		for (var i = 0; i < bodies.length; i++)
		{
			var body = bodies[i];
			if (body)
			{
				callback(body);
			}
		}
	}
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
	var players = [];
	var active = false;
	var world = new gameWorld();

	/**
	 * Add a new player to the game.
	 */
	self.add = function(player)
	{
		players.push(player);
		world.add(player);
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
		if (active)
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
		var playerIds = [players[0].id, players[1].id];
		self.broadcast({
				type: 'start',
				players: playerIds
		});
		active = true;
		world.start();
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
		if (!active)
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
		self.error(player, 'Unknown game type ' + message.type);
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
		var update = world.getUpdate();
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


