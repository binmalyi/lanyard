# Lanyard-TS

A purely native TypeScript library for [Discord Lanyard API](https://github.com/Phineas/lanyard)

## Example

Importing TS File (works only if <span style="color:#7DF9FF;">_"allowImportingTsExtensions"_</span> is enabled in tsconfig)
```ts
import { Lanyard } from "index.mts";
```

Importing JS File
```js
import { Lanyard } from "index.mjs";
```

By default, it reads user id from ___process.env["<span style="color:#b2ec5d">LANYARDID</span>"]___.

- **REST**
  ```ts
  Lanyard.Fetch(string) // Presence of single -> Promise<Presence>
  ```

- **WebSocket**
  ```ts
    const
        lanyard = new Lanyard(string) // Presence of single user -> (Presence|null)
        lanyard = new Lanyard(Array<string>) // Presence of multiple passed users -> (Array<Presence>|null)
        lanyard = new Lanyard(true) // Presence of all Lanyard discord server members -> (Array<Presence>|null)
  ```