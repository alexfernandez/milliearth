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
var log = require('../util/log.js');
var debug = log.debug;
var info = log.info;
var error = log.error;
var success = log.success;


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
	if (value < 1)
	{
		return Math.round(value * 100) / 100;
	}

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
		   error('Vector product value ' + value + ' is not a vector');
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
		   error('Vector product value ' + value + ' is not a vector');
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
 * Test vectors.
 */
function vectorTest()
{
	var a = new vector(1, 2, 3);
	var s = a.scalarProduct(new vector(3, 4, 5));
	if (s != 26)
	{
		error('Invalid scalar product: ' + s + ' != 26');
	}
	var v = a.vectorProduct(new vector(3, 4, 5));
	if (!v.equals(new vector(-2, 4, -2)))
	{
		error('Invalid vector product: ' + v + ' != (-2, 4, -2)');
	}
	success('vector: OK');
}


module.exports.isNumber = isNumber;
module.exports.round = round;
module.exports.planarPoint = planarPoint;
module.exports.vector = vector;
module.exports.polarVector = polarVector;

module.exports.test = function() {
	vectorTest();
};


