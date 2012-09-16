'use strict';
/**
 * MilliEarth world logic.
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
var vector = require('./vector.js').vector;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var trace = util.trace;

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
 * A massive body. Mass is given in kg.
 */
function massiveBody(id, mass, radius)
{
	// self-reference
	var self = this;

	// attributes
	self.id = id;
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
	var milliEarth = new massiveBody('milliEarth', meMass, meRadius);
	var bodies = {};
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
	 * Get an update message for the player with the given id.
	 */
	self.getUpdate = function(id)
	{
		var update = {
			milliEarth: milliEarth,
			players: {},
			arrows: {},
		};
		iterate(function(body) {
				update.players[body.id] = body;
		});
		var player = bodies[id];
		var unitSpeed = player.speed.unit();
		var unitElevation = player.position.unit();
		var start = player.position.copy();
		start.addScaled(unitSpeed, -100);
		start.addScaled(unitElevation, 100);
		var end = player.position.copy();
		end.addScaled(unitSpeed, 100);
		end.addScaled(unitElevation, 100);
		update.arrows[id] = {
			id: id,
			points: [start, end]
		};
		return update;
	}

	/**
	 * Add the body for a new player.
	 */
	self.add = function(player)
	{
		var body = new massiveBody(player.id, 100, 2);
		bodies[body.id] = body;
		var size = 0;
		iterate(function(body) {
				size++;
		});
		if (size % 2)
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
				message += body.id + ' ' + body.position + ': ' + distance + ', ';
		});
		log(message);
	}

	/**
	 * Iterate over all bodies, call the callback for each.
	 */
	function iterate(callback)
	{
		for (var id in bodies)
		{
			callback(bodies[id]);
		}
	}
}


module.exports.gameWorld = gameWorld;


