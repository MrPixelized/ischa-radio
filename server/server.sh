#!/bin/bash

# delimiter for blocks to be sent over HTTP
delim="___"

# format of shown tracks
mpcfmt="%position%:%id%. %artist% - %title%"

# make sure child processes are killed when this one is
trap 'trap - TERM; kill 0' INT TERM QUIT EXIT

# outputs an SSE stream containing changed elements of the music
# server (playlist, player, etc.), delimited by $delim
function mpc-statusloop() {
	mpc

	mpc idleloop | while read change; do
		printf "event: update_to\n\n"
		printf "data: $change\n\n"
		printf "\n\n"
		echo "$delim"
	done
}

# whenever the current track changes, outputs the current track,
# new tracks are delimited by $delim
function current-update() {
	mpc current -f "$mpcfmt"
	echo "$delim"

	mpc idleloop | while read change; do
		if [ $change == "player" ]; then
			mpc current -f "$mpcfmt"
			echo "$delim"
		fi
	done
}

# whenever the playist changes, outputs the playlist,
# new playlists are delimited by $delim
function playlist-update() {
	mpc playlist -f "$mpcfmt"
	echo "$delim"

	mpc idleloop | while read change; do
		if [ $change == "playlist" ]; then
			mpc playlist -f "$mpcfmt"
			echo "$delim"
		fi
	done
}

# restream the HTTP output of the MPD server to DSH
function restream-mpd() {
	ffmpeg -i "http://localhost:8000/mpd.ogg" \
		   -c:v libx264 -c:a aac \
		   -f flv "rtmp://localhost/ischaradio/stream"
}

# TODO: use UNIX domain sockets instead, in the location the web API
# would expect to find them

# pipe the current playlist, current track and SSE status updates
# to HTTP endpoints
mpc-statusloop  | ssimoe 127.0.0.1:6601 -d "$delim" &
current-update  | ssimoe 127.0.0.1:6602 -d "$delim" -m 1 -b 1 &
playlist-update | ssimoe 127.0.0.1:6603 -d "$delim" -m 1 -b 1 &
restream-mpd &

wait
