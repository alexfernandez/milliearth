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
		if (distance < self.radius + attractor.radius)
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
function fighterRobot(id, milliEarth)
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
	 * Compute a collision with a body: rebound, apply friction.
	 */
	self.computeCollision = function(body, period)
	{
		var differenceUnit = body.position.difference(self.position).unit();
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
		var deceleration = (params.frictionDeceleration + self.speed.length() * params.frictionPeriod) * period;
		if (deceleration * period > horizontalSpeed.length())
		{
			self.speed.addScaled(horizontalSpeed, -1);
		}
		else
		{
			self.speed.addScaled(horizontalSpeed.unit(), -deceleration);
		}
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
	 * Get a global update for the player.
	 */
	self.getGlobalUpdate = function(bodies)
	{
		var update = {
			milliEarth: milliEarth,
			players: {},
			arrows: {},
			speed: self.speed.length(),
			height: self.computeHeight() - self.radius,
		};
		for (var id in bodies)
		{
			var body = bodies[id];
			update.players[id] = {
				id: id,
				radius: body.radius,
				position: body.position
			};
		}
		update.arrows[self.id] = self.getArrow();
		return update;
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
	self.computeSight = function(players)
	{
		self.up = self.position.unit();
		self.side = self.sight.vectorProduct(self.up);
		var update = {
			bodies: {
				_horizon: self.computeHorizon(),
			},
		};
		self.computeMarks(update.bodies);
		for (var id in players)
		{
			var position = computePlayerPosition(players[id]);
			if (position)
			{
				update.bodies['player_' + id] = position;
			}
		}
		return update;
	}

	/**
	 * Compute the position of a player with respect to the line of sight.
	 */
	function computePlayerPosition(player)
	{
		var position = player.position.difference(self.position);
		var distance = position.length();
		var h1 = self.computeHeight();
		var d1 = Math.sqrt(h1 * h1 + 2 * h1 * milliEarth.radius);
		if (distance > d1)
		{
			var h2 = player.computeHeight() + player.radius;
			var d2 = Math.sqrt(h2 * h2 + 2 * h2 * milliEarth.radius);
			if (d1 + d2 < distance)
			{
				// below horizon
				return null;
			}
		}
		var projected = project(position);
		if (!projected)
		{
			return null;
		}
		return {
			id: player.id,
			type: 'robot',
			radius: player.radius,
			position: projected,
		};
	}

	/**
	 * Compute the horizon vanishing point.
	 */
	self.computeHorizon = function()
	{
		var x = 0;
		var r = milliEarth.radius;
		var h = self.computeHeight();
		var d = Math.sqrt(h * h + 2 * h * r);
		var y = r * r / (r + h) - r - h;
		var z = r * d / (r + h);
		return {
			type: 'horizon',
			position: new vector(x, y, z),
		};
	}

	/**
	 * Get the next marks on the ground.
	 */
	self.computeMarks = function(update)
	{
		var r = milliEarth.radius;
		var h = self.computeHeight();
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
			var y = - h - 2 * r * sin * sin;
			var z = 2 * r * sin * cos;
			var id = 'mark_' + index;
			update[id] = {
				id: id,
				type: 'mark',
				position: new vector(0, y, z),
				start: new vector(-params.markHalfWidth, y, z),
				end: new vector(params.markHalfWidth, y, z),
			};
			s += params.markDistance;
			index ++;
		}
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
	 * Accelerate the robot.
	 */
	self.accelerate = function(period)
	{
		self.speed.addScaled(self.sight, params.motorAcceleration * period);
	}

	/**
	 * Activate the brakes.
	 */
	self.brake = function(period)
	{
		self.speed.addScaled(self.sight, - params.brakeDeceleration * period);
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
	 * Compute the height above the milliEarth, position at (0,0,0).
	 */
	self.computeHeight = function()
	{
		return self.position.length() - milliEarth.radius;
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
		return player.computeSight(bodiesExcept(id));
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
		var player = bodies[id];
		return player.getGlobalUpdate(bodies)
	}

	/**
	 * Add the robot for a new player.
	 */
	self.add = function(id)
	{
		var robot = new fighterRobot(id, milliEarth);
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
		return robot;
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


