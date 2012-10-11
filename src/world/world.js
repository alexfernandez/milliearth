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
var globalParams = require('../params.js').globalParams;
var vector = require('../vector.js').vector;
var massiveBody = require('./body.js').massiveBody;
var fighterRobot = require('./robot.js').fighterRobot;
var util = require('../util.js');
var parser = util.parser;
var log = util.log;
var extend = util.extend;


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
	self.seconds = 0;
	self.active = false;
	var bodies = {};

	/**
	 * Start the world.
	 */
	self.start = function()
	{
		self.active = true;
		self.seconds = 0;
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
			log.e('World not active');
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
			log.e('World not active');
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
				new vector(100, distance + 2, 0),
				new vector(1, 0, 0));
		}
		else
		{
			// player
			robot.start(
				new vector(-10, distance + 2, 0),
				new vector(0, 1, 0));
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
			log.e('Error: object ' + object.id + ' already exists');
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
		var interval = delay / 1000;
		self.seconds += interval;
		var bodiesArray = [];
		iterate(function(body) {
			bodiesArray.push(body);
		});
		for (var i = 0; i < bodiesArray.length; i++)
		{
			var body = bodiesArray[i];
			body.computeAttraction(self.milliEarth, interval);
			for (var j = i + 1; j < bodiesArray.length; j++)
			{
				computeCollision(body, bodiesArray[j]);
			}
			body.move(interval);
			if (!body.active)
			{
				log.i('Removing ' + body.id);
				delete bodies[body.id];
			}
		}
	}

	/**
	 * Compute a potential collision between two bodies for a given interval.
	 */
	function computeCollision(body1, body2, interval)
	{
		if (!checkCollision(body1, body2, interval))
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
		// each object may (or not) transfer its part of momentum
		var m1 = u1.scale(body1.mass);
		body1.computeCollision(body2, m1);
		var m2 = u2.scale(body2.mass);
		body2.computeCollision(body1, m2);
	}

	/**
	 * Check if the two bodies suffer a collision during the given interval.
	 */
	function checkCollision(body1, body2, interval)
	{
		// quick position check
		var p1 = body1.position;
		var p2 = body2.position;
		var d = p2.difference(p1);
		var d2 = d.squaredLength();
		if (d2 > globalParams.maxCollisionSpeed * interval)
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
			log.d("Direct collision: " + d2 + ' < ' + min2);
			return true;
		}
		// quick trajectory check
		var s1 = body1.speed;
		var s2 = body2.speed;
		var ds = s2.difference(s1);
		var ds2 = ds.squaredLength();
		if (d2 - ds2 * interval > min2)
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
		if (tm < 0 || tm > interval)
		{
			return false;
		}
		// min distance: mind = sqrt(d2 - q^2 / (4 ds2))
		var mind = d2 - q*q/(4*ds2);
		if (mind + safety < min2)
		{
			log.d("Speeding collision: " + mind + ' < ' + min2 + ' from ' + d2 + ' at ' + tm);
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


