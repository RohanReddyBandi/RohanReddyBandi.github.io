/** True when public/resume.pdf exists at build time (see vite.config.ts) */
declare const __HAS_RESUME__: boolean

/** Commit count and build time, baked in at build (see vite.config.ts) */
declare const __BUILD__: { commits: number; date: string }
