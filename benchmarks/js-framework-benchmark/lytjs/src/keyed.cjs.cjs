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

// benchmarks/js-framework-benchmark/lytjs/src/keyed.ts
var keyed_exports = {};
__export(keyed_exports, {
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
module.exports = __toCommonJS(keyed_exports);

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

// benchmarks/js-framework-benchmark/lytjs/src/keyed.ts
function mountVNode(vnode, container2) {
  const el = createDOMElement(vnode);
  vnode.el = el;
  container2.appendChild(el);
}
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
function keyedPatch(container2, oldVNode, newVNode) {
  const newTbody = findTbody(newVNode);
  const oldTbody = oldVNode ? findTbody(oldVNode) : null;
  if (!newTbody) return;
  if (!oldVNode || !oldTbody) {
    container2.innerHTML = "";
    mountVNode(newVNode, container2);
    return;
  }
  const newRows = newTbody.children;
  const oldRows = oldTbody.children;
  const oldKeyMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < oldRows.length; i++) {
    const row = oldRows[i];
    if (row.key !== null && row.key !== void 0) {
      oldKeyMap.set(row.key, row);
    }
  }
  const newKeyMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i];
    if (row.key !== null && row.key !== void 0) {
      newKeyMap.set(row.key, row);
    }
  }
  const tbodyEl = oldTbody.el;
  for (const [key, oldRow] of oldKeyMap) {
    if (!newKeyMap.has(key)) {
      if (oldRow.el && oldRow.el.parentNode) {
        oldRow.el.parentNode.removeChild(oldRow.el);
      }
    }
  }
  for (let i = 0; i < newRows.length; i++) {
    const newRow = newRows[i];
    const rowKey = newRow.key;
    const oldRow = oldKeyMap.get(rowKey);
    if (oldRow) {
      patchRowVNode(oldRow, newRow);
      const nextRef = i < newRows.length - 1 ? oldKeyMap.get(newRows[i + 1].key)?.el ?? null : null;
      if (nextRef !== null) {
        if (oldRow.el.nextSibling !== nextRef) {
          if (oldRow.el.parentNode) {
            oldRow.el.parentNode.removeChild(oldRow.el);
          }
          tbodyEl.insertBefore(oldRow.el, nextRef);
        }
      } else {
        if (oldRow.el.nextSibling !== null) {
          if (oldRow.el.parentNode) {
            oldRow.el.parentNode.removeChild(oldRow.el);
          }
          tbodyEl.appendChild(oldRow.el);
        }
      }
    } else {
      const trEl = createDOMElement(newRow);
      newRow.el = trEl;
      let nextRef = null;
      for (let j = i + 1; j < newRows.length; j++) {
        const refRow = oldKeyMap.get(newRows[j].key);
        if (refRow && refRow.el) {
          nextRef = refRow.el;
          break;
        }
      }
      if (nextRef) {
        tbodyEl.insertBefore(trEl, nextRef);
      } else {
        tbodyEl.appendChild(trEl);
      }
    }
  }
}
function patchRowVNode(oldRow, newRow) {
  const oldTds = oldRow.children;
  const newTds = newRow.children;
  newRow.el = oldRow.el;
  for (let i = 0; i < newTds.length; i++) {
    if (i < oldTds.length) {
      patchElement(oldTds[i], newTds[i]);
    }
  }
}
function patchElement(oldVNode, newVNode) {
  if (!oldVNode.el) return;
  newVNode.el = oldVNode.el;
  const oldProps = oldVNode.props || {};
  const newProps = newVNode.props || {};
  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      if (key === "className") {
        oldVNode.el.className = newProps[key];
      } else if (key === "href") {
        oldVNode.el.setAttribute(key, newProps[key]);
      }
    }
  }
  if (typeof newVNode.children === "string") {
    if (typeof oldVNode.children === "string" && oldVNode.children !== newVNode.children) {
      const textNode = oldVNode.el.childNodes[0];
      if (textNode) {
        textNode.textContent = newVNode.children;
      } else {
        oldVNode.el.appendChild(document.createTextNode(newVNode.children));
      }
    } else if (Array.isArray(oldVNode.children)) {
      oldVNode.el.innerHTML = "";
      oldVNode.el.appendChild(document.createTextNode(newVNode.children));
    }
  } else if (Array.isArray(newVNode.children)) {
    if (typeof oldVNode.children === "string") {
      oldVNode.el.innerHTML = "";
      for (const child of newVNode.children) {
        const childEl = createDOMElement(child);
        child.el = childEl;
        oldVNode.el.appendChild(childEl);
      }
    } else if (Array.isArray(oldVNode.children)) {
      for (let i = 0; i < newVNode.children.length; i++) {
        if (i < oldVNode.children.length) {
          patchElement(oldVNode.children[i], newVNode.children[i]);
        } else {
          const childEl = createDOMElement(newVNode.children[i]);
          newVNode.children[i].el = childEl;
          oldVNode.el.appendChild(childEl);
        }
      }
    }
  }
}
function findTbody(vnode) {
  if (vnode.type === "tbody") return vnode;
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      const found = findTbody(child);
      if (found) return found;
    }
  }
  return null;
}
var data = [];
var selected = null;
var container = null;
var lastVNode = null;
function renderTable() {
  const rows = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const isSelected = selected === item.id;
    rows.push(
      h("tr", { key: item.id }, [
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
              patchSelected();
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
function patchSelected() {
  if (!container || !lastVNode) return;
  const tbody = findTbody(lastVNode);
  if (!tbody || !tbody.el) return;
  const rows = tbody.children;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.el) continue;
    const tds = row.children;
    if (tds.length >= 3) {
      const selectTd = tds[2];
      const rowId = row.key;
      const newClass = selected === rowId ? "danger" : "";
      if (selectTd.el && selectTd.el.className !== newClass) {
        selectTd.el.className = newClass;
      }
    }
  }
}
function createElement(id) {
  container = document.getElementById(id);
  data = [];
  selected = null;
  lastVNode = null;
  resetId();
  return {
    container,
    destroy: () => {
      if (container) {
        container.innerHTML = "";
      }
      data = [];
      selected = null;
      lastVNode = null;
      container = null;
    }
  };
}
function runBenchmark() {
  data = buildData(1e3);
  selected = null;
  const newVNode = renderTable();
  keyedPatch(container, lastVNode, newVNode);
  lastVNode = newVNode;
}
function addRow() {
  const nextId = getNextId(data);
  data.push({ id: nextId, label: `Row ${nextId}` });
  const newVNode = renderTable();
  keyedPatch(container, lastVNode, newVNode);
  lastVNode = newVNode;
}
function updateEvery10thRow() {
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 10 === 0) {
      data[i].label += " !!!";
    }
  }
  const newVNode = renderTable();
  keyedPatch(container, lastVNode, newVNode);
  lastVNode = newVNode;
}
function swapRows() {
  if (data.length < 2) return;
  const temp = data[0];
  data[0] = data[1];
  data[1] = temp;
  const newVNode = renderTable();
  keyedPatch(container, lastVNode, newVNode);
  lastVNode = newVNode;
}
function removeRow() {
  if (data.length === 0) return;
  data.pop();
  const newVNode = renderTable();
  keyedPatch(container, lastVNode, newVNode);
  lastVNode = newVNode;
}
function selectRow(index) {
  if (index < 0 || index >= data.length) return;
  selected = data[index].id;
  patchSelected();
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
