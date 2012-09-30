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
var coordinateSystem = require('./vector.js').coordinateSystem;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var trace = util.trace;
var extend = util.extend;


/**
 * A massive body. Mass is given in kg.
 */
function massiveBody(id, mass, radius, position, speed)
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
	self.position = position || new vector(0, 0, 0);
	self.speed = speed || new vector(0, 0, 0);

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
	}
}


/**
 * A fighter robot.
 */
function fighterRobot(id, milliEarth, pole)
{
	// self-reference
	var self = this;
	// extend massiveBody
	extend(new massiveBody(id, params.robotMass, params.robotRadius), self);

	// attributes
	self.life = params.life;
	var camera = new coordinateSystem(new vector(0, 0, 1), new vector(0, 1, 0), new vector(1, 0, 0));

	/**
	 * Start a robot with position and speed. Aligns the camera to the given speed.
	 */
	self.start = function(position, speed)
	{
		self.position = position;
		self.speed = speed;
		camera = new coordinateSystem(position.vectorProduct(speed), position, speed);
		camera.alignV(position);
	}

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
		// camera.alignV(differenceUnit.scale(-1));
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
	self.computeGlobalUpdate = function(bodies)
	{
		var meBody = {
			id: 'milliEarth',
			type: 'milliEarth',
			radius: milliEarth.radius,
			position: milliEarth.position,
		};
		var objects = [meBody];
		for (var id in bodies)
		{
			var body = bodies[id];
			objects.push({
					id: id,
					type: 'robot',
					radius: body.radius,
					position: body.position
			});
		}
		objects.push(self.getArrow());
		return {
			speed: self.speed.length(),
			height: self.computeHeight() - self.radius,
			objects: objects,
		};
	}

	/**
	 * Get the arrow above the robot.
	 */
	self.getArrow = function()
	{
		var start = self.position.copy();
		start.addScaled(camera.w, -400);
		start.addScaled(camera.v, 400);
		var end = self.position.copy();
		end.addScaled(camera.w, 400);
		end.addScaled(camera.v, 400);
		var hat = self.position.copy();
		hat.addScaled(camera.w, 250);
		hat.addScaled(camera.v, 550);
		var position = self.position.copy();
		position.addScaled(camera.v, 400);
		return {
			id: self.id,
			type: 'arrow',
			position: position,
			points: [start, end, hat]
		};
	}

	/**
	 * Compute an update of what the current player can view:
	 * the line of sight positions for other players.
	 */
	self.computeViewUpdate = function(bodies)
	{
		var center = computePosition(milliEarth);
		var meBody = {
			id: 'milliEarth',
			type: 'milliEarth',
			radius: milliEarth.radius,
			position: center,
		};
		var objects = [meBody];
		for (var id in bodies)
		{
			var body = bodies[id];
			if (isVisible(body))
			{
				var object = {
					id: body.id,
					type: 'robot',
					radius: body.radius,
					position: computePosition(body),
				};
				objects.push(object);
			}
		}
		return {
			camera: camera,
			position: self.position,
			radius: milliEarth.radius,
			objects: objects,
		};
	}

	/**
	 * Find out if a body is visible or is behind the horizon.
	 */
	function isVisible(body)
	{
		var position = body.position.difference(self.position);
		var distance = position.length();
		var h1 = self.computeHeight();
		var d1 = Math.sqrt(h1 * h1 + 2 * h1 * milliEarth.radius);
		if (distance > d1)
		{
			var h2 = body.computeHeight() + body.radius;
			var d2 = Math.sqrt(h2 * h2 + 2 * h2 * milliEarth.radius);
			if (d1 + d2 < distance)
			{
				// below horizon
				return false;
			}
		}
		return true;
	}

	/**
	 * Compute the position of a body with respect to the line of sight.
	 */
	function computePosition(body)
	{
		var position = body.position.difference(self.position);
		return camera.project(position);
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
	 * Accelerate the robot.
	 */
	self.accelerate = function(period)
	{
		self.speed.addScaled(camera.w, params.motorAcceleration * period);
	}

	/**
	 * Activate the brakes.
	 */
	self.brake = function(period)
	{
		var deceleration = params.brakeDeceleration * period;
		if (self.speed.length() < deceleration)
		{
			self.speed = new vector(0, 0, 0);
			return;
		}
		self.speed.addScaled(self.speed.unit(), -deceleration);
	}

	/**
	 * Turn the camera left.
	 */
	self.turnLeft = function(period)
	{
		camera.yaw(params.turningAngle * period);
	}

	/**
	 * Turn the camera right.
	 */
	self.turnRight = function(period)
	{
		camera.yaw(-params.turningAngle * period);
	}

	/**
	 * Turn the camera up.
	 */
	self.turnUp = function(period)
	{
		camera.pitch(-params.turningAngle * period);
	}

	/**
	 * Turn the camera down.
	 */
	self.turnDown = function(period)
	{
		camera.pitch(params.turningAngle * period);
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
	var pole = new massiveBody('pole', 0, params.meRadius, new vector(params.meRadius, 0, 0), 0);
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
		return player.computeViewUpdate(bodiesExcept(id));
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
		return player.computeGlobalUpdate(bodies)
	}

	/**
	 * Add the robot for a new player.
	 */
	self.add = function(id)
	{
		var robot = new fighterRobot(id, milliEarth, pole);
		bodies[robot.id] = robot;
		var size = 0;
		iterate(function(body) {
				size++;
		});
		var distance = params.meRadius + robot.radius;
		if (size % 2)
		{
			// enemy
			robot.start(
				new vector(distance + 2, 160, 0),
				new vector(1, 0, 0));
		}
		else
		{
			// player
			var orbitingSpeed = Math.sqrt(params.bigG * params.meMass / distance);
			var sqrt = Math.sqrt(2 * distance * distance) / 2;
			robot.start(
				//new vector(distance + 2, -10, 0),
				new vector(sqrt + 4, sqrt + 4, 0),
				new vector(0, 1, 0));
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
				var distance = Math.round(body.computeHeight());
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


