"use strict";
/**
 * MilliEarth canvas manipulation.
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
 * A point in a 2d space. Can be a projection of a vector.
 */
var planarPoint = function(x, y)
{
	// self-reference
	var self = this;

	// attributes
	self.x = x;
	self.y = y;
}

/**
 * A painting projection. Starting coordinates for x and y, start depth and scale.
 * Zero startz means that z is not used to project.
 */
var paintingProjection = function(startx, starty, startz, scale)
{
	// self-reference
	var self = this;

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
	 * Return the center of a projected circle.
	 */
	self.center = function(point, radius)
	{
		var p = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
		var h = p - radius;
		var d2 = h * h + 2 * h * radius;
		var below = d2 - point.x * point.x - point.y * point.y;
		var cx = startx + scale * point.x * point.z / below;
		var cy = starty - scale * point.y * point.z / below;
		return new planarPoint(cx, cy);
	}

	/**
	 * Project the x coordinate.
	 */
	self.projectX = function(x, z)
	{
		return startx + self.projectCoordinate(x, z);
	}

	/**
	 * Project the y coordinate (reversed).
	 */
	self.projectY = function(y, z)
	{
		return starty - self.projectCoordinate(y, z);
	}

	/**
	 * Project a length on the z axis.
	 */
	self.projectCoordinate = function(length, z)
	{
		if (self.isPlanar())
		{
			return scale * length;
		}
		return scale * length / (z + startz);
	}

	/**
	 * Find out if the projection is planar, or has perspective.
	 */
	self.isPlanar = function()
	{
		return (startz == 0);
	}
}

/**
 * A painting layer.
 */
var paintingLayer = function(name, projection, opacity)
{
	// self-reference
	var self = this;

	var canvas = $('#simulation');
	var textPosition = 0;
	if (opacity == 0)
	{
		opacity = opacity | 1.0;
	}

	/**
	 * Clear the layer.
	 */
	self.clear = function()
	{
		textPosition = 10;
	}

	/**
	 * Show the layer.
	 */
	self.show = function()
	{
	}

	/**
	 * Paint some text on the canvas.
	 */
	self.paintText = function(message, value, units)
	{
		value = Math.round(value);
		canvas.drawText( {
				fillStyle: '#000',
				// strokeStyle: '#25a',
				strokeWidth: 1,
				x: 10, y: textPosition,
				font: '10pt Helvetica, sans-serif',
				text: message + ' ' + value + ' ' + units,
				fromCenter: false,
				opacity: opacity,
		});
		textPosition += 20
	}

	/**
	 * Paint the milliEarth.
	 */
	self.paintMilliEarth = function(body)
	{
		var point = projection.project(body.position);
		canvas.drawArc( {
				fillStyle: '#ccc',
				x: point.x,
				y: point.y,
				radius: projection.projectCoordinate(body.radius, body.position.z),
				opacity: opacity,
		});
	}

	/**
	 * Paint a circle with position and radius.
	 */
	self.paintCircle = function(body)
	{
		var point = projection.project(body.position);
		var radius = Math.max(projection.projectCoordinate(body.radius, body.position.z), 1);
		canvas.drawArc( {
				fillStyle: '#000',
				x: point.x,
				y: point.y,
				radius: radius,
				opacity: opacity,
		});
		if (projection.isPlanar())
		{
			return;
		}
		var center = projection.center(body.position, body.radius);
		canvas.drawArc( {
				fillStyle: '#f00',
				x: center.x,
				y: center.y,
				radius: 1,
				opacity: opacity,
		});
	}

	/**
	 * Paint a line sent by the server, with start and end.
	 */
	self.paintLine = function(line)
	{
		var start = projection.project(line.start);
		var end = projection.project(line.end);
		// the drawLine() object
		var draw = {
			strokeStyle: "#00f",
			strokeWidth: 1,
			rounded: true,
			opacity: opacity,
		};
		draw['x1'] = start.x;
		draw['y1'] = start.y;
		draw['x2'] = end.x,
		draw['y2'] = end.y,
		// Draw the line
		canvas.drawLine(draw);
	}

	/**
	 * Paint a filled polygon sent by the server.
	 */
	self.paintPolygon = function(polygon)
	{
		// the drawLine() object
		var draw = {
			strokeStyle: "#00f",
			strokeWidth: 1,
			rounded: true,
			opacity: opacity,
		};
		// add the points from the array to the object
		for (var i = 0; i < polygon.points.length; i += 1)
		{
			var point = projection.project(polygon.points[i]);
			draw['x' + (i+1)] = point.x;
			draw['y' + (i+1)] = point.y;
		}
		// Draw the line
		canvas.drawLine(draw);
	}

	/**
	 * Paint the horizon as a single line.
	 */
	self.paintHorizon = function(horizon)
	{
		var y = projection.projectY(horizon.position.y, horizon.position.z);
		// the drawLine() object
		canvas.drawRect({
				fillStyle: "#ccc",
				rounded: true,
				x: 0,
				y: y,
				width: canvas.width(),
				height: canvas.height() - y,
				fromCenter: false,
				opacity: opacity,
		});
	}
}

