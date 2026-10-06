import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const base = root + specifier.slice(2)
      const file = [".ts", ".tsx"].map((ext) => base + ext).find(existsSync)
      if (file) return next(pathToFileURL(file).href, context)
    }
    return next(specifier, context)
  },
})
