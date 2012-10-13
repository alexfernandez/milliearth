'use strict';
/**
 * MilliEarth fighter robots.
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
var globalParams = require('../params.js').globalParams;
var massiveBody = require('./body.js').massiveBody;
var flyingProjectile = require('./body.js').flyingProjectile;
var vector = require('../vector.js').vector;
var quaternion = require('../quaternion.js');
var coordinateSystem = quaternion.coordinateSystem;
var dependentSystem = quaternion.dependentSystem;
var util = require('../util.js');
var parser = util.parser;
var log = util.log;
var extend = util.extend;


/**
 * A subjective view of the world around a robot. Params:
 * - origin: where the view starts.
 * - system: coordinate system that defines the axis.
 */
function subjectiveView(params)
{
	// self-reference
	var self = this;

	// attributes
	self.origin = params.origin;
	self.system = params.system;

	/**
	 * Find out if a body is visible or is behind the horizon.
	 */
	self.isVisible = function(body, height)
	{
		var position = body.position.difference(self.origin);
		var distance = position.length();
		var h1 = height;
		var d1 = Math.sqrt(h1 * h1 + 2 * h1 * globalParams.meRadius);
		if (distance > d1)
		{
			var h2 = body.computeHeight() + body.radius;
			var d2 = Math.sqrt(h2 * h2 + 2 * h2 * globalParams.meRadius);
			if (d1 + d2 < distance)
			{
				// below horizon
				return false;
			}
		}
		return true;
	}

	/**
	 * Project the position of a body with respect to the line of sight.
	 */
	self.projectBodyPosition = function(body)
	{
		return self.projectPosition(body.position);
	}

	/**
	 * Project a position with respect to the line of sight.
	 */
	self.projectPosition = function(position)
	{
		var difference = position.difference(self.origin);
		return self.system.project(difference);
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
	self.world = params.world;
	var vehicle = new coordinateSystem();
	var cannon = new dependentSystem(vehicle);
	var shootTimeout = 0;

	/**
	 * Start a robot with position and speed. Aligns the vehicle to the given speed.
	 */
	self.start = function(position, speed)
	{
		self.position = position;
		self.speed = speed;
		vehicle.alignUpward(position);
		cannon.pitch(globalParams.turningAngle * 0.02);
	}

	/**
	 * Compute a collision with the milliEarth: rebound, apply friction.
	 */
	self.computeMilliEarthCollision = function(milliEarth, interval)
	{
		var difference = milliEarth.position.difference(self.position);
		var differenceUnit = difference.unit();
		var collisionSpeed = self.speed.scalarProduct(differenceUnit);
		var separation = difference.length() - milliEarth.radius - self.radius;
		if (isNaN(collisionSpeed))
		{
			log.e('Invalid collision speed for speed ' + self.speed + ' and difference unit vector ' + differenceUnit);
			return;
		}
		if (collisionSpeed < globalParams.minCollisionSpeed)
		{
			self.position.addScaled(differenceUnit, separation);
			return;
		}
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
		var deceleration = (globalParams.frictionDeceleration + self.speed.length() * globalParams.frictionInterval) * interval;
		if (deceleration * interval > horizontalSpeed.length())
		{
			self.speed.addScaled(horizontalSpeed, -1);
		}
		else
		{
			self.speed.addScaled(horizontalSpeed.unit(), -deceleration);
		}
		vehicle.alignUpward(differenceUnit.scale(-1));
	}

	/**
	 * Get a global update for the player.
	 */
	self.computeGlobalUpdate = function(bodies)
	{
		var meBody = {
			id: 'milliEarth',
			type: 'milliEarth',
			radius: globalParams.meRadius,
			position: new vector(0, 0, 0),
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
		var v = vehicle.upward();
		var w = vehicle.forward();
		start.addScaled(w, -400);
		start.addScaled(v, 400);
		var end = self.position.copy();
		end.addScaled(w, 400);
		end.addScaled(v, 400);
		var hat = self.position.copy();
		hat.addScaled(w, 250);
		hat.addScaled(v, 550);
		var position = self.position.copy();
		position.addScaled(v, 400);
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
		var view = new subjectiveView({
			origin: self.computeViewPosition(),
			system: vehicle,
		});
		var center = view.projectBodyPosition(self.world.milliEarth);
		var meBody = {
			id: 'milliEarth',
			type: 'milliEarth',
			radius: globalParams.meRadius,
			position: center,
		};
		var objects = [meBody];
		for (var id in bodies)
		{
			objects = objects.concat(getBodyUpdate(bodies[id], view));
		}
		var target = self.computeCannonPosition(globalParams.targetDistance);
		return {
			camera: vehicle.q,
			origin: view.origin,
			speed: self.speed.length(),
			radius: globalParams.meRadius,
			height: self.computeHeight() - self.radius,
			target: view.projectPosition(target),
			compass: computeCompass(view),
			objects: objects,
		};
	}

	/**
	 * Compute an update of what the cannon sees.
	 */
	self.computeCannonUpdate = function(bodies)
	{
		var view = new subjectiveView({
			origin: self.computeCannonPosition(),
			system: cannon,
		});
		var objects = [];
		for (var id in bodies)
		{
			objects = objects.concat(getBodyUpdate(bodies[id], view));
		}
		return {
			speed: self.speed.length(),
			objects: objects,
		}
	}

	/**
	 * Compute a unit vector that points to the North pole.
	 */
	function computeCompass(view)
	{
		var north = new vector(0, globalParams.meRadius, 0);
		return view.projectPosition(north).unit();
	}

	/**
	 * Get the update that corresponds to a body.
	 */
	function getBodyUpdate(body, view)
	{
		if (!view.isVisible(body, self.computeHeight()))
		{
			return [];
		}
		var objects = []
		var object = {
			id: body.id,
			type: body.type,
			radius: body.radius,
			position: view.projectBodyPosition(body),
			color: body.color,
		};
		objects.push(object);
		if (!(body instanceof fighterRobot))
		{
			return objects;
		}
		var start = view.projectPosition(body.computeViewPosition());
		var end = view.projectPosition(body.computeCannonPosition());
		var cannon = {
			id: self.id + '.cannon',
			type: 'cannon',
			position: start,
			start: start,
			end: end,
			color: '#f00',
		}
		objects.push(cannon);
		return objects;
	}

	/**
	 * Compute the position of the view origin.
	 */
	self.computeViewPosition = function()
	{
		return self.position.sumScaled(vehicle.upward(), self.radius);
	}

	/**
	 * Compute the horizon vanishing point.
	 */
	self.computeHorizon = function()
	{
		var x = 0;
		var r = globalParams.meRadius;
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
	self.accelerate = function(interval)
	{
		self.speed.addScaled(vehicle.forward(), globalParams.motorAcceleration * interval);
	}

	/**
	 * Activate the brakes.
	 */
	self.brake = function(interval)
	{
		var deceleration = globalParams.brakeDeceleration * interval;
		if (self.speed.length() < deceleration)
		{
			self.speed = new vector(0, 0, 0);
			return;
		}
		self.speed.addScaled(self.speed.unit(), -deceleration);
	}

	/**
	 * Turn the cannon left.
	 */
	self.pointLeft = function(interval)
	{
		cannon.yaw(globalParams.turningAngle * interval);
	}

	/**
	 * Turn the cannon right.
	 */
	self.pointRight = function(interval)
	{
		cannon.yaw(-globalParams.turningAngle * interval);
	}

	/**
	 * Turn the cannon up.
	 */
	self.pointUp = function(interval)
	{
		cannon.pitch(-globalParams.turningAngle * interval);
	}

	/**
	 * Turn the cannon down.
	 */
	self.pointDown = function(interval)
	{
		cannon.pitch(globalParams.turningAngle * interval);
	}

	/**
	 * Turn the vehicle left.
	 */
	self.turnLeft = function(interval)
	{
		vehicle.yaw(globalParams.turningAngle * interval);
	}

	/**
	 * Turn the vehicle right.
	 */
	self.turnRight = function(interval)
	{
		vehicle.yaw(-globalParams.turningAngle * interval);
	}

	/**
	 * Turn the vehicle up.
	 */
	self.turnUp = function(interval)
	{
		vehicle.pitch(-globalParams.turningAngle * interval);
	}

	/**
	 * Turn the vehicle down.
	 */
	self.turnDown = function(interval)
	{
		vehicle.pitch(globalParams.turningAngle * interval);
	}

	/**
	 * Turn vehicle sideways left.
	 */
	self.rollLeft = function(interval)
	{
		vehicle.roll(globalParams.turningAngle * interval);
	}

	/**
	 * Turn vehicle sideways right.
	 */
	self.rollRight = function(interval)
	{
		vehicle.roll(-globalParams.turningAngle * interval);
	}

	/**
	 * Compute the final position of the cannon. If a length is given it is counted
	 * from the start of the cannon.
	 */
	self.computeCannonPosition = function(length)
	{
		length = length || self.radius;
		return self.computeViewPosition().sum(cannon.forward().scale(length));
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
		if (self.world.seconds < shootTimeout)
		{
			return;
		}
		var projectile = new flyingProjectile({
			id: 'projectile.' + self.id + '.' + self.projectiles,
			world: self.world,
		});
		projectile.position = self.computeCannonPosition();
		projectile.speed = self.speed.copy();
		var momentum = cannon.forward().scale(globalParams.projectileSpeed * projectile.mass);
		self.mass -= projectile.mass;
		// speed and recoil
		self.transferMomentum(projectile, momentum);
		// add to world
		self.world.addObject(projectile);
		self.projectiles--;
		shootTimeout = self.world.seconds + globalParams.projectileRechargeTime;
		log.d('Player ' + self.id + ' has fired a shot!');
	}
}


module.exports.fighterRobot = fighterRobot;


