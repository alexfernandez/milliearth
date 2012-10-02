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
var globalParams = require('./params.js').globalParams;
var vector = require('./vector.js').vector;
var coordinateSystem = require('./vector.js').coordinateSystem;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var trace = util.trace;
var extend = util.extend;


/**
 * A massive body. Params:
 * - id: unique identifier.
 * - mass: the mass of the body, kg.
 * - radius: body size, m.
 * - position: a vector, m3.
 * - speed: a vector, m3.
 * - life: the amount of life.
 */
function massiveBody(params)
{
	// self-reference
	var self = this;
	self.setSelf = function(that)
	{
		self = that;
	}

	// attributes
	self.id = params.id;
	self.world = params.world;
	self.mass = params.mass;
	self.radius = params.radius;
	self.position = params.position || new vector(0, 0, 0);
	self.speed = params.speed || new vector(0, 0, 0);
	self.life = params.life;
	self.active = true;

	/**
	 * Compute gravitational attraction by another body in the given period (in seconds).
	 */
	self.computeAttraction = function(attractor, period)
	{
		var difference = attractor.position.difference(self.position);
		var distance = difference.length();
		var factor = globalParams.bigG * attractor.mass / Math.pow(distance, 3);
		self.speed.addScaled(difference, factor * period);
		if (distance < self.radius + attractor.radius)
		{
			self.computeMilliEarthCollision(attractor, period);
		}
	}

	/**
	 * Move following the current speed.
	 */
	self.move = function(period)
	{
		if (self.checkOutOfBounds())
		{
			self.active = false;
			return;
		}
		var scaledSpeed = self.speed.scale(period);
		self.position.add(scaledSpeed);
	}

	/**
	 * Compute the height above the milliEarth, position at (0,0,0).
	 */
	self.computeHeight = function()
	{
		return self.position.length() - self.world.milliEarth.radius;
	}

	/**
	 * Substract the given damage, in joules
	 */
	self.substractDamage = function(energy)
	{
		self.life -= energy;
		log(self.id + ' damaged: ' + energy + ', life: ' + self.life);
		if (self.life <= 0)
		{
			self.active = false;
		}
	}

	/**
	 * Compute a collision with the milliEarth, go to the general case of a collision.
	 */
	self.computeMilliEarthCollision = function(milliEarth, period)
	{
		self.computeCollision(milliEarth, self.speed.scale(self.mass));
	}

	/**
	 * Compute a collision with another body, given the momentum transfer.
	 */
	self.computeCollision = function(body, momentum)
	{
		self.transferMomentum(body, momentum);
	}

	/**
	 * Transfer some momentum to another body.
	 */
	self.transferMomentum = function(body, momentum)
	{
		self.substractMomentum(momentum);
		body.addMomentum(momentum);
	}

	/**
	 * Transfer some momentum from another body, as a vector.
	 */
	self.addMomentum = function(momentum)
	{
		var s = self.speed.copy();
		self.speed.addScaled(momentum, 1/self.mass);
	}

	/**
	 * Substract some momentum from self, as a vector.
	 */
	self.substractMomentum = function(momentum)
	{
		self.speed.addScaled(momentum, -1/self.mass);
	}

	/**
	 * Check if the body is out of bounds.
	 */
	self.checkOutOfBounds = function()
	{
		return self.position.length() > globalParams.lostDistance;
	}
}

/**
 * A projectile to be shot.
 */
function flyingProjectile(params)
{
	// self-reference
	var self = this;
	// extend massiveBody
	params.mass = globalParams.projectileMass;
	params.radius = globalParams.projectileRadius;
	params.life = 0;
	extend(new massiveBody(params), self);

	// attributes
	self.type = 'projectile';
	self.color = '#f00';

	/**
	 * Self-destruct on impact, damage colliding body.
	 */
	self.computeCollision = function(body, momentum)
	{
		self.active = false;
		body.substractDamage(globalParams.projectileCharge);
	}
}


/**
 * A fighter robot.
 */
