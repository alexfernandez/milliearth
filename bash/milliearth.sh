#!/bin/bash
# Alex 2012-09-14: start MilliEarth server

supervisor –nouse-idle-notification ~bin/milliearth.js &>> log_milliearth

