'use strict';
/**
 * MilliEarth quaternion math.
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
var util = require('./util/util.js');
var extend = util.extend;
var round = require('./vector.js').round;
var vector = require('./vector.js').vector;
var log = require('./util/log.js');
var error = log.error;
var success = log.success;


/**
 * A quaternion: a rotation of an angle along the given axis.
 */
function quaternion(a, b, c, d)
{
	// self-reference
	var self = this;

	// attributes
	if (a && a.a)
	{
		self.a = a.a;
		self.b = a.b;
		self.c = a.c;
		self.d = a.d;
	}
	else
	{
		self.a = a || 0;
		self.b = b || 0;
		self.c = c || 0;
		self.d = d || 0;
	}

	/**
	 * Initialize as a rotation: angle and axis.
	 */
	self.init = function(angle, axis)
	{
		self.a = Math.cos(angle / 2);
		var s = Math.sin(angle / 2);
		var a = axis.elongate(s);
		self.b = a.x;
		self.c = a.y;
		self.d = a.z;
		return self;
	}

	/**
	 * Return the difference with another quaternion.
	 */
	self.difference = function(q)
	{
		return new quaternion(self.a - q.a, self.b - q.b, self.c - q.c, self.d - q.d);
	}

	/**
	 * Hamilton product with another quaternion.
	 */
	self.product = function(q)
	{
		var a = self.a * q.a - self.b * q.b - self.c * q.c - self.d * q.d;
		var b = self.a * q.b + self.b * q.a + self.c * q.d - self.d * q.c;
		var c = self.a * q.c - self.b * q.d + self.c * q.a + self.d * q.b;
		var d = self.a * q.d + self.b * q.c - self.c * q.b + self.d * q.a;
		return new quaternion(a, b, c, d);
	}

	/**
	 * Return the conjugate of a quaternion.
	 */
	self.conjugate = function()
	{
		return new quaternion(self.a, -self.b, -self.c, -self.d);
	}

	/**
	 * Rotate the given point: q·p·q*.
	 */
	self.rotate = function(point)
	{
		var p = new quaternion(0, point.x, point.y, point.z);
		var r = self.product(p).product(self.conjugate());
		if (r.a > 1e10)
		{
			error('Rotation should not have scalar component: ' + r.a);
			return new vector(0, 0, 0);
		}
		return new vector(r.b, r.c, r.d);
	}

	/**
	 * Return a unit quaternion, such that a^2+b^2+c^2+d^2=1.
	 */
	self.unit = function()
	{
		var length = self.length();
		return new quaternion(self.a / length, self.b / length, self.c / length, self.d / length);
	}

	/**
	 * Get the length of the quaternion.
	 */
	self.length = function()
	{
		return Math.sqrt(self.a*self.a + self.b*self.b + self.c*self.c + self.d*self.d);
	}

	/**
	 * Compare with another quaternion, return true if both are equal.
	 */
	self.equals = function(q)
	{
		if (!q)
		{
			return false;
		}
		if (self.difference(q).length() > 1e-15)
		{
			return false;
		}
		return true;
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(' + round(self.a) + ' + ' + round(self.b) + 'i + ' + round(self.c) + 'j + ' + round(self.d) + 'k)';
	}
}


/**
 * A coordinate system defined by one quaternion.
 */
