import { compile } from './packages/compiler/src/index.js';

console.log("=== Testing compile function ===");
console.log("\n1. Simple div: <div>hello</div>");
const result1 = compile("<div>hello</div>", { rendererMode: "signal" });
console.log(result1.code);

console.log("\n2. With interpolation: <div>{{ msg }}</div>");
const result2 = compile("<div>{{ msg }}</div>", { rendererMode: "signal" });
console.log(result2.code);
