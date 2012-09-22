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
		var scaledSpeed = self.speed.scale(period);
		self.position.add(scaledSpeed);
		self.modifyMarks(scaledSpeed);
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
	self.up = new vector(0, 1, 0);
	self.side = new vector(1, 0, 0);
	self.mark = 100;

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
			self.speed.addScaled(verticalSpeed, -(2 - params.verticalDampening)) * collisionSpeed;
		}
		if (horizontalSpeed.length() < 0)
		{
			// no horizontal speed; end here.
			return;
		}
		// dampen horizontal speed
		var deceleration = params.frictionDeceleration + self.speed.length() * params.frictionPeriod;
		self.speed.addScaled(horizontalSpeed.unit(), -deceleration * period);
		self.sight = horizontalSpeed.unit();
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
	 * Compute the line of sight positions for other players.
	 */
	self.computeSight = function(milliEarth, players)
	{
		self.up = milliEarth.position.difference(self.position).unit();
		self.side = self.sight.vectorProduct(self.up);
		var playerPositions = {};
		for (var id in players)
		{
			var player = players[id];
			var position = player.position.difference(self.position);
			var projected = project(position);
			if (projected)
			{
				playerPositions[player.id] = {
					id: player.id,
					radius: player.radius,
					position: projected,
				};
			}
		}
		return {
			players: playerPositions,
			arrows: self.computeMarks(milliEarth),
			horizon: self.computeHorizon(milliEarth)
		};
	}

	/**
	 * Compute the horizon vanishing point.
 	 */
	self.computeHorizon = function(milliEarth)
	{
		var x = 0;
		var r = milliEarth.radius;
		var h = computeHeight(milliEarth);
		var d = Math.sqrt(h * h + 2 * h * r);
		var y = r * r / (r + h) - r + h;
		var z = r * d / (r + h);
		return new vector(x, y, z);
	}

	/**
	 * Get the next marks on the ground.
	 */
	self.computeMarks = function(milliEarth)
	{
		var marks = {};
		var r = milliEarth.radius;
		var h = computeHeight(milliEarth);
		var d = Math.sqrt(h * h + 2 * h * r);
		// distance to the horizon along the surface
		var sHor = r * Math.acos(r / (r + h));
		var s = self.mark;
		var index = 1;
		while (s < sHor)
		{
			var theta = s / r;
			var sin = Math.sin(theta / 2);
			var cos = Math.cos(theta / 2);
			var y = 2 * r * sin * sin + h;
			var z = 2 * r * sin * cos;
			var start = new vector(-2, y, z);
			var end = new vector(2, y, z);
			var id = 'mark' + index;
			marks[id] = {
				id: id,
				points: [start, end]
			};
			s += params.markDistance;
			index ++;
		}
		return marks;
	}

	/**
	 * Modify the marks.
	 */
	self.modifyMarks = function(positionChange)
	{
		self.mark -= positionChange.length();
		if (self.mark < 0)
		{
			self.mark += 100;
		}
	}

	/**
	 * Project a position along the line of sight.
	 * If behind the camera, return null.
	 */
	function project(position)
	{
		var z = self.sight.scalarProduct(position);
		if (z < 0)
		{
			return null;
		}
		var x = self.side.scalarProduct(position);
		var y = self.up.scalarProduct(position);
		return new vector(x, y, z);
	}

	/**
	 * Compute the height above the given body.
	 */
	function computeHeight(body)
	{
		var difference = body.position.difference(self.position);
		return difference.length() - body.radius;
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
		return player.computeSight(milliEarth, bodiesExcept(id));
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
					radius: body.radius,
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
			robot.position = new vector(distance + 2, 1000, 0);
			robot.speed = new vector(1, 0, 0);
		}
		else
		{
			robot.position = new vector(distance + 2, 0, 0);
			var orbitingSpeed = Math.sqrt(params.bigG * params.meMass / distance);
			robot.speed = new vector(0, 100, 0);
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

	/**
	 * Return all bodies except the given one.
	 */
	function bodiesExcept(id)
	{
		var except = {};
		iterate(function(body) {
				if (body.id != id)
				{
					except[body.id] = body;
				}
		});
		return except;
	}
}


module.exports.gameWorld = gameWorld;


