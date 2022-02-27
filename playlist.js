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

class UpdateStreamer {
	constructor() {
		this.sse = new EventSource('https://radio.ischa.dev/status');
		this.event_handlers = [];
		this.sse.onmessage = async (e) => {
			for (let handler of this.event_handlers) {
				await handler(e);
			}
		}
	}

	add_handler(event_handler) {
		this.event_handlers.push(event_handler);
	}
}

class MpdData {
	constructor() {
		this.streamer = new UpdateStreamer();
		this.tracks = null;
		this.current = null;

		this.streamer.add_handler(this.update.bind(this));
	}

	async update(e = null) {
		if (e === null) {
			await this.update_tracks();
		} else {
			if (e.data == 'playlist') {
				await this.update_tracks();
			}
		}

		await this.update_current();
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

const mpd_data = new MpdData();

class Playlist extends HTMLElement {
	constructor() {
		super();

		this.shadow = this; //.attachShadow({mode: 'open'});

		this.data = mpd_data;
		this.data.streamer.add_handler(this.render.bind(this))

		this.render();
	}

	async render(_e) {
		if (!this.data.current) {
			await this.data.update();
		}

		this.shadow.innerHTML = '';

		for (let track of this.data.tracks) {
			let element = document.createElement('p');
			element.innerHTML = track.index + '. ' + track.full_title;

			if (this.data.current== track) {
				element.style.color = 'var(--visited)';
				element.id = "playlist-current";
				element.scrollIntoView({
					block: 'end',
					inline: 'end',
					behavior: 'smooth',
				});
			}

			this.shadow.appendChild(element);
		}
	}
}

class CurrentTrack extends HTMLElement {
	constructor() {
		super();

		this.shadow = this; //.attachShadow({mode: 'open'});

		this.data = mpd_data;
		this.data.streamer.add_handler(this.render.bind(this))

		this.render();
	}

	async render(_e) {
		if (!this.data.current) {
			await this.data.update();
		}

		this.shadow.innerHTML = this.data.current.format;
	}
}

customElements.define('live-playlist', Playlist);
customElements.define('current-track', CurrentTrack);
