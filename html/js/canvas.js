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

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return 'x: ' + round(self.x) + ', y: ' + round(y);
	}

}

/**
 * A point using polar coordinates.
 */
var polarPoint = function(r, phi, theta)
{
	// self-reference
	var self = this;

	// attributes
	self.r = r;
	self.phi = phi;
	self.theta = theta;

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
		var i = (x - startx) / scale;
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
		return length / (z + startz);
	}

	/**
	 * Scale and center the X coordinate.
	 */
	function scaleX(length)
	{
		return startx + scale * length;
	}

	/**
	 * Scale and center the Y coordinate.
	 */
	function scaleY(length)
	{
		return starty - scale * length;
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
	 * Paint an update.
	 */
	self.paintUpdate = function(message)
	{
		var marks = self.computeMarks(new vector(message.position), new coordinateSystem(message.camera), message.radius);
		message.objects = message.objects.concat(marks);
		self.paintObjects(message.objects);
	}

	/**
	 * Compute the marks on the ground to paint.
	 */
	self.computeMarks = function(position, camera, radius)
	{
		var marks = [];
		var angles = computeAngles(position);
		var phi = Math.floor(angles.phi * 180 / Math.PI);
		var theta = Math.floor(angles.theta * 180 / Math.PI);
		var step = 1 * Math.PI/180;
		var polar = new polarPoint(radius, phi * Math.PI / 180, theta * Math.PI / 180);
		marks = marks.concat(computeMark(polar, position));
		/*
		polar.phi += step;
		marks = marks.concat(computeMark(polar, position));
		polar.theta += step;
		marks = marks.concat(computeMark(polar, position));
		polar.phi -= step;
		marks = marks.concat(computeMark(polar, position));
	   */
		return marks;
	}

	function computeMark(polar, center)
	{
		var diff = 0.01 * Math.PI / 180;
		polar.phi -= diff;
		polar.theta -= diff;
		var p1 = polar.toCartesian(center);
		polar.phi += 2 * diff;
		var p2 = polar.toCartesian(center);
		polar.theta += 2 * diff;
		var p3 = polar.toCartesian(center);
		polar.phi -= 2 * diff;
		var p4 = polar.toCartesian(center);
		if (p1 && p2 && p3 && p4)
		{
			var mark = {
				type: 'mark',
				start: p1,
				end: p3,
				position: p1,
				radius: 5,
			}
			return [mark];
		}
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
			if (object.type == 'milliEarth')
			{
				self.paintMilliEarth(object);
			}
			else if (object.type == 'pole')
			{
				self.paintPole(object);
			}
			else if (object.type == 'robot')
			{
				self.paintBody(object);
			}
			else if (object.type == 'arrow')
			{
				self.paintArrow(object);
			}
			else if (object.type == 'mark')
			{
				paintLine(object);
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
		return getDepth(object2) - getDepth(object1);
	}

	/**
	 * Compute the depth of an object.
	 */
	function getDepth(object)
	{
		if (object.depth)
		{
			return object.depth;
		}
		if (object.type == 'milliEarth' && !projection.planar)
		{
			// use depth of horizon
			var x = object.position.x;
			var y = object.position.y;
			var z = object.position.z;
			var r = object.radius;
			var p = Math.sqrt(x * x + y * y + z * z);
			var h = p - r;
			var d = Math.sqrt(h * h + 2 * h * r);
			object.depth = - d * (d * z + y * Math.sqrt(y*y + z*z - d*d)) / (y * y + z * z);
		}
		else
		{
			object.depth = object.position.z;
		}
		return object.depth;
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
		if (type.determinant < 0 || body.type != 'milliEarth')
		{
			paintEllipse(body, color);
			return;
		}
		paintHyperbola(body, color);
	}

	/**
	 * Paint marks on the ground based on the pole position.
	 */
	self.paintPole = function(pole)
	{
		//self.paintBody(pole, '#0f0');
		var p = new vector(pole.position).difference(pole.center);
		var angles = computeAngles(p);
		var phi = angles.phi;
		var theta = angles.theta;
		var step = 1 * Math.PI/180;
		var center = new vector(pole.center);
		var own = computeAngles(center);
		//$('#message').text('angles: ' + angles + ', own angles: ' + own);
		paintMark(new polarPoint(pole.radius, theta, phi), center);
		paintMark(new polarPoint(pole.radius, theta - step, phi), center);
		paintMark(new polarPoint(pole.radius, theta, phi - step), center);
		paintMark(new polarPoint(pole.radius, theta - step, phi - step), center);
	}

	function computeAngles(point)
	{
		var r = point.length();
		var phi = Math.acos(point.z / r);
		var theta = Math.atan(point.y / point.x);
		return new polarPoint(r, phi, theta);
	}

	function paintMark(polar, center)
	{
		var diff = 0.01 * Math.PI / 180;
		polar.phi -= diff;
		polar.theta -= diff;
		var p1 = projectPolar(polar, center);
		polar.phi += 2 * diff;
		var p2 = projectPolar(polar, center);
		polar.theta += 2 * diff;
		var p3 = projectPolar(polar, center);
		polar.phi -= 2 * diff;
		var p4 = projectPolar(polar, center);
		if (p1 && p2 && p3 && p4)
		{
			paintPolygon([p1, p2, p3, p4, p1], '#0c0');
		}
	}

	function projectPolar(polar, center)
	{
		var v = polar.toCartesian(center);
		if (v.z < 0)
		{
			return null;
		}
		return projection.project(v);
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
	 * Paint a line sent by the server, with start and end.
	 */
	function paintLine(line)
	{
		var start = projection.project(line.start);
		var end = projection.project(line.end);
		$('#message').text('start: ' + start + ', end: ' + end);
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
	 * Paint a circle for an object with position and radius and color.
	 */
	function paintCircle(object, color)
	{
		var point = projection.project(object.position);
		var radius = Math.max(projection.scale(object.radius), 1);
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
		var width = Math.max(2 * ellipse.major, 2);
		var height = Math.max(2 * ellipse.minor, 2);
		if (object.type == 'pole')
		{
			width = 10;
			height = 10;
		}
		canvas.drawEllipse( {
			fillStyle: color,
			x: ellipse.center.x,
			y: ellipse.center.y,
			width: width,
			height: height,
			opacity: opacity,
			rotate: ellipse.angle * 180 / Math.PI,
		});
	}

	/**
	 * Paint a hyperbola for the given object.
	 */
	function paintHyperbola(object, color)
	{
		var w = canvas.width();
		var h = canvas.height();
		if (object.position.y > 0)
		{
			h = 0;
		}
		var points = [new planarPoint(0, h)];
		for (var i = 0; i <= canvas.width(); i += 20)
		{
			points.push(projection.projectConic(object, i));
		}
		points.push(new planarPoint(w, h));
		points.push(new planarPoint(0, h));
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

