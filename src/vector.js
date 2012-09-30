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
		var x = self.radius * Math.cos(self.theta) * Math.sin(self.phi);
		var y = self.radius * Math.sin(self.theta) * Math.sin(self.phi);
		var z = self.radius * Math.cos(self.phi);
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
 * A coordinate system with three axis, each determined by an orthogonal unit vector.
 */
function coordinateSystem(u, v, w)
{
	// self-reference
	var self = this;

	if (u && u.u)
	{
		// initialize using an object
		self.u = new vector(u.u).unit();
		self.v = new vector(u.v).unit();
		self.w = new vector(u.w).unit();
	}
	else
	{
		self.u = u.unit();
		self.v = v.unit();
		self.w = w.unit();
	}

	/**
	 * Align the v axis with the given vector.
	 */
	self.alignV = function(newV)
	{
		var vProduct = self.v.scalarProduct(newV);
		if (vProduct == 0)
		{
			log('Cannot align with perpendicular vector');
			return;
		}
		self.v = newV;
		var uProduct = self.u.scalarProduct(newV);
		if (uProduct != 0)
		{
			self.u = self.u.sum(newV.scale(-uProduct)).unit();
		}
		self.w = self.u.vectorProduct(self.v);
	}

	/**
	 * Project a position along the coordinate system.
	 */
	self.project = function(position)
	{
		var x = self.u.scalarProduct(position);
		var y = self.v.scalarProduct(position);
		var z = self.w.scalarProduct(position);
		return new vector(x, y, z);
	}

	/**
	 * Turn on the yaw angle (left and right horizontally), radians.
	 */
	self.yaw = function(angle)
	{
		var p = Math.cos(angle / (Math.PI / 2));
		var q = Math.sin(angle / (Math.PI / 2));
		var u = self.u.scale(p).sum(self.w.scale(q));
		var w = self.w.scale(p).sum(self.u.scale(-q));
		self.u = u;
		self.w = w;
	}

	/**
	 * Turn on the pitch angle (up and down), radians.
	 */
	self.pitch = function(angle)
	{
		var p = Math.cos(angle / (Math.PI / 2));
		var q = Math.sin(angle / (Math.PI / 2));
		var v = self.v.scale(p).sum(self.w.scale(q));
		var w = self.w.scale(p).sum(self.v.scale(-q));
		self.v = v;
		self.w = w;
	}
}

module.exports.vector = vector;
module.exports.polarVector = polarVector;
module.exports.coordinateSystem = coordinateSystem;

module.test = function()
{
	var a = new vector(1, 2, 3);
	console.log(a.scalarProduct(new vector(3, 4, 5)));
	console.log(a.vectorProduct(new vector(3, 4, 5)).toString());
}

