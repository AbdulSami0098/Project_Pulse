// Mirrors Vite's env-loading behavior on the backend.
//
//   `.env.{NODE_ENV}`        (committed defaults for this mode)
//   `.env.{NODE_ENV}.local`  (gitignored — your secrets + overrides)
//
// `.local` files override the committed ones. We do NOT load a bare `.env`
// fallback — each mode is fully described by its two files. Importing this
// module from `index.ts` BEFORE anything else ensures `process.env` is
// populated before any module reads it.

import { config } from 'dotenv';
import path from 'path';

const mode = process.env.NODE_ENV || 'development';

// Order matters: dotenv does not override existing keys, so load the
// higher-priority file (.local) first.
config({ path: path.resolve(process.cwd(), `.env.${mode}.local`) });
config({ path: path.resolve(process.cwd(), `.env.${mode}`) });

console.log(`Loaded env for NODE_ENV=${mode}`);
