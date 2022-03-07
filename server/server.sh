#!/bin/bash

# delimiter for blocks to be sent over HTTP
delim="___"

# format of shown tracks
mpcfmt="%position%:%id%. %artist% - %title%"

host='password@localhost'

# make sure child processes are killed when this one is
trap 'trap - TERM; kill 0' INT TERM QUIT EXIT

# outputs an SSE stream containing changed elements of the music
# server (playlist, player, etc.), delimited by $delim
function mpc-statusloop() {
	mpc --host "$host"

	mpc --host "$host" idleloop | while read change; do
		printf "event: update_to\n\n"
		printf "data: $change\n\n"
		printf "\n\n"
		echo "$delim"
	done
}

# whenever the current track changes, outputs the current track,
# new tracks are delimited by $delim
function current-update() {
	mpc --host "$host" current -f "$mpcfmt"
	echo "$delim"

	mpc --host "$host" idleloop | while read change; do
		if [ $change == "player" ]; then
			mpc --host "$host" current -f "$mpcfmt"
			echo "$delim"
		fi
	done
}

# whenever the playist changes, outputs the playlist,
# new playlists are delimited by $delim
function playlist-update() {
	mpc --host "$host" playlist -f "$mpcfmt"
	echo "$delim"

	mpc --host "$host" idleloop | while read change; do
		if [ $change == "playlist" ]; then
			mpc --host "$host" playlist -f "$mpcfmt"
			echo "$delim"
		fi
	done
}

# TODO: use UNIX domain sockets instead, in the location the web API
# would expect to find them

# pipe the current playlist, current track and SSE status updates
# to HTTP endpoints
mpc-statusloop  | ssimoe 127.0.0.1:6601 -d "$delim" &
current-update  | ssimoe 127.0.0.1:6602 -d "$delim" -m 1 -b 1 &
playlist-update | ssimoe 127.0.0.1:6603 -d "$delim" -m 1 -b 1 &

wait
