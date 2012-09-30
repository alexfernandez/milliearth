'use strict';
/**
 * MilliEarth Runtime parameters.
 * (C) 2012 Alex Fernández
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
 * Return an object with constants.
 */
var params = new function()
{
	// the default port
	this.port = 80;
	// starting life for players, in energy (joules)
	this.life = 1e9;
	// min speed to cause harm, m/s
	this.minHarmSpeed = 100;
	// friction deceleration, m/s^2
	this.frictionDeceleration = 2;
	// forward acceleration using the motor, m/s^2
	this.motorAcceleration = 9;
	// max speed, m/s
	this.maxSpeed = 200
	// friction due to speed, 1/s
	this.frictionPeriod = (this.motorAcceleration - this.frictionDeceleration ) / this.maxSpeed;
	// brakes deceleration, m/s^2
	this.brakeDeceleration = 27;
	// coefficient of dampening due to suspension, unitless
	this.verticalDampening = 0.3;
	// gravity G constant, N·(m/kg)^2
	this.bigG = 6.67384e-11;
	// radius of MilliEarth: 1 thousandth the radius of Earth, in m
	this.meRadius = 6312.32;
	// mass of MilliEarth: 1 millionth the mass of Earth, in kg
	this.meMass = 5.97219e18;
	// robot mass, in kg
	this.robotMass = 100;
	// robot radius, in m
	this.robotRadius = 2;
	// set marks every given distance, m
	this.markDistance = 100;
	// half-width of the speed marks, m
	this.markHalfWidth = 2;
	// degrees of turn per second, radians
	this.turningAngle = Math.PI / 2;
	// number of projectiles available
	this.projectiles = 20;
	// mass of projectile
	this.projectileMass = 3;
	// radius of projectile
	this.projectileRadius = 0.2;
}

module.exports.params = params;


