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
var globalParams = new function()
{
	// the default port
	this.port = 80;
	// min speed to cause harm, m/s
	this.minHarmSpeed = 100;
	// friction deceleration, m/s^2
	this.frictionDeceleration = 2;
	// forward acceleration using the motor, m/s^2
	this.motorAcceleration = 9;
	// max speed from motor acceleration, m/s
	this.maxSpeed = 200
	// friction due to speed, 1/s
	this.frictionInterval = (this.motorAcceleration - this.frictionDeceleration ) / this.maxSpeed;
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
	// life of MilliEarth in energy, joules
	this.meLife = 1e18;
	// robot mass, in kg
	this.robotMass = 200;
	// robot radius, in m
	this.robotRadius = 2;
	// starting life for players in energy, joules
	this.robotLife = 3e7;
	// minimum speed to consider a collision, m/s
	this.minCollisionSpeed = 0.2;
	// set marks every given distance, m
	this.markDistance = 100;
	// half-width of the speed marks, m
	this.markHalfWidth = 2;
	// turning speed, rad/s
	this.turningAngle = Math.PI / 4;
	// pointing at target speed, rad/s
	this.pointingAngle = 0.25 * this.turningAngle;
	// number of projectiles available
	this.projectiles = 20;
	// mass of projectile, kg
	this.projectileMass = 1;
	// radius of projectile, m
	this.projectileRadius = 0.2;
	// energy density of projectile, joules/kg
	this.projectileEnergyDensity = 10.4e6;
	// speed of projectile, m/s
	this.projectileSpeed = Math.sqrt(this.bigG * this.meMass / this.meRadius);
	// recharge speed for cannon, s
	this.projectileRechargeTime = 0.2;
	// distance at which objects are lost, m
	this.lostDistance = 3 * this.meRadius;
	// safety distance before a close encounter is a collision, m
	this.safetyDistance = 0.01;
	// max speed to consider in collisions, m/s
	this.maxCollisionSpeed = 1000;
	// distance to painted target, m
	this.targetDistance = 100;
	// atescript instructions per second, 1/s
	this.instructionsPerSecond = 500;
	// atescript scope width
	this.scopeWidth = 4;
}

module.exports.globalParams = globalParams;


