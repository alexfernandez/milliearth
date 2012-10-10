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
var extend = util.extend;


/**
 * Find out if a value is a number.
 */
function isNumber(n)
{
	return !isNaN(parseFloat(n)) && isFinite(n);
}
/**
 * Round a value to print easily.
 */
function round(value)
{
	if (value < 1)
	{
		return Math.round(value * 100) / 100;
	}

	if (value < 10)
	{
		return Math.round(value * 10) / 10;
	}
	return Math.round(value);
}

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
		/*
		   if (!isVector(value))
		   {
		   log.e('Vector product value ' + value + ' is not a vector');
		   return 0;
		   }
		   */
		return self.x * value.x + self.y * value.y + self.z * value.z;
	}

	/**
	 * Return the vector product or cross product.
	 */
	self.vectorProduct = function(value)
	{
		/*
		   if (!isVector(value))
		   {
		   log.e('Vector product value ' + value + ' is not a vector');
		   return new vector(0, 0, 0);
		   }
		   */
		var x = self.y * value.z - self.z * value.y;
		var y = self.z * value.x - self.x * value.z;
		var z = self.x * value.y - self.y * value.x;
		return new vector(x, y, z);
	}

	/**
	 * Compare with another vector, return true if both are equal.
	 */
	self.equals = function(value)
	{
		if (!value)
		{
			return false;
		}
		var diff = self.difference(value).squaredLength();
		if (diff > 1e-15)
		{
			return false;
		}
		return true;
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(' + round(self.x) + ',' + round(self.y) + ',' + round(self.z) + ')';
	}

	/**
	 * Printable representation in full precision.
	 */
	self.toPrecision = function()
	{
		return '(' + self.x + ', ' + self.y + ', ' + self.z + ')';
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
		var x = self.r * Math.cos(self.theta) * Math.sin(self.phi);
		var y = self.r * Math.sin(self.theta) * Math.sin(self.phi);
		var z = self.r * Math.cos(self.phi);
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
 * A quaternion: a rotation of an angle along the given axis.
 */
function quaternion(a, b, c, d)
{
	// self-reference
	var self = this;

	// attributes
	if (a && a.a)
	{
		self.a = a.a;
		self.b = a.b;
		self.c = a.c;
		self.d = a.d;
	}
	else
	{
		self.a = a || 0;
		self.b = b || 0;
		self.c = c || 0;
		self.d = d || 0;
	}

	/**
	 * Initialize as a rotation: angle and axis.
	 */
	self.init = function(angle, axis)
	{
		self.a = Math.cos(angle / 2);
		var s = Math.sin(angle / 2);
		var a = axis.elongate(s);
		self.b = a.x;
		self.c = a.y;
		self.d = a.z;
		return self;
	}

	/**
	 * Return the difference with another quaternion.
	 */
	self.difference = function(q)
	{
		return new quaternion(self.a - q.a, self.b - q.b, self.c - q.c, self.d - q.d);
	}

	/**
	 * Hamilton product with another quaternion.
	 */
	self.product = function(q)
	{
		var a = self.a * q.a - self.b * q.b - self.c * q.c - self.d * q.d;
		var b = self.a * q.b + self.b * q.a + self.c * q.d - self.d * q.c;
		var c = self.a * q.c - self.b * q.d + self.c * q.a + self.d * q.b;
		var d = self.a * q.d + self.b * q.c - self.c * q.b + self.d * q.a;
		return new quaternion(a, b, c, d);
	}

	/**
	 * Return the conjugate of a quaternion.
	 */
	self.conjugate = function()
	{
		return new quaternion(self.a, -self.b, -self.c, -self.d);
	}

	/**
	 * Rotate the given point: q·p·q*.
	 */
	self.rotate = function(point)
	{
		var p = new quaternion(0, point.x, point.y, point.z);
		var r = self.product(p).product(self.conjugate());
		if (r.a > 1e10)
		{
			log.e('Rotation should not have scalar component: ' + r.a);
			return new vector(0, 0, 0);
		}
		return new vector(r.b, r.c, r.d);
	}

	/**
	 * Return a unit quaternion, such that a^2+b^2+c^2+d^2=1.
	 */
	self.unit = function()
	{
		var length = self.length();
		return new quaternion(self.a / length, self.b / length, self.c / length, self.d / length);
	}

	/**
	 * Get the length of the quaternion.
	 */
	self.length = function()
	{
		return Math.sqrt(self.a*self.a + self.b*self.b + self.c*self.c + self.d*self.d);
	}

	/**
	 * Compare with another quaternion, return true if both are equal.
	 */
	self.equals = function(q)
	{
		if (!q)
		{
			return false;
		}
		if (self.difference(q).length() > 1e-15)
		{
			return false;
		}
		return true;
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(' + round(self.a) + ' + ' + round(self.b) + 'i + ' + round(self.c) + 'j + ' + round(self.d) + 'k)';
	}
}


/**
 * A coordinate system defined by one quaternion.
 */
function coordinateSystem(q, r, s, t)
{
	// self-reference
	var self = this;
	self.setSelf = function(that)
	{
		self = that;
	}

	// attributes
	if (!q)
	{
		self.q = new quaternion(1, 0, 0, 0);
	}
	else if (q.q)
	{
		self.q = new quaternion(q.q).unit();
	}
	else if (q.a)
	{
		self.q = q.unit();
	}
	else
	{
		self.q = new quaternion(q, r, s, t);
	}

	/**
	 * Project a position along the coordinate system.
	 */
	self.project = function(position)
	{
		return self.q.rotate(position);
	}

	/**
	 * Align the quaternion with the given vector.
	 */
	self.alignUpward = function(alignment)
	{
		var j = self.upward()
		var p = alignment.unit();
		var theta = Math.acos(j.scalarProduct(p));
		var v = j.vectorProduct(p);
		turn(-theta, v);
		return self;
	}

	/** 
	 * Get the upward coordinate of coordinate system: j.
	 */
	self.upward = function()
	{
		return retroproject(new vector(0, 1, 0));
	}

	/**
	 * Get the forward-looking vector: k.
	 */
	self.forward = function()
	{
		return retroproject(new vector(0, 0, 1));
	}

	/**
	 * Get the sideways vector: i.
	 */
	self.sideways = function()
	{
		return retroproject(new vector(1, 0, 0));
	}

	/**
	 * Find the original position of a projected vector.
	 */
	function retroproject(position)
	{
		return self.q.conjugate().rotate(position);
	}

	/**
	 * Turn around the pitch angle (left and right), radians.
	 */
	self.pitch = function(angle)
	{
		turn(-angle, self.sideways());
	}

	/**
	 * Turn around the yaw angle (up and down), radians.
	 */
	self.yaw = function(angle)
	{
		turn(angle, self.upward());
	}

	/**
	 * Turn around the roll angle (sideways), radians.
	 */
	self.roll = function(angle)
	{
		turn(-angle, self.forward());
	}
	
	/**
	 * Turn the quaternion on the given axis by the given angle.
	 */
	function turn(angle, axis)
	{
		var r = new quaternion().init(angle, axis);
		self.q = self.q.product(r);
		self.update();
	}

	/**
	 * Do something here when the quaternion is updated.
	 */
	self.update = function()
	{
		// void
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(q: ' + self.q + ')';
	}
}


/**
 * A coordinate system defined by two quaternions: vehicle and an independent camera.
 */
function cameraSystem(vehicle, camera)
{
	// self-reference
	var self = this;
    // extend coordinateSystem
	extend(new coordinateSystem(), self);

	// attributes
	if (!vehicle)
	{
		vehicle = new quaternion(1, 0, 0, 0);
		camera = new quaternion(1, 0, 0, 0);
	}
	else if (vehicle.vehicle)
	{
		vehicle = new quaternion(vehicle.vehicle).unit();
		camera = new quaternion(vehicle.camera).unit();
	}
	else
	{
		vehicle = vehicle.unit();
		if (!camera)
		{
			log.e('Should supply camera quaternion');
			return;
		}
		camera = camera.unit();
	}
	self.vehicle = new coordinateSystem(vehicle);
	self.camera = new coordinateSystem(camera);
	// make sure both elements update the camera system
	self.vehicle.update = update;
	self.camera.update = update;
	update();

	/**
	 * Turn the vehicle around the pitch angle (left and right), radians.
	 */
	self.pitchVehicle = function(angle)
	{
		turnVehicle(-angle, self.sideways(self.vehicle));
	}

	/**
	 * Turn the vehicle around the yaw angle (up and down), radians.
	 */
	self.yawVehicle = function(angle)
	{
		turnVehicle(angle, self.upward(self.vehicle));
	}

	/**
	 * Turn the vehicle around the roll angle (sideways), radians.
	 */
	self.rollVehicle = function(angle)
	{
		turnVehicle(-angle, self.forward(self.vehicle));
	}

	/**
	 * Turn the camera around the pitch angle (up and down), radians.
	 */
	self.pitchCamera = function(angle)
	{
		turnCamera(-angle, self.sideways());
	}

	/**
	 * Turn the camera around the yaw angle (left and right horizontally), radians.
	 */
	self.yawCamera = function(angle)
	{
		turnCamera(angle, self.upward());
	}

	/**
	 * Turn the camera around the roll angle (sideways), radians.
	 */
	self.rollCamera = function(angle)
	{
		turnCamera(-angle, self.forward());
	}
	
	/**
	 * Turn the camera on the given axis by the given angle.
	 */
	function turnCamera(angle, axis)
	{
		var r = new quaternion().init(angle, axis);
		self.camera = self.camera.product(r);
		compute();
	}

	/**
	 * Compute the final quaternion.
	 */
	function update()
	{
		self.q = self.vehicle.q.product(self.camera.q);
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return '(vehicle: ' + self.vehicle.q + ', camera: ' + self.camera.q + ')';
	}
}


/**
 * Test vectors.
 */
function vectorTest()
{
	var a = new vector(1, 2, 3);
	var s = a.scalarProduct(new vector(3, 4, 5));
	if (s != 26)
	{
		log.e('Invalid scalar product: ' + s + ' != 26');
	}
	var v = a.vectorProduct(new vector(3, 4, 5));
	if (!v.equals(new vector(-2, 4, -2)))
	{
		log.e('Invalid vector product: ' + v + ' != (-2, 4, -2)');
	}
	log.success('vector: OK');
}

/**
 * Test quaternions.
 */
function quaternionTest()
{
	var q = new quaternion(0, 1, 2, 3);
	var r = new quaternion(4, 5, 6, 7);
	var product = q.product(r);
	if (!product.equals(new quaternion(-38, 0, 16, 8)))
	{
		log.e('Invalid product ' + product);
		return;
	}
	var s = new quaternion().init(Math.PI / 2, new vector(1, 0, 0));
	var v = new vector(0, 1, 0);
	var rotation = s.rotate(v);
	var result = new vector(0, 0, 1);
	if (!rotation.equals(result))
	{
		log.e('Invalid rotation ' + rotation.toPrecision() + ', should be ' + result);
		return;
	}
	log.success('quaternion: OK');
}

/**
 * Test coordinate system.
 */
function coordinateSystemTest()
{
	var q1 = new quaternion(1, 2, 3, 4);
	var system = new coordinateSystem(q1);
	var u = new vector(2, 5, 7);
	system.alignUpward(u);
	if (!u.unit().equals(system.upward()))
	{
		log.e('Invalid coordinate alignment: ' + system.upward() + ' should be ' + u.unit());
		return;
	}
	var q2 = new quaternion(5, 6, 7, 8);
	system = new cameraSystem(q1, q2);
	system.vehicle.alignUpward(u);
	system.camera.alignUpward(u);
	if (!u.unit().equals(system.upward()))
	{
		log.e('Invalid camera alignment: ' + system.upward() + ' should be ' + u.unit());
		return;
	}
	log.success('coordinate system: OK');
}

module.exports.isNumber = isNumber;
module.exports.planarPoint = planarPoint;
module.exports.vector = vector;
module.exports.polarVector = polarVector;
module.exports.coordinateSystem = coordinateSystem;
module.exports.cameraSystem = cameraSystem;

module.exports.test = function() {
	vectorTest();
	quaternionTest();
	coordinateSystemTest();
};


