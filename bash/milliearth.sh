#!/bin/bash
# Alex 2012-09-14: start MilliEarth server

cd /home/milliearth/milliearth/
supervisor ~milliearth/milliearth/src/milliearth.js &>> log_milliearth

