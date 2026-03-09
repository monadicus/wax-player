# wax-player

Single-station embedded player for `wax.live`.

This project builds a small iframe-friendly player that:

- loads one configured WaxLive station
- displays whether the station is on air
- plays that station's live stream
- shows the current recognition / now playing metadata
- refreshes status and track metadata automatically

The player is configured for a single station through `VITE_STATION_NAME`.
For local testing, `?station=` can override that value.

## Requirements

- Node.js 25+
- npm 11+

## Development

```bash
nvm use
npm install
npm run dev
```

The dev server starts on `http://localhost:5173`.

Create a `.env.local` file to point the app at a station:

```bash
VITE_STATION_NAME=my-station
```

Optional environment variables:

```bash
VITE_API_URL=https://api.wax.live
VITE_STREAM_URL=https://wax.live
```

## Copy-Paste Embed

Recommended: one script tag.

`embed.js` is standalone. It does not require the React app, `index.html`, or any files in `dist/assets/`.
It uses the bundled `wax-proxy.php` file automatically when the Wax API does not allow your site origin.
It renders an inline player on the host page and plays audio with a real `<audio>` element in that page.

If your deployment is already locked to one station with `VITE_STATION_NAME`, this is enough:

```html
<script async src="https://your-player-host.example/embed.js"></script>
```

If you want the embed snippet itself to pick the station, use `data-station`:

```html
<script
  async
  src="https://your-player-host.example/embed.js"
  data-station="my-station"
></script>
```

Optional script attributes:

- `data-station="my-station"`: sets the WaxLive station
- `data-width="420"`: iframe width, defaults to `420`
- `data-height="160"`: iframe height, defaults to `160`
- `data-autoplay="1"`: attempts autoplay
- `data-muted="1"`: starts muted
- `data-title="WaxLive player"`: iframe title text

Autoplay is browser-dependent. If you need autoplay, `data-muted="1"` is the safest option.

## Raw Iframe

This is only a fallback. The primary supported embed is the script version above.

```html
<iframe
  src="https://your-player-host.example/?station=my-station"
  title="WaxLive player"
  width="420"
  height="160"
  loading="lazy"
  allow="autoplay"
  style="border:0"
></iframe>
```

If the deployment is preconfigured to a single station with `VITE_STATION_NAME`, the station query parameter can be omitted:

```html
<iframe
  src="https://your-player-host.example/"
  title="WaxLive player"
  width="420"
  height="160"
  loading="lazy"
  allow="autoplay"
  style="border:0"
></iframe>
```

Optional query params:

- `station`: overrides `VITE_STATION_NAME`
- `autoplay=1`: attempts playback on load
- `muted=1`: starts muted

## What The Player Does

The embed only does three things:

- shows the station name
- shows `Live` or `Off air`
- if the station is live, lets the listener start the stream and see the current track

## Deployment Notes

For the script embed, publish these files together:

- `dist/embed.js`
- `dist/wax-proxy.php`

For the standalone player page or raw iframe embed, deploy the entire `dist/` directory, including `dist/wax-proxy.php`.

If you deploy the player under a subdirectory such as `/wax-player/`, the script embed URL must be reachable at `/wax-player/embed.js`.

## Verification

```bash
nvm use
npm test
npm run build
```
