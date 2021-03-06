import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default {
  input: "./src/index.ts",
  output: [
    { file: "./dist/index.cjs.js", format: "cjs" },
    { file: "./dist/index.es6.js", format: "es" },
  ],
  plugins: [
    typescript({ tsconfig: "./tsconfig.prod.json" }),
    resolve({ preferBuiltins: false }),
    commonjs({ extensions: [".js", ".ts"] }),
    json(),
    // excludeDependenciesFromBundle({
    //   peerDependencies: true,
    //   dependencies: true,
    // }),
  ],
  external: [
    "fs",
    "tty",
    "util",
    "os",
    "path",
    "http",
    "https",
    "tls",
    "net",
    "events",
    "assert",
    "stream",
    "url",
    "zlib",
    "buffer",
  ],
};
