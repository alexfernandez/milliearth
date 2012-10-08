'use strict';
/**
 * MilliEarth vector math.
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
var util = require('./util.js');
var log = util.log;


/**
 * Find out if a value is a number.
 */
function isNumber(n)
{
	return !isNaN(parseFloat(n)) && isFinite(n);
}
/**
 * Round a value to print easily.
 */
function round(value)
{
	if (value < 10)
	{
		return Math.round(value * 10) / 10;
	}
	return Math.round(value);
}

/**
 * A point in a 2d space. Can be a projection of a vector.
 */
var planarPoint = function(x, y)
{
	// self-reference
	var self = this;

	// attributes
	self.x = x;
	self.y = y;

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return 'x: ' + round(self.x) + ', y: ' + round(y);
	}
}

/**
 * Three-dimensional vector, in meters.
 */
function vector(x, y, z)
{
	// self-reference
	var self = this;

	if (x && isNumber(x.x))
	{
		// initialize using an object
		self.x = x.x;
		self.y = x.y;
		self.z = x.z;
	}
	else
	{
		self.x = x || 0;
		self.y = y || 0;
		self.z = z || 0;
	}

	/**
	 * Return a copy of this vector.
	 */
	self.copy = function()
	{
		return new vector(self.x, self.y, self.z);
	}

	/**
	 * Get a unit vector along this vector.
	 */
	self.unit = function()
	{
		return self.elongate(1);
	}

	/**
	 * Add another vector to this one, return the result.
	 */
	self.sum = function(point)
	{
		return new vector(self.x + point.x, self.y + point.y, self.z + point.z);
	}

	/**
	 * Add another vector to this one, scaled, and return the result.
	 */
	self.sumScaled = function(point, factor)
	{
		var term = point.scale(factor);
		return self.sum(term);
	}

	/**
	 * Add the given vector. Modifies the current vector.
	 */
	self.add = function(point)
	{
		self.x += point.x;
		self.y += point.y;
		self.z += point.z;
	}

	/**
	 * Add a scaled vector. Modifies the current vector.
	 */
	self.addScaled = function(point, scale)
	{
		self.x += point.x * scale;
		self.y += point.y * scale;
		self.z += point.z * scale;
	}

	/**
	 * Substract another point in space, return the difference as vector.
	 */
	self.difference = function(point)
	{
		return new vector(self.x - point.x, self.y - point.y, self.z - point.z);
	}

	/**
	 * Return a vector along this one but with the given length.
	 */
	self.elongate = function(length)
	{
		return self.scale(length / self.length());
	}

	/**
	 * Multiply by a scalar, return the result.
	 */
	self.scale = function(factor)
	{
		return new vector(self.x * factor, self.y * factor, self.z * factor);
	}

	/**
	 * Return the length of the vector, squared.
	 */
	self.squaredLength = function()
	{
		return self.x * self.x + self.y * self.y + self.z * self.z;
	}

	/**
	 * Return the length of the given vector.
	 */
	self.length = function()
	{
		var squared = self.squaredLength();
		return Math.sqrt(squared);
	}

	/**
	 * Return the scalar product or dot product.
	 */
	self.scalarProduct = function(value)
	{
		/*
		   if (!isVector(value))
		   {
		   log.e('Vector product value ' + value + ' is not a vector');
		   return 0;
		   }
		   */
		return self.x * value.x + self.y * value.y + self.z * value.z;
	}

	/**
	 * Return the vector product or cross product.
	 */
	self.vectorProduct = function(value)
	{
		/*
		   if (!isVector(value))
		   {
		   log.e('Vector product value ' + value + ' is not a vector');
		   return new vector(0, 0, 0);
		   }
		   */
		var x = self.y * value.z - self.z * value.y;
		var y = self.z * value.x - self.x * value.z;
		var z = self.x * value.y - self.y * value.x;
		return new vector(x, y, z);
	}

	/**
	 * Compare with another vector, return true if both are equal.
	 */
	self.equals = function(value)
	{
		if (!value)
		{
			return false;
		}
		var diff = self.difference(value).squaredLength();
		if (diff > 1e-15)
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
		return '(' + round(self.x) + ',' + round(self.y) + ',' + round(self.z) + ')';
	}

	/**
	 * Printable representation in full precision.
	 */
	self.toPrecision = function()
	{
		return '(' + self.x + ', ' + self.y + ', ' + self.z + ')';
	}

	/**
	 * Find out if the value has x, y and z components.
	 */
	function isVector(value)
	{
		if (!value)
		{
			return false;
		}
		if (!isFinite(value.x) || !isFinite(value.y) || !isFinite(value.z))
		{
			return false;
		}
		return true;
	}
}

/**
 * A vector using polar coordinates.
 */
