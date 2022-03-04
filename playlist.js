function getTrackIndex(str) {
  return str.split(":")[0];
}

function HighlightElement(element) {
  element.style.color = "var(--visited)";
  element.id = "playlist-current";
}

function getTrackTitle(str) {
  return str.split(" ").slice(1).join(" ");
}

function viewElement(element) {
  element.scrollIntoView({
    block: "end",
    inline: "end",
    behavior: "smooth",
  });
}

function formatTrack(track) {
  return `${track.index}. ${track.full_title}`;
}

class Track {
  constructor(str) {
    this.index = getTrackIndex(str);
    this.full_title = getTrackTitle(str);
  }

  get format() {
    return formatTrack(this);
  }
}

class UpdateStreamer {
  constructor() {
    this.sse = new EventSource("https://radio.ischa.dev/status");
    this.event_handlers = [];
    this.sse.onmessage = async (e) => {
      for (let handler of this.event_handlers) {
        await handler(e);
      }
    };
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
    if (e === null || e.data === "playlist") await this.update_tracks();

    await this.update_current();
  }

  async update_tracks() {
    const tracks = await fetch("https://radio.ischa.dev/status/playlist").then(
      (c) => c.text()
    );

    this.tracks = tracks
      .trim()
      .split("\n")
      .map((str) => new Track(str));
  }

  async update_current() {
    const current = await fetch("https://radio.ischa.dev/status/current").then(
      (c) => c.text()
    );

    this.current = this.tracks[getTrackIndex(current) - 1];
  }
}

const mpd_data = new MpdData();

class Playlist extends HTMLElement {
  constructor() {
    super();

    this.shadow = this; //.attachShadow({mode: 'open'});

    this.data = mpd_data;
    this.data.streamer.add_handler(this.render.bind(this));

    this.render();
  }

  async render(_e) {
    if (!this.data.current) await this.data.update();

    // clean up the shadow dom
    this.shadow.innerHTML = "";

    // this will be used to identify the current track's element
    let currentElement;

    // add the tracks to the shadow dom
    this.shadow.append(
      ...this.data.tracks.map((track) => {
        const element = document.createElement("p");
        element.innerHTML = formatTrack(track);

        // if the track is the current track, highlight it
        if (track == this.data.current)
          HighlightElement((currentElement = element));

        return element;
      })
    );

    if (currentElement) viewElement(currentElement);
  }
}

class CurrentTrack extends HTMLElement {
  constructor() {
    super();

    this.shadow = this; //.attachShadow({mode: 'open'});

    this.data = mpd_data;
    this.data.streamer.add_handler(this.render.bind(this));

    this.render();
  }

  async render(_e) {
    if (!this.data.current) await this.data.update();

    this.shadow.innerHTML = this.data.current.format;
  }
}

customElements.define("live-playlist", Playlist);
customElements.define("current-track", CurrentTrack);
