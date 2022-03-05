# ischa-radio
Configuration to set up my personal audio live streaming webpage.
At its core, this setup attempts to be as strictly UNIXy as possible,
making heavy use of text streams, pipes, sockets as files, etc.

## Requirements
- MPD (to stream music and manage a library)
- MPC (to read status information from MPD)
- ssimoe (to pipe output of MPC into a UDS)
- Nginx, or some other HTTP server (for TLS and public accessiblity, optional)
