'use strict';
/**
 * MilliEarth computer to run the code.
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
var scriptingEngine = require('./atescript.js').scriptingEngine;
var log = require('./util/log.js');
var debug = log.debug;
var info = log.info;
var error = log.error;


/**
 * A computer that controls an auto player.
 * Any attributes and functions here can be used by scripts, so be careful!
 */
function autoComputer(robot, script)
{
	// self-reference
	var self = this;

	// attributes
	var engine = new scriptingEngine({
		file: script,
		computer: self,
	});
	self.view = {};
	self.cannon = {};
	self.scope = {};
	self.map = {};
	self.speed = 0;

	/**
	 * Get the engine.
	 */
	self.getEngine = function()
	{
		return engine;
	}

	/**
	 * Run an update of the outside world.
	 */
	self.update = function(interval, bodies)
	{
		var update = robot.computeViewUpdate(bodies);
		self.speed = update.speed;
		self.view = {};
		self.cannon = {};
		self.scope = {};
		for (var index in update.objects)
		{
			var object = update.objects[index];
			self.view[object.id] = object;
			if (object.type == 'robot')
			{
				object.enemy = true;
			}
		}
		update = robot.computeCannonUpdate(bodies);
		for (var index in update.objects)
		{
			var object = update.objects[index];
			self.cannon[object.id] = object;
			var scopeDistance = Math.sqrt(object.position.x * object.position.x + object.position.y * object.position.y);
			if (scopeDistance < globalParams.scopeWidth && object.position.z > 0)
			{
				self.scope[object.id] = object;
			}
		}
	}

	/**
	 * Point at an object with position.
	 */
	self.pointAt = function(interval, object)
	{
		//refresh object
		var object = self.view[object.id];
		var position = object.position;
		if (position.z < 0)
		{
			if (position.x < 0)
			{
				robot.turnLeft(interval);
			}
			else
			{
				robot.turnRight(interval);
			}
			if (position.y > 0)
			{
				robot.turnUp(interval);
			}
			else
			{
				robot.turnDown(interval);
			}
			return interval;
		}
		if (position.x < 0)
		{
			robot.turnLeft(interval);
		}
		else
		{
			robot.turnRight(interval);
		}
		if (position.y > 0)
		{
			robot.turnUp(interval);
		}
		else
		{
			robot.turnDown(interval);
		}
		return interval;
	}

	/**
	 * Point the cannon at an object with position.
	 */
	self.pointCannonAt = function(interval, object)
	{
		//refresh object
		var object = self.cannon[object.id];
		if (!object)
		{
			// error('Object not found in cannon view');
			return interval;
		}
		var position = object.position;
		if (position.z < 0)
		{
			if (position.x < 0)
			{
				robot.pointLeft(interval);
			}
			else
			{
				robot.pointRight(interval);
			}
			if (position.y > 0)
			{
				robot.pointUp(interval);
			}
			else
			{
				robot.pointDown(interval);
			}
			return interval;
		}
		if (position.x < 0)
		{
			robot.pointLeft(interval);
		}
		else
		{
			robot.pointRight(interval);
		}
		if (position.y > 0)
		{
			robot.pointUp(interval);
		}
		else
		{
			robot.pointDown(interval);
		}
		return interval;
	}

	/**
	 * Fine tune the scope.
	 */
	self.refineScopeAt = function(interval, object)
	{
		//refresh object
		var object = self.cannon[object.id];
		if (!object)
		{
			// error('Object not found in cannon view');
			return interval;
		}
		var position = object.position;
		var tx = position.x / position.z / globalParams.turningAngle;
		if (position.x < 0)
		{
			robot.pointLeft(Math.min(interval, -tx));
		}
		else
		{
			robot.pointRight(Math.min(interval, tx));
		}
		var ty = position.y / position.z / globalParams.turningAngle;
		if (position.y > 0)
		{
			robot.pointUp(Math.min(interval, ty));
		}
		else
		{
			robot.pointDown(Math.min(interval, -ty));
		}
		return interval;
	}

	/**
	 * Make the robot accelerate.
	 */
	self.accelerate = function(interval)
	{
		robot.accelerate(interval);
		return interval;
	}

	/**
	 * Shoot.
	 */
	self.shoot = function(interval)
	{
		robot.shoot();
		return globalParams.projectileRechargeTime;
	}
}

module.exports.autoComputer = autoComputer;

