#!/bin/bash
# Alex 2012-09-14: start MilliEarth server

cd /home/milliearth/deploy/
supervisor ~milliearth/deploy/src/milliearth.js &>> log_milliearth

