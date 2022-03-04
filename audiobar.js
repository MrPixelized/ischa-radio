function set_audio_volume(volume) {
	for (audio of document.getElementsByTagName("audio")) {
		audio.volume = volume;
	}
}

set_audio_volume(0.25);
