"use strict";
/**
 * MilliEarth projection on a screen.
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
 * A screen projection. Parameters:
 * - origin: a 3D vector with origin coordinates.
 * - scale: the initial scale.
 * - start: the upper left corner.
 * - end: the lower right corner.
 * - planar: if true, z is not used to project x and y.
 */
var screenProjection = function(params)
{
	// self-reference
		var self = this;

	// attributes
	var origin = params.origin;
	var start = params.start;
	var end = params.end;
	var scale = params.scale;
	self.planar = params.planar || false;

	/**
	 * Reset scale to initial value.
	 */
	self.resetScale = function()
	{
		scale = params.scale;
	}

	/**
	 * Adjust the scale to fit the given object.
	 */
	self.adjustScale = function(object)
	{
		var point = self.project(object.position);
		if (self.withinBounds(point))
		{
			return;
		}
		var factorx = 1;
		var factory = 1;
		if (point.x < start.x)
		{
			factorx = (start.x - origin.x) / (point.x - origin.x);
		}
		else if (point.x > end.x)
		{
			factorx = (end.x - origin.x) / (point.x - origin.x);
		}
		if (point.y < start.y)
		{
			factory = (start.y - origin.y) / (point.y - origin.y);
		}
		else if (point.y > end.y)
		{
			factory = (end.y - origin.y) / (point.y - origin.y);
		}
		if (factorx == 1 && factory == 1)
		{
			console.error('Out of bounds?');
			return;
		}
		scale *= Math.min(factorx, factory);
	}

	/**
	 * Find out if the given point is within bounds.
	 */
	self.withinBounds = function(point)
	{
		if (point.x < start.x)
		{
			return false;
		}
		if (point.y < start.y)
		{
			return false;
		}
		if (point.x > end.x)
		{
			return false;
		}
		if (point.y > end.y)
		{
			return false;
		}
		return true;
	}

	/**
	 * Project a 3d point into the 2d plane.
	 */
	self.project = function(point)
	{
		var x = self.projectX(point.x, point.z);
		var y = self.projectY(point.y, point.z);
		return new planarPoint(x, y);
	}

	/**
	 * Compute the type of projection for an object and if it is visible.
	 * Returns an object with two attributes: visible and determinant.
	 * Determinant < 0 means an ellipse, 0 means a parabola, > 0 a hyperbola.
	 */
	self.computeType = function(object)
	{
		var x = object.position.x;
		var y = object.position.y;
		var z = object.position.z;
		var r = object.radius;
		var p = Math.sqrt(x * x + y * y + z * z);
		var h = p - r;
		var d2 = h * h + 2 * h * r;
		var determinant = x * x + y * y - d2;
		var visible = true;
		if (determinant < 0 && z < 0)
		{
			visible = false;
		}
		return {
			visible: visible,
			determinant: determinant,
		};
	}

	/**
	 * Return the ellipse that corresponds a projected circle.
	 * Contains: center, major axis, minor axis.
	 * See: http://mathworld.wolfram.com/Ellipse.html
	 */
	self.ellipse = function(object)
	{
		var x = object.position.x;
		var y = object.position.y;
		var z = object.position.z;
		var r = object.radius;
		var p = Math.sqrt(x * x + y * y + z * z);
		var h = p - r;
		var d2 = h * h + 2 * h * r;
		var d = Math.sqrt(d2);
		var below = d2 - x * x - y * y;
		var cx = scaleX(x * z / below);
		var cy = scaleY(y * z / below);
		var a = scale * r / Math.sqrt(below);
		var b = scale * r * d / below;
		var diff = x * x - y * y;
		var angle;
		if (x == 0 || y == 0)
		{
			if (diff < 0)
			{
				angle = 0;
			}
			else
			{
				angle = Math.PI / 2;
			}
		}
		else
		{
			var atan = Math.atan(2 * x * y / diff);
			if (diff < 0)
			{
				angle = atan / 2;
			}
			else
			{
				angle = (Math.PI + atan) / 2;
			}
		}
		return {
			center: new planarPoint(cx, cy),
			major: a,
			minor: b,
			angle: angle,
		}
	}

	/**
	 * Find the projection for a conic at the given x coordinate.
	 * Based on: http://www.wolframalpha.com/input/?i=%28a*x+%2B+b*y+%2B+c%29^2%3Dd^2*%28x^2%2By^2%2B1%29.
	 */
	self.projectConic = function(object, x)
	{
		// first de-project
		var i = (x - origin.x) / scale;
		// now compute
		var x = object.position.x;
		var y = object.position.y;
		var z = object.position.z;
		var r = object.radius;
		var p = Math.sqrt(x * x + y * y + z * z);
		var h = p - r;
		var d2 = h * h + 2 * h * r;
		var t1 = 2 * x * y * i + 2 * y * z;
		var t2 = (y * y - d2) * (x * x * i * i + 2 * x * z * i + z * z - d2 * i * i - d2);
		var sqrt = Math.sqrt(t1 * t1 - 4 * t2);
		var j;
		if (y > 0)
		{
			j = (sqrt - 2 * x * y * i - 2 * y * z) / (2 * (y * y - d2));
		}
		else
		{
			j = (- sqrt - 2 * x * y * i - 2 * y * z) / (2 * (y * y - d2));
		}
		var point = new planarPoint(scaleX(i), scaleY(j));
		return point;
	}

	/**
	 * Scale a dimension.
	 */
	self.scale = function(length)
	{
		return scale * length;
	}

	/**
	 * Project the x coordinate.
	 */
	self.projectX = function(x, z)
	{
		return scaleX(projectCoordinate(x, z));
	}

	/**
	 * Project the y coordinate (reversed).
	 */
	self.projectY = function(y, z)
	{
		return scaleY(projectCoordinate(y, z));
	}

	/**
	 * Project a length on the z axis.
	 */
	function projectCoordinate(length, z)
	{
		if (self.planar)
		{
			return length;
		}
		return length / (z + origin.z);
	}

	/**
	 * Scale and center the X coordinate.
	 */
	function scaleX(length)
	{
		return origin.x + scale * length;
	}

	/**
	 * Scale and center the Y coordinate.
	 */
	function scaleY(length)
	{
		return origin.y - scale * length;
	}

	/**
	 * Get a big rectangle that spans the screen.
	 */
	self.getRect = function()
	{
		return {
			x: start.x,
			y: start.y,
			width: end.x - start.x,
			height: end.y - start.y,
		};
	}
}

