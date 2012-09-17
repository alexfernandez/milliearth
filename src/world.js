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
var extend = util.extend;


/**
 * A massive body. Mass is given in kg.
 */
function massiveBody(id, mass, radius)
{
	// self-reference
	var self = this;
	self.setSelf = function(that)
	{
		self = that;
	}

	// attributes
	self.id = id;
	self.mass = mass;
	self.radius = radius;
	self.position = new vector(0, 0, 0);
	self.speed = new vector(0, 0, 0);

	/**
	 * Compute gravitational attraction by another body in the given period (in seconds).
	 */
	self.computeAttraction = function(attractor, period)
	{
		var difference = attractor.position.difference(self.position);
		var distance = difference.length();
		var factor = params.bigG * attractor.mass / Math.pow(distance, 3);
		self.speed.addScaled(difference, factor * period);
		var newDistance = attractor.position.difference(self.position).length();
		if (newDistance < self.radius + attractor.radius)
		{
			self.computeCollision(attractor, period);
		}
		self.position.addScaled(self.speed, period);
	}

	/**
	 * Compute a collision: just stop.
	 */
	self.computeCollision = function(attractor, period)
	{
		var differenceUnit = attractor.position.difference(self.position).unit();
		var collisionSpeed = self.speed.scalarProduct(differenceUnit);
		var verticalSpeed = differenceUnit.scale(collisionSpeed);
		self.speed.addScaled(verticalSpeed, 1);
	}
}


/**
 * A fighter robot.
 */
function fighterRobot(id)
{
	// self-reference
	var self = this;
	// extend massiveBody
	extend(new massiveBody(id, params.robotMass, params.robotRadius), self);

	// attributes
	self.life = params.life;
	self.sight = new vector(0, 0, 1);

	/**
	 * Compute a collision: rebound, apply friction.
	 */
	self.computeCollision = function(attractor, period)
	{
		var differenceUnit = attractor.position.difference(self.position).unit();
		var collisionSpeed = self.speed.scalarProduct(differenceUnit);
		var verticalSpeed = differenceUnit.scale(collisionSpeed);
		var horizontalSpeed = self.speed.difference(verticalSpeed);
		if (collisionSpeed > params.minHarmSpeed)
		{
			self.substractDamage(collisionSpeed * collisionSpeed * self.mass / 2);
		}
		if (collisionSpeed > 0)
		{
			// rebound with a little dampen
			self.speed.addScaled(verticalSpeed, -(2 - params.verticalDampening));
		}
		// dampen horizontal speed
		self.speed.addScaled(horizontalSpeed.unit(), params.frictionDeceleration * period);
		self.sight = self.speed.unit();
	}

	/**
	 * Substract the given damage, in joules
	 */
	self.substractDamage = function(energy)
	{
		self.life -= energy;
	}

	/**
	 * Get the arrow above the robot.
	 */
	self.getArrow = function()
	{
		var unitSpeed = self.speed.unit();
		var unitElevation = self.position.unit();
		var start = self.position.copy();
		start.addScaled(unitSpeed, -400);
		start.addScaled(unitElevation, 400);
		var end = self.position.copy();
		end.addScaled(unitSpeed, 400);
		end.addScaled(unitElevation, 400);
		return {
			id: self.id,
			points: [start, end]
		};
	}

	/**
	 * Compute the line of sight positions for other bodies.
	 */
	self.computeSight = function(milliEarth, bodies)
	{
		var up = milliEarth.position.difference(self.position).unit();
		var side = self.sight.vectorProduct(up);
		var sight = {};
		for (var id in bodies)
		{
			var body = bodies[id];
			var position = body.position.difference(self.position);
			var x = side.scalarProduct(position);
			var y = up.scalarProduct(position);
			var z = self.sight.scalarProduct(position);
			sight[body.id] = {
				id: body.id,
				radius: body.radius,
				coords: new vector(x, y, z),
			};
		}
		return sight;
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
		var player = bodies[id];
		var update = player.computeSight(milliEarth, bodies);
		return update;
	}

	/**
	 * Get global positions update for the player with the given id.
	 */
	self.getGlobalUpdate = function(id)
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
				update.players[body.id] = {
					id: body.id,
					position: body.position
				};
		});
		// add arrow for current player
		var player = bodies[id];
		update.arrows[id] = player.getArrow();
		return update;
	}

	/**
	 * Add the robot for a new player.
	 */
	self.add = function(player)
	{
		var robot = new fighterRobot(player.id);
		bodies[robot.id] = robot;
		var size = 0;
		iterate(function(body) {
				size++;
		});
		var distance = params.meRadius + robot.radius;
		if (size % 2)
		{
			robot.position = new vector(-distance, 0, 0);
			robot.speed = new vector(0, 100, 0);
		}
		else
		{
			robot.position = new vector(distance, 0, 0);
			var orbitingSpeed = Math.sqrt(params.bigG * params.meMass / distance);
			robot.speed = new vector(0, orbitingSpeed, 0);
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


