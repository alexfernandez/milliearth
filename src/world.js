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
	self.life = params.life;

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
		if (distance < self.radius + attractor.radius)
		{
			// collision!
			var verticalSpeed = self.speed.scalarProduct(self.position.unit());
			if (verticalSpeed > params.minHarmSpeed)
			{
				self.substractDamage(verticalSpeed * verticalSpeed * self.mass / 2);
			}
			// remove vertical speed component
			self.speed.addScaled(self.position.unit(), -2 * verticalSpeed);
			// dampen speed
			var bumpSpeed = self.speed.length();
			self.speed.scale((bumpSpeed - params.frictionDeceleration) / bumpSpeed);
			// place out of collision
			var displacement = self.radius + attractor.radius - distance;
			self.position.addScaled(self.position.unit(), displacement);

		}
		var factor = params.bigG * attractor.mass / Math.pow(distance, 3);
		self.speed.addScaled(difference, factor * period);
		self.position.addScaled(self.speed, period);
	}

	/**
	 * Substract the given damage, in joules
	 */
	self.substractDamage = function(energy)
	{
		self.life -= energy;
	}
}


/**
 * The world where the game runs.
 */
var gameWorld = function(id)
{
	// self-reference
	var self = this;

	// attributes
	self.id = id;
	var milliEarth = new massiveBody('milliEarth', params.meMass, params.meRadius);
	var bodies = {};
	var seconds = 0;
	self.active = false;

	/**
	 * Start the world.
	 */
	self.start = function()
	{
		self.active = true;
	};

	/**
	 * Stop the world turning.
	 */
	self.stop = function()
	{
		self.active = false;
	}

	/**
	 * Get an update message for the player with the given id.
	 */
	self.getUpdate = function(id)
	{
		if (!self.active)
		{
			log('World not active');
			return {};
		}
		var update = {
			milliEarth: milliEarth,
			players: {},
			arrows: {},
		};
		iterate(function(body) {
				update.players[body.id] = body;
		});
		// add arrow for human player
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
		var body = new massiveBody(player.id, params.robotMass, params.robotRadius);
		bodies[body.id] = body;
		var size = 0;
		iterate(function(body) {
				size++;
		});
		var distance = params.meRadius + params.robotRadius;
		if (size % 2)
		{
			body.setPosition(-distance, 0, 0);
			body.setSpeed(0, 100, 0);
		}
		else
		{
			body.setPosition(distance, 0, 0);
			var orbitingSpeed = Math.sqrt(params.bigG * params.meMass / distance);
			body.setSpeed(0, orbitingSpeed, 0);
		}
	}

	/**
	 * Run a short loop of the world.
	 */
	self.shortLoop = function(delay)
	{
		if (!self.active)
		{
			return;
		}
		iterate(function(body) {
				body.computeAttraction(milliEarth, delay / 1000);
		});
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
		var message = 'World ' + self.id + ', ';
		iterate(function(body) {
				var distance = Math.round(params.meRadius - body.position.length());
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


