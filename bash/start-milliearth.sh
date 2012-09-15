#! /bin/sh
### BEGIN INIT INFO
# Provides:          milliearth
# Required-Start:    $syslog $remote_fs $network
# Required-Stop:
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: start milliearth.
# Description:       Start the MilliEarth node.js script.
### END INIT INFO

case "$1" in
  start|"")
	# start milliearth
	sudo -u milliearth milliearth.sh &
	exit $?
	;;
  restart|reload|force-reload)
	echo "Error: argument '$1' not supported" >&2
	exit 3
	;;
  stop)
	# kill node.js
	killall node
	;;
  *)
	echo "Usage: /etc/init.d/milliearth.sh [start|stop]" >&2
	exit 3
	;;
esac

:
