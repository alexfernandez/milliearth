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
 * Three-dimensional vector, in meters.
 */
function vector(x, y, z)
{
	// self-reference
	var self = this;

	self.x = x;
	self.y = y;
	self.z = z;

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
		if (!isVector(value))
		{
			log('Vector product value ' + value + ' is not a vector');
			return 0;
		}
		return self.x * value.x + self.y * value.y + self.z * value.z;
	}

	/**
	 * Return the vector product or cross product.
	 */
	self.vectorProduct = function(value)
	{
		if (!isVector(value))
		{
			log('Vector product value ' + value + ' is not a vector');
			return new vector(0, 0, 0);
		}
		var x = self.y * value.z - self.z * value.y;
		var y = self.z * value.x - self.x * value.z;
		var z = self.x * value.y - self.y * value.x;
		return new vector(x, y, z);
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(' + round(self.x) + ',' + round(self.y) + ',' + round(self.z) + ')';
	}

	/**
	 * Round a vector value.
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

module.exports.vector = vector;

module.test = function()
{
	var a = new vector(1, 2, 3);
	console.log(a.scalarProduct(new vector(3, 4, 5)));
	console.log(a.vectorProduct(new vector(3, 4, 5)).toString());
}