function coordinateSystem(q, r, s, t)
{
	// self-reference
	var self = this;
	self.setSelf = function(that)
	{
		self = that;
	}

	// attributes
	if (!q)
	{
		self.q = new quaternion(1, 0, 0, 0);
	}
	else if (q.q)
	{
		self.q = new quaternion(q.q).unit();
	}
	else if (q.a)
	{
		self.q = new quaternion(q).unit();
	}
	else
	{
		self.q = new quaternion(q, r, s, t);
	}
	var listeners = [];

	/**
	 * Project a position along the coordinate system.
	 */
	self.project = function(position)
	{
		return self.q.rotate(position);
	}

	/**
	 * Align the quaternion with the given vector.
	 */
	self.alignUpward = function(alignment)
	{
		if (alignment.length() == 0)
		{
			return;
		}
		var j = self.upward()
		var p = alignment.unit();
		var product = j.scalarProduct(p);
		if (product == 0)
		{
			// no way to align
			return;
		}
		if (product > 1)
		{
			// rounding error; no need to align
			return
		}
		var theta = Math.acos(product);
		if (isNaN(theta))
		{
			error('NaN angle: j ' + j + ' p ' + p + ' product ' + product);
			return;
		}
		var v = j.vectorProduct(p);
		turn(-theta, v);
		return self;
	}

	/** 
	 * Get the upward coordinate of coordinate system: j.
	 */
	self.upward = function()
	{
		return retroproject(new vector(0, 1, 0));
	}

	/**
	 * Get the forward-looking vector: k.
	 */
	self.forward = function()
	{
		return retroproject(new vector(0, 0, 1));
	}

	/**
	 * Get the sideways vector: i.
	 */
	self.sideways = function()
	{
		return retroproject(new vector(1, 0, 0));
	}

	/**
	 * Find the original position of a projected vector.
	 */
	function retroproject(position)
	{
		return self.q.conjugate().rotate(position);
	}

	/**
	 * Turn around the pitch angle (left and right), radians.
	 */
	self.pitch = function(angle)
	{
		turn(-angle, self.sideways());
	}

	/**
	 * Turn around the yaw angle (up and down), radians.
	 */
	self.yaw = function(angle)
	{
		turn(angle, self.upward());
	}

	/**
	 * Turn around the roll angle (sideways), radians.
	 */
	self.roll = function(angle)
	{
		turn(-angle, self.forward());
	}
	
	/**
	 * Turn the quaternion on the given axis by the given angle.
	 */
	function turn(angle, axis)
	{
		var r = new quaternion().init(angle, axis);
		var result = self.q.product(r);
		if (result.length() == 0)
		{
			error('Invalid rotation ' + angle + ', ' + axis);
			return;
		}
		self.q = result;
		update();
	}

	/**
	 * Add a listener for update events.
	 */
	self.addListener = function(listener)
	{
		listeners.push(listener);
	}

	/**
	 * Tell listeners that the quaternion is updated.
	 */
	var update = function()
	{
		for (var index in listeners)
		{
			listeners[index].update(self);
		}
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(q: ' + self.q + ')';
	}
}


/**
 * A coordinate system that depends on another one (is mounted on it),
 * but keeps its own quaternion.
 * Useful for a camera, a cannon, etcetera.
 */
function dependentSystem(primary)
{
	// self-reference
	var self = this;
    // extend coordinateSystem
	extend(new coordinateSystem(), self);

	// attributes
	if (!primary)
	{
		error('Must supply a primary coordinate system');
		return;
	}
	self.primary = primary;
	self.primary.addListener(self);
	var last = new quaternion(1, 0, 0, 0);

	/**
	 * Update the primary quaternion.
	 */
	self.update = function()
	{
		var original = self.q.product(last.conjugate());
		last = self.primary.q;
		self.q = original.product(last);
	}
	self.update();

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(primary: ' + self.primary.q + ', dependent: ' + self.q + ')';
	}
}


/**
 * Test quaternions.
 */
function testQuaternion()
{
	var q = new quaternion(0, 1, 2, 3);
	var r = new quaternion(4, 5, 6, 7);
	var product = q.product(r);
	if (!product.equals(new quaternion(-38, 0, 16, 8)))
	{
		error('Invalid product ' + product);
		return;
	}
	var s = new quaternion().init(Math.PI / 2, new vector(1, 0, 0));
	var v = new vector(0, 1, 0);
	var rotation = s.rotate(v);
	var result = new vector(0, 0, 1);
	if (!rotation.equals(result))
	{
		error('Invalid rotation ' + rotation.toPrecision() + ', should be ' + result);
		return;
	}
	success('quaternion: OK');
}

/**
 * Check that the upward vector in the coordinate system is aligned with u.
 * Return 0 on success, 1 on error.
 */
function checkUpward(system, u)
{
	if (!u.unit().equals(system.upward()))
	{
		error('Invalid coordinate alignment: ' + system.upward() + ' should be ' + u.unit());
		return 1;
	}
	return 0;
}

/**
 * Test coordinate system.
 */
function testCoordinateSystem()
{
	var errors = 0;
	var q1 = new quaternion(1, 2, 3, 4);
	var system = new coordinateSystem(q1);
	var u = new vector(2, 5, 7);
	system.alignUpward(u);
	errors += checkUpward(system, u);
	var q2 = new quaternion(5, 6, 7, 8);
	system = new coordinateSystem(q2);
	var dependent = new dependentSystem(system);
	dependent.alignUpward(u);
	errors += checkUpward(dependent, u);
	// now turn original, check dependent is aligned
	var q3 = new quaternion(1, 3, 5, 7);
	system = new coordinateSystem(q3);
	dependent = new dependentSystem(system);
	system.alignUpward(u);
	errors += checkUpward(dependent, u);
	if (errors == 0)
	if (errors == 0)
	{
		success('coordinate system: OK');
	}
}

module.exports.coordinateSystem = coordinateSystem;
module.exports.dependentSystem = dependentSystem;

module.exports.test = function() {
	testQuaternion();
	testCoordinateSystem();
};


