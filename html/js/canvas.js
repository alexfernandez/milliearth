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
			var system = new coordinateSystem(message.camera);
			var marks = self.computeMarks(new vector(message.origin), system, message.radius);
			message.objects = message.objects.concat(marks);
		}
		// addBeacons(message.objects);
		message.objects.sort(byDepth);
		adjustScale(message.objects);
		self.clear();
		paintObjects(message.objects);
		var center = {
			x: canvas.width() / 2,
			y: canvas.height() / 2,
			color: '#00f',
		};
		paintCrosshairs(center);
		if (message.target)
		{
			var target = projection.project(message.target);
			target.color = '#f00';
			paintCrosshairs(target);
		}
		self.show();
	}

	/**
	 * Add a few beacons to test geometry and projections.
	 */
	function addBeacons(objects)
	{
		var positions = [
			new vector(50, 0, 100),
			new vector(0, 50, 100),
			new vector(50, 50, 100),
		];
		for (var index in positions)
		{
			message.objects.push({
				type: 'beacon',
				position: positions[index],
				radius: 2,
				color: '#00f',
			});
		}
	}

	/**
	 * Adjust the scale of the projection to fit all objects.
	 */
	function adjustScale(objects)
	{
		projection.resetScale();
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
			else if (object.type == 'mark' || object.type == 'cannon')
			{
				paintLine(object);
			}
			else if (object.type == 'robot' || object.type == 'projectile' || object.type == 'beacon')
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
			// remove spurious negative heights
			var h = Math.max(p - r, 0.01);
			var d = Math.sqrt(h * h + 2 * h * r);
			return d;
		}
		return object.position.z;
	}

	/**
	 * Clear the layer.
	 */
	self.clear = function()
	{
		textPosition = 10;
		var rect = projection.getRect();
		rect.fillStyle = "#fff";
		rect.fromCenter = false;
		rect.opacity = opacity;
		rect.strokeStyle = '#aaa';
		rect.strokeWidth = 1;
		canvas.drawRect(rect);
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
			strokeStyle: line.color || '#00f',
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
	 * Paint the cross-hairs to aim, both vehicle and projectiles.
	 */
	function paintCrosshairs(crosshairs)
	{
		if (projection.planar)
		{
			return;
		}
		var l = 5;
		var draw = {
			strokeStyle: crosshairs.color,
			strokeWidth: 1,
			rounded: true,
			opacity: opacity,
			x1: crosshairs.x,
			y1: crosshairs.y - l,
			x2: crosshairs.x,
			y2: crosshairs.y + l,
		};
		canvas.drawLine(draw);
		draw.x1 = crosshairs.x - l;
		draw.y1 = crosshairs.y;
		draw.x2 = crosshairs.x + l;
		draw.y2 = crosshairs.y;
		canvas.drawLine(draw);
		canvas.drawArc( {
			strokeStyle: crosshairs.color,
			strokeWidth: 1,
			rounded: true,
			x: crosshairs.x,
			y: crosshairs.y,
			radius: l,
			opacity: opacity,
		});
	}
}

