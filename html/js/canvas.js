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
		if (!self.withinBounds(point))
		{
			if (point.x < start.x)
			{
				scale *= (start.x - origin.x) / (point.x - origin.x);
			}
			else if (point.x > start.x)
			{
				scale *= (end.x - origin.x) / (point.x - origin.x);
			}
			if (point.y < start.y)
			{
				scale *= (start.y + origin.y) / (point.y + origin.y);
			}
			else if (point.y > start.y)
			{
				scale *= (end.y + origin.y) / (point.y + origin.y);
			}
		}
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
}

/**
 * A painting layer.
 */
var paintingLayer = function(params)
{
	// self-reference
	var self = this;

	// attributes
	var textPosition = 0;
	var canvas = params.canvas;
	params.start = params.start || new planarPoint(0, 0);
	params.end = params.end || new planarPoint(canvas.width(), canvas.height());
	var projection = new screenProjection(params);
	var opacity = params.opacity || 1.0;
	var autoscale = params.autoscale || false;

	/**
	 * Paint an update.
	 */
	self.paintUpdate = function(message)
	{
		if (!projection.planar)
		{
			var marks = self.computeMarks(new vector(message.position), new coordinateSystem(message.camera), message.radius);
			message.objects = message.objects.concat(marks);
		}
		message.objects.sort(byDepth);
		projection.resetScale();
		adjustScale(message.objects);
		self.clear();
		paintObjects(message.objects);
		paintCrosshairs();
		self.show();
	}

	/**
	 * Adjust the scale of the projection to fit all objects.
	 */
	function adjustScale(objects)
	{
		if (!autoscale)
		{
			return;
		}
		for (var id in objects)
		{
			projection.adjustScale(objects[id]);
		}
	}

	/**
	 * Compute the marks on the ground to paint.
	 */
	self.computeMarks = function(position, camera, radius)
	{
		var marks = [];
		var angles = new polarVector(position);
		var phi = Math.floor(angles.phi * 180 / Math.PI);
		var theta = Math.floor(angles.theta * 180 / Math.PI);
		var step = 1 * Math.PI/180;
		var polar = new polarVector(radius, phi * Math.PI / 180, theta * Math.PI / 180);
		marks = marks.concat(computeMark(polar, camera, position));
		polar.phi += step;
		marks = marks.concat(computeMark(polar, camera, position));
		polar.theta += step;
		marks = marks.concat(computeMark(polar, camera, position));
		polar.phi -= step;
		marks = marks.concat(computeMark(polar, camera, position));
		return marks;
	}

	function computeMark(polar, camera, position)
	{
		var center = position.scale(-1);
		var diff = 0.01 * Math.PI / 180;
		polar.theta -= diff;
		var p1t = polar.toCartesian(center);
		polar.theta += 2* diff;
		var p2t = polar.toCartesian(center);
		polar.theta -= diff;
		polar.phi -= diff;
		var p1p = polar.toCartesian(center);
		polar.phi += 2 * diff;
		var p2p = polar.toCartesian(center);
		var start = camera.project(p1t);
		var markt = {
			type: 'mark',
			position: start,
			start: start,
			end: camera.project(p2t),
			radius: 5,
		}
		start = camera.project(p1p);
		var markp = {
			type: 'mark',
			position: start,
			start: start,
			end: camera.project(p2p),
			radius: 5,
		}
		return [markt, markp];
	}

	/**
	 * Paint an array of objects.
	 */
	function paintObjects (objects)
	{
		for (var id in objects)
		{
			var object = objects[id];
			if (!object.type)
			{
				console.error('Object without type: ' + JSON.stringify(object));
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
				paintLine(object);
			}
			else if (object.type == 'robot' || object.type == 'projectile')
			{
				self.paintBody(object);
			}
			else
			{
				console.error('Unknown object type ' + object.type);
			}
		}
	}

	/**
	 * Sort two objects using their relative depths.
	 */
	function byDepth(object1, object2)
	{
		return getDepth(object2) - getDepth(object1);
	}

	/**
	 * Compute the depth of an object.
	 */
	function getDepth(object)
	{
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
			return - d * (d * z + y * Math.sqrt(y*y + z*z - d*d)) / (y * y + z * z);
		}
		return object.position.z;
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
		color = color || body.color || '#000';
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
	 * Paint a line with start and end.
	 */
	function paintLine(line)
	{
		if (line.position.z < 0)
		{
			return;
		}
		var start = projection.project(line.start);
		var end = projection.project(line.end);
		if (!projection.withinBounds(start) && !projection.withinBounds(end))
		{
			return;
		}
		var draw = {
			strokeStyle: "#00f",
			strokeWidth: 1,
			rounded: true,
			opacity: opacity,
			x1: start.x,
			y1: start.y,
			x2: end.x,
			y2: end.y,
		};
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

	/**
	 * Paint the cross-hairs to aim.
	 */
	function paintCrosshairs()
	{
		if (projection.planar)
		{
			return;
		}
		var color = '#f00';
		var cx = canvas.width() / 2;
		var cy = canvas.height() / 2;
		var l = 5;
		var draw = {
			strokeStyle: color,
			strokeWidth: 1,
			rounded: true,
			opacity: opacity,
			x1: cx,
			y1: cy - l,
			x2: cx,
			y2: cy + l,
		};
		canvas.drawLine(draw);
		draw.x1 = cx - l;
		draw.y1 = cy;
		draw.x2 = cx + l;
		draw.y2 = cy;
		canvas.drawLine(draw);
		canvas.drawArc( {
			strokeStyle: color,
			strokeWidth: 1,
			rounded: true,
			x: cx,
			y: cy,
			radius: l,
			opacity: opacity,
		});
	}
}

