const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

class UpdateStreamer {
	constructor() {
		this.sse = new EventSource('https://radio.ischa.dev/status');
		this.event_handlers = [];
		this.sse.onmessage = (e) => {
			for (let handler of this.event_handlers) {
				handler(e);
			}
		}
	}

	add_handler(event_handler) {
		this.event_handlers.push(event_handler);
	}
}

const streamer = new UpdateStreamer();

class Playlist extends HTMLElement {
	constructor() {
		super();

		this.shadow = this.attachShadow({mode: 'open'});

		this.tracks = [];
		this.current = null;

		this.update_tracks().then();
		this.update_current().then();
		this.render();

		this.update();

		this.streamer = streamer;
		this.streamer.add_handler(this.update.bind(this));
	}

	render() {
		this.shadow.innerHTML = '';

		for (let track of this.tracks) {
			let element = document.createElement('p');
			element.innerHTML = track.index + '. ' + track.full_title;

			if (this.current == track) {
				element.style.color = 'var(--visited)';
				element.scrollIntoView();
			}

			this.shadow.appendChild(element);
		}
	}

	async update(e = null) {
		if (e === null) {
			await this.update_tracks();
			await this.update_current();
		} else {
			if (e.data == 'playlist') {
				await this.update_tracks();
			}

			await this.update_current();
		}

		this.render();
	}

	async update_tracks() {
		let tracks = await fetch('https://radio.ischa.dev/status/playlist');
		tracks = await tracks.text();
		tracks = tracks.trim().split('\n');
		
		this.tracks = [];

		for (let str of tracks) {
			this.tracks.push(new Track(str));
		}
	}

	async update_current() {
		let current = await fetch('https://radio.ischa.dev/status/current');
		current = await current.text();
		current = new Track(current);

		this.current = this.tracks[current.index - 1];
	}
}

class CurrentTrack extends HTMLElement {
	constructor() {
		super();

		this.shadow = this.attachShadow({mode: 'open'});
		this.track = null;

		this.update();

		this.streamer = streamer;
		this.streamer.add_handler(this.update.bind(this));
	}

	async update() {
		let data = await fetch('https://radio.ischa.dev/status/current');
		data = await data.text();

		this.track = new Track(data);
		this.render();
	}

	render() {
		this.shadow.innerHTML = this.track.format;
	}
}

class Track {
	constructor(str) {
		this.index = str.split(':')[0];

		let [_, ...title] = str.split(' ');
		this.full_title =  title.join(' ');
	}

	get format() {
		return this.index + '. ' + this.full_title;
	}
}

customElements.define('live-playlist', Playlist);
customElements.define('current-track', CurrentTrack);
