const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

class Playlist extends HTMLElement {
	constructor() {
		super();

		this.shadow = this.attachShadow({mode: 'open'});

		this.tracks = [];
		this.current = null;

		this.update_tracks().then();
		this.update_current().then();
		this.render();

		this.update_loop();
	}

	render() {
		this.shadow.innerHTML = '';

		for (let track of this.tracks) {
			let element = document.createElement("p");
			element.innerHTML = track.index + ". " + track.full_title;

			if (this.current == track) {
				element.style.color = 'var(--visited)';
				element.scrollIntoView();
			}

			this.shadow.appendChild(element);
		}
	}

	async update() {
		await this.update_tracks();
		await this.update_current();
		this.render();
	}

	update_loop() {
		this.update();

		this.sse = new EventSource("https://radio.ischa.dev/status");

		this.sse.onmessage = async (e) => {
			if (e.data == "playlist") {
				await this.update_tracks();
			}

			await this.update_current();
			this.render()
		}
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

class Track {
	constructor(str) {
		this.index = str.split(':')[0];

		let [_, ...title] = str.split(' ');
		this.full_title =  title.join(' ');
	}
}

customElements.define('live-playlist', Playlist);
