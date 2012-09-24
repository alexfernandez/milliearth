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
 * A painting projection. Starting coordinates for x and y, start depth and scale.
 * Zero startz means that z is not used to project.
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
		if (startz == 0)
		{
			return length * scale;
		}
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
		canvas.drawArc( {
				fillStyle: '#ccc',
				x: projection.projectX(body.position.x, body.position.z),
				y: projection.projectY(body.position.y, body.position.z),
				radius: projection.project(body.radius, body.position.z),
				opacity: opacity,
		});
	}

	/**
	 * Paint a circle with position and radius.
	 */
	self.paintCircle = function(body)
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
	 * Paint a line sent by the server, with start and end.
	 */
	self.paintLine = function(line)
	{
		// the drawLine() object
		var draw = {
			strokeStyle: "#00f",
			strokeWidth: 1,
			rounded: true,
			opacity: opacity,
		};
		draw['x1'] = projection.projectX(line.start.x, line.start.z);
		draw['y1'] = projection.projectY(line.start.y, line.start.z);
		draw['x2'] = projection.projectX(line.end.x, line.end.z);
		draw['y2'] = projection.projectY(line.end.y, line.end.z);
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

