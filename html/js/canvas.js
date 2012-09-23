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


var paintingProjection = function(startx, starty, startz, scale)
{
	// self-reference
	var self = this;

	/**
	 * Project the x coordinate.
	 */
	self.projectX = function(x, z)
	{
		return startx + self.project(x, z);
	}

	/**
	 * Project the y coordinate (reversed).
	 */
	self.projectY = function(y, z)
	{
		return starty - self.project(y, z);
	}

	/**
	 * Project a length on the z axis.
	 */
	self.project = function(length, z)
	{
		return length / (z + startz) * scale;
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
	var position = 10;
	opacity = opacity | 1.0;

	/**
	 * Clear the layer.
	 */
	self.clear = function()
	{
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
	self.paintText = function(message, value)
	{
	}

	/**
	 * Paint the milliEarth.
	 */
	self.paintMilliEarth = function(body)
	{
		canvas.drawArc( {
				fillStyle: '#ccc',
				x: projection.projectX(body.position.x, body.position.z),
				y: projection.projectY(body.position.y, body.position.z),
				radius: projection.project(body.radius, body.position.z),
				opacity: opacity,
		});
	}

	/**
	 * Paint a celestial body.
	 */
	self.paint = function(body)
	{
		var radius = Math.max(projection.project(body.radius, body.position.z), 1);
		canvas.drawArc( {
				fillStyle: '#000',
				x: projection.projectX(body.position.x, body.position.z),
				y: projection.projectY(body.position.y, body.position.z),
				radius: radius,
				opacity: opacity,
		});
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
			var point = polygon.points[i];
			draw['x' + (i+1)] = projection.projectX(point.x, point.z);
			draw['y' + (i+1)] = projection.projectY(point.y, point.z);
		}
		// Draw the line
		canvas.drawLine(draw);
	}

	/**
	 * Paint the horizon as a single line.
	 */
	self.paintHorizon = function(horizon)
	{
		var y = projection.projectY(horizon.y, horizon.z);
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