var polarVector = function(r, phi, theta)
{
	// self-reference
	var self = this;

	// attributes
	if (r && r.x)
	{
		// convert from cartesian coordinates
		self.r = r.length();
		self.phi = Math.acos(r.z / self.r);
		self.theta = Math.atan(r.y / r.x);
	}
	else
	{
		self.r = r;
		self.phi = phi;
		self.theta = theta;
	}

	/**
	 * Convert to cartesian coordinates, return a vector.
	 * The optional center will be added to the result.
	 */
	self.toCartesian = function(center)
	{
		var x = self.r * Math.cos(self.theta) * Math.sin(self.phi);
		var y = self.r * Math.sin(self.theta) * Math.sin(self.phi);
		var z = self.r * Math.cos(self.phi);
		var v = new vector(x, y, z);
		if (center)
		{
			v.add(center);
		}
		return v;
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return round(self.r) + '->(' + round(degrees(self.phi)) + ',' + round(degrees(self.theta)) + ')';
	}

	/**
	 * Compute the value in degrees.
	 */
	function degrees(angle)
	{
		return angle * 180 / Math.PI;
	}
}


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
			log.e('Rotation should not have scalar component: ' + r.a);
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
 * A coordinate system defined by a single quaternion.
 */
function quaternionSystem(q, r, s, t)
{
	// self-reference
	var self = this;

	// attributes
	if (!q)
	{
		self.q = new quaternion(0, 0, 0, 0);
	}
	else if (q.q)
	{
		self.q = new quaternion(q.q).unit();
	}
	else if (q.a)
	{
		self.q = q;
	}
	else
	{
		self.q = new quaternion(q, r, s, t);
	}

	/**
	 * Align the system with the given vector.
	 */
	self.alignUpward = function(alignment)
	{
		var j = new vector(0, 1, 0);
		var p = alignment.unit();
		log.i('p ' + j.scalarProduct(p));
		var theta = Math.acos(j.scalarProduct(p));
		var v = j.vectorProduct(p);
		self.q = new quaternion().init(theta, v);
		log.i('Aligning with ' + p + ': ' + theta + ' -> ' + self.q);
		return self;
	}

	/**
	 * Project a position along the coordinate system.
	 */
	self.project = function(position)
	{
		return self.q.rotate(position);
	}

	/** 
	 * Get the upward coordinate of coordinate system: j.
	 */
	self.upward = function()
	{
		var j = new vector(0, 1, 0);
		return self.q.conjugate().rotate(j);
	}

	/**
	 * Get the forward-looking vector: k.
	 */
	self.forward = function()
	{
		var k = new vector(0, 0, 1);
		return self.q.conjugate().rotate(k);
	}

	/**
	 * Get the sideways vector: i.
	 */
	self.sideways = function()
	{
		var i = new vector(1, 0, 0);
		return self.q.conjugate().rotate(i);
	}

	/**
	 * Turn on the yaw angle (left and right horizontally), radians.
	 */
	self.yaw = function(angle)
	{
		turn(angle, self.upward());
	}

	/**
	 * Turn on the pitch angle (up and down), radians.
	 */
	self.pitch = function(angle)
	{
		turn(-angle, self.sideways());
	}

	/**
	 * Turn on the roll angle (sideways), radians.
	 */
	self.roll = function(angle)
	{
		turn(-angle, self.forward());
	}
	
	/**
	 * Turn the system on the given axis by the given angle.
	 */
	function turn(angle, axis)
	{
		var r = new quaternion().init(angle, axis);
		self.q = self.q.product(r);
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
 * Test vectors.
 */
function vectorTest()
{
	var a = new vector(1, 2, 3);
	var s = a.scalarProduct(new vector(3, 4, 5));
	if (s != 26)
	{
		log.e('Invalid scalar product: ' + s + ' != 26');
	}
	var v = a.vectorProduct(new vector(3, 4, 5));
	if (!v.equals(new vector(-2, 4, -2)))
	{
		log.e('Invalid vector product: ' + v + ' != (-2, 4, -2)');
	}
	log.success('vector: OK');
}

/**
 * Test quaternions.
 */
function quaternionTest()
{
	var q = new quaternion(0, 1, 2, 3);
	var r = new quaternion(4, 5, 6, 7);
	var product = q.product(r);
	if (!product.equals(new quaternion(-38, 0, 16, 8)))
	{
		log.e('Invalid product ' + product);
		return;
	}
	var s = new quaternion().init(Math.PI / 2, new vector(1, 0, 0));
	var v = new vector(0, 1, 0);
	var rotation = s.rotate(v);
	var result = new vector(0, 0, 1);
	if (!rotation.equals(result))
	{
		log.e('Invalid rotation ' + rotation.toPrecision() + ', should be ' + result);
		return;
	}
	log.success('quaternion: OK');
}

module.exports.isNumber = isNumber;
module.exports.planarPoint = planarPoint;
module.exports.vector = vector;
module.exports.polarVector = polarVector;
module.exports.quaternionSystem = quaternionSystem;

module.exports.test = function() {
	vectorTest();
	quaternionTest();
};


