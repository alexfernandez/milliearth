'use strict';
/**
 * MilliEarth quaternion math.
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
var vector = require('./vector.js').vector;


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

module.exports.coordinateSystem = coordinateSystem;
module.exports.cameraSystem = cameraSystem;

module.exports.test = function() {
	quaternionTest();
	coordinateSystemTest();
};


