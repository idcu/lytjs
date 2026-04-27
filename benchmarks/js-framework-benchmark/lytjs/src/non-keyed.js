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

// benchmarks/js-framework-benchmark/lytjs/src/non-keyed.ts
var non_keyed_exports = {};
__export(non_keyed_exports, {
  addRow: () => addRow,
  createElement: () => createElement,
  getData: () => getData,
  getSelected: () => getSelected,
  removeRow: () => removeRow,
  runBenchmark: () => runBenchmark,
  selectRow: () => selectRow,
  swapRows: () => swapRows,
  updateEvery10thRow: () => updateEvery10thRow
});
module.exports = __toCommonJS(non_keyed_exports);

// packages/common/src/is.ts
function isStringOrNumber(val) {
  return typeof val === "string" || typeof val === "number";
}
function isArray(val) {
  return Array.isArray(val);
}
function isVNode(val) {
  return val !== null && typeof val === "object" && val.type !== void 0 && val.shapeFlag !== void 0;
}

// packages/vdom/src/fragment.ts
var Fragment = /* @__PURE__ */ Symbol("Fragment");

// packages/core/src/h.ts
function normalizeChildren(vnode, children) {
  if (children === null || children === void 0) {
    return;
  }
  if (isStringOrNumber(children)) {
    vnode.children = String(children);
    vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
  } else if (isArray(children)) {
    const normalized = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child === null || child === void 0 || typeof child === "boolean") {
        continue;
      }
      if (isArray(child)) {
        for (let j = 0; j < child.length; j++) {
          const c = child[j];
          if (c !== null && c !== void 0 && typeof c !== "boolean") {
            normalized.push(isVNode(c) ? c : createVNode(String(c)));
          }
        }
      } else if (isVNode(child)) {
        normalized.push(child);
      } else {
        normalized.push(createVNode(String(child)));
      }
    }
    vnode.children = normalized;
    vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
  } else if (typeof children === "object") {
    vnode.children = children;
    vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
  }
}
function createVNode(type, props = null, children = null) {
  let shapeFlag = 0;
  if (typeof type === "string") {
    shapeFlag = 1 /* ELEMENT */;
  } else if (type === Fragment) {
    shapeFlag = 0;
  } else if (typeof type === "function") {
    shapeFlag = 2 /* FUNCTIONAL_COMPONENT */;
  } else if (typeof type === "object" && type !== null) {
    if (type.setup || type.__vccOpts || type.render) {
      shapeFlag = 4 /* STATEFUL_COMPONENT */;
    }
  }
  const key = props?.key ?? null;
  const ref = props?.ref ?? null;
  let cleanProps = props;
  if (props) {
    const { key: _k, ref: _r, ...rest } = props;
    cleanProps = rest;
  }
  const vnode = {
    type,
    props: cleanProps,
    children: null,
    key,
    ref,
    shapeFlag,
    el: null,
    component: null
  };
  if (children !== null && children !== void 0) {
    normalizeChildren(vnode, children);
  }
  return vnode;
}
function h(type, props, children) {
  return createVNode(type, props || null, children || null);
}

// benchmarks/js-framework-benchmark/lytjs/src/shared.ts
var ID = 0;
function resetId() {
  ID = 0;
}
var _seed = 1;
function _setSeed(seed) {
  _seed = seed;
}
function buildData(count) {
  _setSeed(0);
  const data2 = [];
  for (let i = 0; i < count; i++) {
    const id = i + 1;
    data2.push({
      id,
      label: `Row ${id}`
    });
  }
  if (count > ID) {
    ID = count;
  }
  return data2;
}
function getNextId(data2) {
  let max = 0;
  for (let i = 0; i < data2.length; i++) {
    if (data2[i].id > max) max = data2[i].id;
  }
  return max + 1;
}

// benchmarks/js-framework-benchmark/lytjs/src/non-keyed.ts
function createDOMElement(vnode) {
  if (typeof vnode.type === "string") {
    const el = document.createElement(vnode.type);
    applyProps(el, vnode.props);
    if (typeof vnode.children === "string") {
      el.appendChild(document.createTextNode(vnode.children));
    } else if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        const childEl = createDOMElement(child);
        child.el = childEl;
        el.appendChild(childEl);
      }
    }
    return el;
  }
  return null;
}
function applyProps(el, props) {
  if (!props) return;
  for (const key of Object.keys(props)) {
    const val = props[key];
    if (key === "className") {
      el.className = val;
    } else if (key === "style" && typeof val === "object") {
      for (const s in val) {
        el.style[s] = val[s];
      }
    } else if (key.startsWith("on") && typeof val === "function") {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, val);
    } else if (key === "href" || key === "id") {
      el.setAttribute(key, val);
    } else {
      el.setAttribute(key, val);
    }
  }
}
function mountVNode(vnode, container2) {
  const el = createDOMElement(vnode);
  vnode.el = el;
  container2.appendChild(el);
}
function unmountVNode(container2) {
  if (container2.innerHTML !== void 0) {
    container2.innerHTML = "";
  } else if (container2.childNodes) {
    container2.childNodes.length = 0;
  }
}
var data = [];
var selected = null;
var container = null;
function renderTable() {
  const rows = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const isSelected = selected === item.id;
    rows.push(
      h("tr", null, [
        h("td", { className: "id-col" }, String(item.id)),
        h("td", { className: "label-col" }, [
          h("a", { href: "#" }, item.label)
        ]),
        h("td", {
          className: isSelected ? "danger" : ""
        }, [
          h("a", {
            href: "#",
            onClick: (e) => {
              e.preventDefault();
              selected = item.id;
              rerender();
            }
          }, "Select")
        ])
      ])
    );
  }
  return h("table", { className: "table table-striped table-bordered" }, [
    h("thead", null, [
      h("tr", null, [
        h("th", null, "id"),
        h("th", null, "label"),
        h("th", null, "")
      ])
    ]),
    h("tbody", null, rows)
  ]);
}
function rerender() {
  if (!container) return;
  unmountVNode(container);
  const vnode = renderTable();
  mountVNode(vnode, container);
}
function createElement(id) {
  container = document.getElementById(id);
  data = [];
  selected = null;
  resetId();
  return {
    container,
    destroy: () => {
      unmountVNode(container);
      data = [];
      selected = null;
      container = null;
    }
  };
}
function runBenchmark() {
  data = buildData(1e3);
  selected = null;
  rerender();
}
function addRow() {
  const nextId = getNextId(data);
  data.push({ id: nextId, label: `Row ${nextId}` });
  rerender();
}
function updateEvery10thRow() {
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 10 === 0) {
      data[i].label += " !!!";
    }
  }
  rerender();
}
function swapRows() {
  if (data.length < 2) return;
  const temp = data[0];
  data[0] = data[1];
  data[1] = temp;
  rerender();
}
function removeRow() {
  if (data.length === 0) return;
  data.pop();
  rerender();
}
function selectRow(index) {
  if (index < 0 || index >= data.length) return;
  selected = data[index].id;
  rerender();
}
function getData() {
  return data;
}
function getSelected() {
  return selected;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addRow,
  createElement,
  getData,
  getSelected,
  removeRow,
  runBenchmark,
  selectRow,
  swapRows,
  updateEvery10thRow
});
