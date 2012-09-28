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
 * If planar, z is not used to project x and y.
 */
var paintingProjection = function(startx, starty, startz, scale)
{
	// self-reference
	var self = this;

	// attributes
	self.planar = false;

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
		var cx = startx + scale * (x * z / below);
		var cy = starty - scale * (- y * z / below);
		var a = scale * r / Math.sqrt(below);
		var b = scale * r * d / below;
		if (object.type == 'milliEarth')
		{
			$('#message').text('r: ' + r + ', h: ' + h + ', d: ' + Math.sqrt(d2) + ', a: ' + a + ', b: ' + b);
		}
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
	 */
	self.projectConic = function(object, x)
	{
		// first de-project
		var i = (x - startx) / scale
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
		var j1 = (sqrt - 2 * x * y * i - 2 * y * z) / (2 * (y * y - d2));
		var j2 = (- sqrt - 2 * x * y * i - 2 * y * z) / (2 * (y * y - d2));
		var point = new planarPoint(startx + scale * i, starty + scale * j2);
		return point;
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
		return starty + self.projectCoordinate(y, z);
	}

	/**
	 * Project a length on the z axis.
	 */
	self.projectCoordinate = function(length, z)
	{
		if (self.planar)
		{
			return scale * length;
		}
		return scale * length / (z + startz);
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
	 * Paint an array of objects.
	 */
	self.paintObjects = function(objects)
	{
		self.clear();
		objects.sort(sort);
		for (var id in objects)
		{
			var object = objects[id];
			if (object.type == 'horizon')
			{
				self.paintHorizon(object);
			}
			else if (object.type == 'robot')
			{
				self.paintBody(object);
			}
			else if (object.type == 'milliEarth')
			{
				self.paintMilliEarth(object);
			}
			else if (object.type == 'arrow')
			{
				self.paintArrow(object);
			}
			else if (object.type == 'mark')
			{
				self.paintLine(object);
			}
			else if (!object.type)
			{
				console.error('Object without type: ' + JSON.stringify(object));
			}
			else
			{
				console.error('Unknown object type ' + object.type);
			}
		}
		self.show();
	}

	/**
	 * Sort two objects using their relative depths.
	 */
	function sort(object1, object2)
	{
		return object2.position.z - object1.position.z;
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
		self.paintBody(body, '#ccc');
		return;
	}

	/**
	 * Paint a body with the given color.
	 */
	self.paintBody = function(body, color)
	{
		color = color || '#000';
		if (projection.planar)
		{
			paintCircle(body, color);
			return;
		}
		var type = projection.computeType(body);
		if (!type.visible)
		{
			return;
		}
		if (type.determinant < 0)
		{
			paintEllipse(body, color);
			return;
		}
		paintHyperbola(body, '#f00');
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
	 * Paint an arrow sent by the server.
	 */
	self.paintArrow = function(arrow)
	{
		var points = [];
		for (var i = 0; i < arrow.points.length; i += 1)
		{
			points.push(projection.project(arrow.points[i]));
		}
		paintPolygon(points, '#00f');
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

	/**
	 * Paint a circle for an object with position and radius and color.
	 */
	function paintCircle(object, color)
	{
		var point = projection.project(object.position);
		var radius = Math.max(projection.projectCoordinate(object.radius, object.position.z), 1);
		canvas.drawArc( {
			fillStyle: color,
			x: point.x,
			y: point.y,
			radius: radius,
			opacity: opacity,
		});
	}

	/**
	 * Paint an ellipse already computed.
	 */
	function paintEllipse(object, color)
	{
		var ellipse = projection.ellipse(object);
		var s = Math.sin(ellipse.angle);
		var c = Math.cos(ellipse.angle);
		canvas.drawEllipse( {
			fillStyle: color,
			x: ellipse.center.x,
			y: ellipse.center.y,
			width: 2 * ellipse.major,
			height: 2 * ellipse.minor,
			opacity: opacity,
			rotate: ellipse.angle * 180 / Math.PI,
		});
	}

	/**
	 * Paint a hyperbola for the given object.
	 */
	function paintHyperbola(object, color)
	{
		var points = [new planarPoint(0, canvas.height())];
		for (var i = 0; i <= canvas.width(); i += 10)
		{
			points.push(projection.projectConic(object, i));
		}
		points.push(new planarPoint(canvas.width(), canvas.height()));
		points.push(new planarPoint(0, canvas.height()));
		paintPolygon(points, '#ccc');
	}

	/**
	 * Paint a planar polygon using the given planar points.
	 */
	function paintPolygon(points, color)
	{
		// the drawLine() object
		var draw = {
			strokeStyle: color,
			fillStyle: color,
			strokeWidth: 1,
			rounded: true,
			opacity: opacity,
		};
		// add the points from the array to the object
		for (var i = 0; i < points.length; i += 1)
		{
			draw['x' + (i+1)] = points[i].x;
			draw['y' + (i+1)] = points[i].y;
		}
		// Draw the line
		canvas.drawLine(draw);
	}
}

