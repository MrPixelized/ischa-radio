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
		if (e === null || e.data == 'playlist') {
			await this.update_tracks();
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

	highlight_current() {
		let current = this.shadow.children[this.data.current.index - 1];
		current.style.color = 'var(--visited)';
		current.id = "playlist-current";
	}

	scroll_to_current() {
		let current = this.shadow.children[this.data.current.index - 1];
		current.scrollIntoView({
			block: 'center',
			inline: 'nearest',
			behavior: 'smooth',
		});
	}

	async render(_e) {
		if (!this.data.current) {
			await this.data.update();
		}

		let elements = this.data.tracks.map(function (track) {
			let element = document.createElement('p');
			element.innerHTML = track.index + '. ' + track.full_title;

			return element;
		});

		this.shadow.replaceChildren(...elements);

		this.highlight_current();
		this.scroll_to_current();
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
