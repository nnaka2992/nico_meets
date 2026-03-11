# Nico Meets

Google Meet chat bridge for [nico_monitor](https://github.com/nnaka2992/nico_monitor) — forwards chat messages as Niconico-style scrolling comments.

## Console Script

1. Start `nico_monitor` (default `localhost:29292`)
2. Join a Google Meet call and open the chat panel
3. Open DevTools (F12) → Console
4. Paste the contents of `dist/nico_meets.js` and press Enter

New chat messages will appear as scrolling comments on the nico_monitor overlay.

### Configuration

Edit the variables at the top of `src/console.ts` and rebuild with `pnpm build`:

```js
const NICO_MEETS_HOST = "localhost";
const NICO_MEETS_PORT = 29292;
```

### Stop

```js
__nicoMeets.stop()
```

## Development

Requires [Nix](https://nixos.org/) with flakes enabled.

```sh
nix develop
pnpm install
pnpm test        # run tests
pnpm build       # bundle → dist/nico_meets.js
pnpm typecheck   # type check without emitting
```