function fighterRobot(params)
{
	// self-reference
	var self = this;
	// extend massiveBody
	params.mass = globalParams.robotMass;
	params.radius = globalParams.robotRadius;
	params.life = globalParams.robotLife;
	extend(new massiveBody(params), self);

	// attributes
	self.type = 'robot';
	self.projectiles = globalParams.projectiles;
	self.color = '#080';
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
	 * Compute a collision with the milliEarth: rebound, apply friction.
	 */
	self.computeMilliEarthCollision = function(milliEarth, period)
	{
		var differenceUnit = milliEarth.position.difference(self.position).unit();
		var collisionSpeed = self.speed.scalarProduct(differenceUnit);
		var verticalSpeed = differenceUnit.scale(collisionSpeed);
		var horizontalSpeed = self.speed.difference(verticalSpeed);
		if (collisionSpeed > globalParams.minHarmSpeed)
		{
			self.substractDamage(collisionSpeed * collisionSpeed * self.mass / 2);
		}
		if (collisionSpeed > 0)
		{
			// rebound with a little dampen
			self.speed.addScaled(verticalSpeed, -(2 - globalParams.verticalDampening)) * collisionSpeed;
		}
		if (horizontalSpeed.length() < 0)
		{
			// no horizontal speed; end here.
			return;
		}
		// dampen horizontal speed
		var deceleration = (globalParams.frictionDeceleration + self.speed.length() * globalParams.frictionPeriod) * period;
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
	 * Get a global update for the player.
	 */
	self.computeGlobalUpdate = function(bodies)
	{
		var meBody = {
			id: 'milliEarth',
			type: 'milliEarth',
			radius: self.world.milliEarth.radius,
			position: self.world.milliEarth.position,
		};
		var objects = [meBody];
		for (var id in bodies)
		{
			var body = bodies[id];
			objects.push({
				id: id,
				type: body.type,
				radius: body.radius,
				position: body.position,
				color: body.color,
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
		var center = computePosition(self.world.milliEarth);
		var meBody = {
			id: 'milliEarth',
			type: 'milliEarth',
			radius: self.world.milliEarth.radius,
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
					color: body.color,
				};
				objects.push(object);
			}
		}
		return {
			camera: camera,
			position: self.position,
			radius: self.world.milliEarth.radius,
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
		var d1 = Math.sqrt(h1 * h1 + 2 * h1 * self.world.milliEarth.radius);
		if (distance > d1)
		{
			var h2 = body.computeHeight() + body.radius;
			var d2 = Math.sqrt(h2 * h2 + 2 * h2 * self.world.milliEarth.radius);
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
		var origin = self.position.sumScaled(camera.v, self.radius);
		var position = body.position.difference(origin);
		return camera.project(position);
	}

	/**
	 * Compute the horizon vanishing point.
	 */
	self.computeHorizon = function()
	{
		var x = 0;
		var r = self.world.milliEarth.radius;
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
		self.speed.addScaled(camera.w, globalParams.motorAcceleration * period);
	}

	/**
	 * Activate the brakes.
	 */
	self.brake = function(period)
	{
		var deceleration = globalParams.brakeDeceleration * period;
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
		camera.yaw(globalParams.turningAngle * period);
	}

	/**
	 * Turn the camera right.
	 */
	self.turnRight = function(period)
	{
		camera.yaw(-globalParams.turningAngle * period);
	}

	/**
	 * Turn the camera up.
	 */
	self.turnUp = function(period)
	{
		camera.pitch(-globalParams.turningAngle * period);
	}

	/**
	 * Turn the camera down.
	 */
	self.turnDown = function(period)
	{
		camera.pitch(globalParams.turningAngle * period);
	}

	/**
	 * Turn sideways left.
	 */
	self.rollLeft = function(period)
	{
		camera.roll(globalParams.turningAngle * period);
	}

	/**
	 * Turn sideways right.
	 */
	self.rollRight = function(period)
	{
		camera.roll(-globalParams.turningAngle * period);
	}

	/**
	 * Shoot a projectile.
	 */
	self.shoot = function()
	{
		if (self.projectiles <= 0)
		{
			return;
		}
		var projectile = new flyingProjectile({
			id: 'projectile.' + self.id + '.' + self.projectiles,
			world: self.world,
		});
		projectile.position = self.position.sum(camera.w.scale(self.radius + projectile.radius));
		projectile.speed = self.speed.copy();
		var momentum = camera.w.scale(globalParams.projectileSpeed * projectile.mass);
		self.mass -= projectile.mass;
		// speed and recoil
		self.transferMomentum(projectile, momentum);
		// add to world
		self.world.addObject(projectile);
		self.projectiles--;
		log('Player ' + self.id + ' has fired a shot!');
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
	self.milliEarth = new massiveBody({
		id: 'milliEarth',
 		world: self,
 		mass: globalParams.meMass,
 		radius: globalParams.meRadius,
		life: globalParams.meLife,
	});
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
		if (!player || !player.active)
		{
			return {};
		}
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
		if (!player || !player.active)
		{
			return {};
		}
		return player.computeGlobalUpdate(bodies)
	}

	/**
	 * Add the robot for a new player.
	 */
	self.addRobot = function(id)
	{
		var robot = new fighterRobot({
			id: id,
			world: self,
		});
		bodies[robot.id] = robot;
		var size = 0;
		iterate(function(body) {
			size++;
		});
		var distance = globalParams.meRadius + robot.radius;
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
			var sqrt = Math.sqrt(2 * distance * distance) / 2;
			robot.start(
				new vector(distance + 2, -10, 0),
				//new vector(0, distance + 6000, 0),
				new vector(1, 0, 0));
		}
		return robot;
	}

	/**
	 * Add a new object to the world.
	 */
	self.addObject = function(object)
	{
		if (object.id in bodies)
		{
			log('Error: object ' + object.id + ' already exists');
			return;
		}
		bodies[object.id] = object;
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
		var period = delay / 1000;
		var bodiesArray = [];
		iterate(function(body) {
			bodiesArray.push(body);
		});
		for (var i = 0; i < bodiesArray.length; i++)
		{
			var body = bodiesArray[i];
			body.computeAttraction(self.milliEarth, period);
			for (var j = i + 1; j < bodiesArray.length; j++)
			{
				computeCollision(body, bodiesArray[j]);
			}
			body.move(period);
			if (!body.active)
			{
				log('Removing ' + body.id);
				delete bodies[body.id];
			}
		}
	}

	/**
	 * Compute a potential collision between two bodies for a given period.
	 */
	function computeCollision(body1, body2, period)
	{
		if (!checkCollision(body1, body2, period))
		{
			return;
		}
		// compute center of momentum frame
		var tm = body1.speed.scale(body1.mass).sum(body2.speed.scale(body2.mass));
		var u0 = tm.scale(1/(body1.mass + body2.mass));
		var u1 = body1.speed.difference(u0);
		var u2 = body2.speed.difference(u0);
		var ec = 1/2 * body1.mass * u1.squaredLength() + 1/2 * body2.mass * u2.squaredLength();
		var ec2 = - (body1.mass + body2.mass) * u1.scalarProduct(u2) / 2;
		var m1 = u1.scale(body1.mass);
		body1.computeCollision(body2, m1);
		var m2 = u2.scale(body2.mass);
		body2.computeCollision(body1, m2);
	}

	/**
	 * Check if the two bodies suffer a collision during the given period.
	 */
	function checkCollision(body1, body2, period)
	{
		// quick position check
		var p1 = body1.position;
		var p2 = body2.position;
		var d = p2.difference(p1);
		var d2 = d.squaredLength();
		if (d2 > globalParams.maxCollisionSpeed * period)
		{
			// we do not consider higher speeds
			return false;
		}
		// detailed position check
		var min = body1.radius + body2.radius;
		var min2 = min * min;
		var safety = globalParams.safetyDistance * globalParams.safetyDistance;
		if (d2 + safety < min2)
		{
			trace("Direct collision: " + d2 + ' < ' + min2);
			return true;
		}
		// quick trajectory check
		var s1 = body1.speed;
		var s2 = body2.speed;
		var ds = s2.difference(s1);
		var ds2 = ds.squaredLength();
		if (d2 - ds2 * period > min2)
		{
			// no way they are going to collide
			return false;
		}
		// detailed trajectory check
		// d: position vector from 1 to 2
		// ds: speed difference between 1 and 2
		// d2 = d · d, ds2 = ds · ds, q = d · ds
		// min distance time: tm = -q/ds2
		var q = d.scalarProduct(ds);
		var tm = -q/ds2;
		if (tm < 0 || tm > period)
		{
			return false;
		}
		// min distance: mind = sqrt(d2 - q^2 / (4 ds2))
		var mind = d2 - q*q/(4*ds2);
		if (mind + safety < min2)
		{
			trace("Speeding collision: " + mind + ' < ' + min2 + ' from ' + d2 + ' at ' + tm);
			return true;
		}
		return false;
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


