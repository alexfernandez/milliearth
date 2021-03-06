'use strict';
/**
 * MilliEarth.
 * Backend: run tests.
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
var atescriptTest = require('./script/atescript.js').test;
var vectorTest = require('./math/vector.js').test;
var quaternionTest = require('./math/quaternion.js').test;
var activateDebugMode = require('./util/log.js').activateDebugMode;
activateDebugMode();


/**
 * Run all tests.
 */
function runAll()
{
	atescriptTest();
	vectorTest();
	quaternionTest();
}

runAll();


