"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// benchmarks/js-framework-benchmark/lytjs/src/shared.ts
var shared_exports = {};
__export(shared_exports, {
  buildData: () => buildData,
  getNextId: () => getNextId,
  randomLabel: () => randomLabel,
  resetId: () => resetId
});
module.exports = __toCommonJS(shared_exports);
var ID = 0;
function resetId() {
  ID = 0;
}
var _seed = 1;
function _random() {
  _seed = _seed * 16807 % 2147483647;
  return (_seed - 1) / 2147483646;
}
function _setSeed(seed) {
  _seed = seed;
}
var ADJECTIVES = [
  "pretty",
  "large",
  "big",
  "small",
  "tall",
  "short",
  "long",
  "handsome",
  "plain",
  "quaint",
  "clean",
  "elegant",
  "easy",
  "angry",
  "crazy",
  "helpful",
  "mushy",
  "odd",
  "unsightly",
  "adorable",
  "important",
  "inexpensive",
  "cheap",
  "expensive",
  "fancy"
];
var COLORS = [
  "red",
  "yellow",
  "blue",
  "green",
  "pink",
  "brown",
  "purple",
  "brown",
  "white",
  "black",
  "orange"
];
var NOUNS = [
  "table",
  "chair",
  "house",
  "bbq",
  "desk",
  "car",
  "pony",
  "cookie",
  "sandwich",
  "burger",
  "pizza",
  "mouse",
  "keyboard"
];
function buildData(count) {
  _setSeed(0);
  const data = [];
  for (let i = 0; i < count; i++) {
    const id = i + 1;
    data.push({
      id,
      label: `Row ${id}`
    });
  }
  if (count > ID) {
    ID = count;
  }
  return data;
}
function getNextId(data) {
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].id > max) max = data[i].id;
  }
  return max + 1;
}
function randomLabel() {
  const adj = ADJECTIVES[Math.floor(_random() * ADJECTIVES.length)];
  const color = COLORS[Math.floor(_random() * COLORS.length)];
  const noun = NOUNS[Math.floor(_random() * NOUNS.length)];
  return `${adj} ${color} ${noun}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildData,
  getNextId,
  randomLabel,
  resetId
});
