'use strict';
/**
 * MilliEarth massive bodies.
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
var vector = require('../vector.js').vector;
var quaternion = require('../quaternion.js');
var coordinateSystem = quaternion.coordinateSystem;
var dependentSystem = quaternion.dependentSystem;
var util = require('../util.js');
var parser = util.parser;
var log = util.log;
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
	self.mass = params.mass;
	self.radius = params.radius;
	self.position = params.position || new vector(0, 0, 0);
	self.speed = params.speed || new vector(0, 0, 0);
	self.life = params.life;
	self.active = true;
	self.rolling = false;

	/**
	 * Compute gravitational attraction by another body in the given interval (in seconds).
	 */
	self.computeAttraction = function(attractor, interval)
	{
		var difference = attractor.position.difference(self.position);
		var distance = difference.length();
		var separation = distance - self.radius - attractor.radius;
		var factor = globalParams.bigG * attractor.mass / Math.pow(distance, 3);
		self.speed.addScaled(difference, factor * interval);
		if (separation <= 0)
		{
			self.rolling = true;
			self.computeMilliEarthCollision(attractor, interval);
		}
		else
		{
			self.rolling = false;
		}
	}

	/**
	 * Move following the current speed.
	 */
	self.move = function(interval)
	{
		if (self.checkOutOfBounds())
		{
			self.active = false;
			return;
		}
		var scaledSpeed = self.speed.scale(interval);
		self.position.add(scaledSpeed);
	}

	/**
	 * Compute the height above the milliEarth, position at (0,0,0).
	 */
	self.computeHeight = function()
	{
		return self.position.length() - globalParams.meRadius;
	}

	/**
	 * Substract the given damage, in joules
	 */
	self.substractDamage = function(energy)
	{
		self.life -= energy;
		log.i(self.id + ' damaged: ' + energy + ', life: ' + self.life);
		if (self.life <= 0)
		{
			self.active = false;
		}
	}

	/**
	 * Compute a collision with the milliEarth, go to the general case of a collision.
	 */
	self.computeMilliEarthCollision = function(milliEarth, interval)
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
		body.substractDamage(globalParams.projectileEnergyDensity * self.mass);
	}
}


module.exports.massiveBody = massiveBody;
module.exports.flyingProjectile = flyingProjectile;


