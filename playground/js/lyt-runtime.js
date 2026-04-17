/**
 * Lyt.js Runtime Bundle - 浏览器内联版本
 *
 * 本文件是 Lyt.js 核心运行时的自包含浏览器 bundle，
 * 包含所有核心 API：createApp, h, reactive, ref, computed, watch, watchEffect, effect, Fragment 等。
 *
 * 纯原生零依赖实现，可直接在浏览器中运行。
 *
 * 构建说明：
 * 生产环境可使用 esbuild 打包：
 *   npx esbuild packages/core/src/index.ts packages/reactivity/src/index.ts \
 *     --bundle --format=iife --global-name=Lyt --outfile=playground/js/lyt-runtime.js
 */

;(function (global) {
  'use strict';

  // ============================================================
  // 调度器 (Scheduler)
  // ============================================================

  const queue = new Set();
  const pendingPostFlushCbs = [];
  let isFlushing = false;
  let isFlushPending = false;
  let currentFlushPromise = null;
  let flushIndex = 0;

  function queueJob(job) {
    if (!queue.has(job)) {
      queue.add(job);
      if (!isFlushPending) {
        isFlushPending = true;
        currentFlushPromise = Promise.resolve().then(flushJobs);
      }
    }
  }

  function queuePostFlushCb(cb) {
    if (!pendingPostFlushCbs.includes(cb)) {
      pendingPostFlushCbs.push(cb);
      if (!isFlushPending) {
        isFlushPending = true;
        currentFlushPromise = Promise.resolve().then(flushJobs);
      }
    }
  }

  function flushJobs() {
    isFlushPending = false;
    isFlushing = true;
    const sortedQueue = [...queue].sort((a, b) => {
      const aId = a.id;
      const bId = b.id;
      if (aId != null && bId != null) return aId - bId;
      if (aId != null) return -1;
      if (bId != null) return 1;
      return 0;
    });
    queue.clear();
    flushIndex = 0;
    for (flushIndex = 0; flushIndex < sortedQueue.length; flushIndex++) {
      sortedQueue[flushIndex]();
    }
    flushIndex = 0;
    flushPostFlushCbs();
    isFlushing = false;
    currentFlushPromise = null;
  }

  function flushPostFlushCbs() {
    if (pendingPostFlushCbs.length === 0) return;
    const copiedCbs = [...pendingPostFlushCbs];
    pendingPostFlushCbs.length = 0;
    for (let i = 0; i < copiedCbs.length; i++) {
      copiedCbs[i]();
    }
  }

  function nextTick() {
    const p = currentFlushPromise || Promise.resolve();
    return p.then(() => {});
  }

  // ============================================================
  // 副作用系统 (Effect)
  // ============================================================

  let activeEffect = null;
  const effectStack = [];
  let effectIdCounter = 0;
  const targetMap = new WeakMap();

  let shouldTrack = true;
  const trackStack = [];

  function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
  }

  function resetTracking() {
    const last = trackStack.pop();
    shouldTrack = last === undefined ? true : last;
  }

  class ReactiveEffect {
    constructor(fn, options) {
      this.fn = fn;
      this.scheduler = options && options.scheduler;
      this.beforeRun = options && options.beforeRun;
      this.afterRun = options && options.afterRun;
      this.lazy = options && options.lazy;
      this.allowRecurse = options && options.allowRecurse;
      this.id = effectIdCounter++;
      this.active = true;
      this.deps = new Set();
      this.onStop = null;
    }

    run() {
      if (!this.active) return this.fn();
      if (effectStack.includes(this)) return this.fn();
      try {
        this.beforeRun && this.beforeRun();
        effectStack.push(this);
        activeEffect = this;
        cleanupEffect(this);
        return this.fn();
      } finally {
        this.afterRun && this.afterRun();
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1] || null;
      }
    }

    stop() {
      if (this.active) {
        cleanupEffect(this);
        if (this.onStop) this.onStop();
        this.active = false;
      }
    }
  }

  function cleanupEffect(effect) {
    const deps = effect.deps;
    for (const dep of deps) {
      dep.delete(effect);
    }
    deps.clear();
  }

  function track(target, key) {
    if (!shouldTrack || !activeEffect) return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      depsMap = new Map();
      targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
      dep = new Set();
      depsMap.set(key, dep);
    }
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      activeEffect.deps.add(dep);
    }
  }

  const ITERATE_KEY = Symbol('iterate');

  function trigger(target, key, type, newValue) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;
    const effectsToRun = new Set();

    function addEffects(dep) {
      if (!dep) return;
      for (const eff of dep) {
        if (eff !== activeEffect || eff.allowRecurse) {
          effectsToRun.add(eff);
        }
      }
    }

    addEffects(depsMap.get(key));
    if (type === 'add' || type === 'delete') {
      addEffects(depsMap.get(ITERATE_KEY));
    }
    if (type === 'set' && Array.isArray(target)) {
      const length = depsMap.get('length');
      if (length && typeof key === 'number' && key < target.length) {
        addEffects(length);
      }
    }

    for (const eff of effectsToRun) {
      if (eff.scheduler) {
        eff.scheduler(eff);
      } else {
        eff.run();
      }
    }
  }

  function effect(fn, options) {
    const _effect = new ReactiveEffect(fn, options);
    if (!options || !options.lazy) {
      _effect.run();
    }
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    runner.stop = function () { _effect.stop(); };
    return runner;
  }

  function stop(runner) {
    if (runner && runner.effect) runner.effect.stop();
  }

  // ============================================================
  // 响应式代理 (Reactive)
  // ============================================================

  const proxyMap = new WeakMap();
  const readonlyMap = new WeakMap();
  const shallowReactiveMap = new WeakMap();
  const readonlyFlag = Symbol('readonly');
  const rawSymbol = Symbol('raw');
  const reactiveFlag = Symbol('reactive');
  const skipFlag = Symbol('skip');

  function isObject(val) {
    return val !== null && typeof val === 'object';
  }

  function hasChanged(value, oldValue) {
    return !Object.is(value, oldValue);
  }

  function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
  }

  function isIntegerKey(key) {
    return typeof key === 'string' && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;
  }

  // 数组方法拦截
  const arrayInstrumentations = {};

  ['includes', 'indexOf', 'lastIndexOf'].forEach(function (method) {
    arrayInstrumentations[method] = function () {
      const arr = toRaw(this);
      for (let i = 0; i < arr.length; i++) {
        track(arr, String(i));
      }
      track(arr, 'length');
      return arr[method].apply(arr, arguments);
    };
  });

  ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(function (method) {
    arrayInstrumentations[method] = function () {
      pauseTracking();
      const res = Array.prototype[method].apply(this, arguments);
      resetTracking();
      trigger(toRaw(this), 'length', 'set', toRaw(this).length);
      return res;
    };
  });

  const mutableHandlers = {
    get(target, key, receiver) {
      if (key === rawSymbol) return target;
      if (key === reactiveFlag) return true;
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return arrayInstrumentations[key];
      }
      track(target, key);
      const res = Reflect.get(target, key, receiver);
      if (key === readonlyFlag) return target[readonlyFlag] === true;
      if (!isObject(res)) return res;
      if (target[skipFlag]) return res;
      return reactive(res);
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const hadKey = Array.isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
      const result = Reflect.set(target, key, value, receiver);
      if (target === (receiver && receiver[rawSymbol]) || target === toRaw(receiver)) {
        if (hadKey) {
          if (hasChanged(value, oldValue)) trigger(target, key, 'set', value);
        } else {
          trigger(target, key, 'add', value);
        }
      }
      return result;
    },
    deleteProperty(target, key) {
      const hadKey = hasOwn(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) trigger(target, key, 'delete');
      return result;
    },
    has(target, key) {
      track(target, key);
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      track(target, ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
  };

  const readonlyHandlers = {
    get(target, key, receiver) {
      if (key === rawSymbol) return target;
      if (key === reactiveFlag) return true;
      if (key === readonlyFlag) return true;
      track(target, key);
      const res = Reflect.get(target, key, receiver);
      if (!isObject(res)) return res;
      return readonly(res);
    },
    set(target, key) {
      console.warn('Set operation on key "' + String(key) + '" failed: target is readonly.', target);
      return true;
    },
    deleteProperty(target, key) {
      console.warn('Delete operation on key "' + String(key) + '" failed: target is readonly.', target);
      return true;
    },
    has(target, key) {
      track(target, key);
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      track(target, ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
  };

  const shallowReactiveHandlers = {
    get(target, key, receiver) {
      if (key === rawSymbol) return target;
      if (key === reactiveFlag) return true;
      track(target, key);
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const hadKey = Array.isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
      const result = Reflect.set(target, key, value, receiver);
      if (target === (receiver && receiver[rawSymbol]) || target === toRaw(receiver)) {
        if (hadKey) {
          if (hasChanged(value, oldValue)) trigger(target, key, 'set', value);
        } else {
          trigger(target, key, 'add', value);
        }
      }
      return result;
    },
    deleteProperty(target, key) {
      const hadKey = hasOwn(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) trigger(target, key, 'delete');
      return result;
    },
    has(target, key) {
      track(target, key);
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      track(target, ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
  };

  function reactive(target, options) {
    if (!isObject(target)) return target;
    if (target[reactiveFlag]) return target;
    if (target[readonlyFlag]) return readonly(target);
    var existingProxy = proxyMap.get(target);
    if (existingProxy) return existingProxy;
    var proxy = new Proxy(target, mutableHandlers);
    proxyMap.set(target, proxy);
    return proxy;
  }

  function readonly(target) {
    if (!isObject(target)) return target;
    var existingProxy = readonlyMap.get(target);
    if (existingProxy) return existingProxy;
    target[readonlyFlag] = true;
    var proxy = new Proxy(target, readonlyHandlers);
    readonlyMap.set(target, proxy);
    return proxy;
  }

  function shallowReactive(target) {
    if (!isObject(target)) return target;
    var existingProxy = shallowReactiveMap.get(target);
    if (existingProxy) return existingProxy;
    var proxy = new Proxy(target, shallowReactiveHandlers);
    shallowReactiveMap.set(target, proxy);
    return proxy;
  }

  function toRaw(observed) {
    var raw = observed && observed[rawSymbol];
    return raw ? toRaw(raw) : observed;
  }

  function isReactive(value) {
    if (isReadonly(value)) return isReactive(value[rawSymbol]);
    return !!(value && value[reactiveFlag]);
  }

  function isReadonly(value) {
    return !!(value && value[readonlyFlag]);
  }

  function markReadOnly(obj) {
    obj[readonlyFlag] = true;
    return obj;
  }

  function markSkip(obj) {
    obj[skipFlag] = true;
    return obj;
  }

  // ============================================================
  // Ref
  // ============================================================

  const refSymbol = Symbol('ref');
  const shallowRefSymbol = Symbol('shallowRef');
  const refToRaw = new WeakMap();

  function isRef(value) {
    return !!(value && value.__v_isRef === true);
  }

  function ref(value) {
    if (isRef(value)) return value;
    var r = {
      _value: convert(value),
      _rawValue: value,
      __v_isRef: true,
    };
    r[refSymbol] = true;
    var proxy = new Proxy(r, refHandlers);
    refToRaw.set(proxy, r);
    return proxy;
  }

  function convert(value) {
    return isObject(value) ? reactive(value) : value;
  }

  var refHandlers = {
    get(target, key, receiver) {
      if (key === 'value') {
        track(target, 'value');
        return target._value;
      }
      if (key === refSymbol || key === '__v_isRef') return true;
      if (key === '_rawValue') return target._rawValue;
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      if (key === 'value') {
        var oldValue = target._rawValue;
        if (Object.is(oldValue, value)) return true;
        target._rawValue = value;
        target._value = convert(value);
        trigger(target, 'value', 'set', value);
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  };

  function shallowRef(value) {
    if (isRef(value)) return value;
    var r = {
      _value: value,
      _rawValue: value,
      __v_isRef: true,
      __v_isShallow: true,
    };
    r[refSymbol] = true;
    r[shallowRefSymbol] = true;
    var proxy = new Proxy(r, shallowRefHandlers);
    refToRaw.set(proxy, r);
    return proxy;
  }

  var shallowRefHandlers = {
    get(target, key, receiver) {
      if (key === 'value') {
        track(target, 'value');
        return target._value;
      }
      if (key === refSymbol || key === '__v_isRef' || key === '__v_isShallow') return true;
      if (key === '_rawValue') return target._rawValue;
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      if (key === 'value') {
        var oldValue = target._rawValue;
        if (Object.is(oldValue, value)) return true;
        target._rawValue = value;
        target._value = value;
        trigger(target, 'value', 'set', value);
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  };

  function unref(value) {
    return isRef(value) ? value.value : value;
  }

  function toRef(object, key) {
    var val = object[key];
    if (isRef(val)) return val;
    return new Proxy({ _obj: object, _key: key, __v_isRef: true }, {
      get(target, prop, receiver) {
        if (prop === 'value') return target._obj[target._key];
        if (prop === '__v_isRef') return true;
        return Reflect.get(target, prop, receiver);
      },
      set(target, prop, value, receiver) {
        if (prop === 'value') { target._obj[target._key] = value; return true; }
        return Reflect.set(target, prop, value, receiver);
      },
    });
  }

  function toRefs(object) {
    var result = {};
    for (var key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        result[key] = toRef(object, key);
      }
    }
    return result;
  }

  function triggerRef(refVal) {
    var raw = refToRaw.get(refVal) || refVal;
    trigger(raw, 'value', 'set', raw._rawValue);
  }

  // ============================================================
  // 计算属性 (Computed)
  // ============================================================

  function ComputedRefImpl(getter, setter) {
    this._value = undefined;
    this._dirty = true;
    this._setter = setter;
    this.__v_isRef = true;
    this.deps = new Set();

    var self = this;
    this._effect = new ReactiveEffect(getter, {
      scheduler: function () {
        if (!self._dirty) {
          self._dirty = true;
          self.triggerDep();
        }
      },
      lazy: true,
    });
  }

  Object.defineProperty(ComputedRefImpl.prototype, 'value', {
    get: function () {
      track(this, 'value');
      if (activeEffect && !this.deps.has(activeEffect)) {
        this.deps.add(activeEffect);
        activeEffect.deps.add(this.deps);
      }
      if (this._dirty) {
        this._value = this._effect.run();
        this._dirty = false;
      }
      return this._value;
    },
    set: function (newValue) {
      if (this._setter) {
        this._setter(newValue);
      } else {
        console.warn('Computed value is readonly.');
      }
    },
  });

  ComputedRefImpl.prototype.triggerDep = function () {
    for (var eff of this.deps) {
      if (eff.scheduler) {
        eff.scheduler(eff);
      } else {
        eff.run();
      }
    }
  };

  function computed(getterOrOptions) {
    var getter, setter;
    if (typeof getterOrOptions === 'function') {
      getter = getterOrOptions;
      setter = undefined;
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter);
  }

  // ============================================================
  // 侦听器 (Watch)
  // ============================================================

  function traverse(value, depth, seen) {
    if (!isObject(value) || (depth !== undefined && depth <= 0)) return value;
    if (!seen) seen = new Set();
    if (seen.has(value)) return value;
    seen.add(value);
    if (isRef(value)) {
      traverse(value.value, depth !== undefined ? depth - 1 : undefined, seen);
    } else if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        traverse(value[i], depth !== undefined ? depth - 1 : undefined, seen);
      }
    } else {
      var keys = Object.keys(value);
      for (var j = 0; j < keys.length; j++) {
        traverse(value[keys[j]], depth !== undefined ? depth - 1 : undefined, seen);
      }
    }
    return value;
  }

  function normalizeSource(source) {
    if (isRef(source)) return function () { return source.value; };
    if (isReactive(source)) return function () { return traverse(source); };
    if (typeof source === 'function') return source;
    return function () { return traverse(source); };
  }

  function watch(source, cb, options) {
    options = options || {};
    var getter, isMultiSource = false;

    if (Array.isArray(source)) {
      isMultiSource = true;
      var getters = source.map(function (s) { return normalizeSource(s); });
      getter = function () { return getters.map(function (g) { return g(); }); };
    } else {
      getter = normalizeSource(source);
    }

    if (isReactive(source) && options.deep !== false) {
      options.deep = true;
    }

    var oldValue = isMultiSource ? [] : undefined;
    var cleanupFn = undefined;
    var onCleanup = function (fn) { cleanupFn = fn; };

    var job = function () {
      if (cleanupFn) { cleanupFn(); cleanupFn = undefined; }
      var newValue = effect.run();
      if (
        isMultiSource
          ? newValue.some(function (v, i) { return !Object.is(v, oldValue[i]); })
          : !Object.is(newValue, oldValue) || (options.deep && isObject(newValue))
      ) {
        cb(
          isMultiSource ? newValue : newValue,
          isMultiSource ? [].concat(oldValue) : oldValue,
          onCleanup
        );
        oldValue = isMultiSource ? [].concat(newValue) : newValue;
      }
    };

    var effect = new ReactiveEffect(getter, {
      lazy: true,
      scheduler: function () {
        if (options.flush === 'sync') {
          job();
        } else {
          queueJob(job);
        }
      },
    });

    if (options.immediate) {
      job();
    } else {
      oldValue = effect.run();
    }

    return function () { effect.stop(); };
  }

  function watchEffect(fn, options) {
    options = options || {};
    var cleanupFn = undefined;

    var wrappedFn = function () {
      if (cleanupFn) { cleanupFn(); cleanupFn = undefined; }
      fn(function (cleanup) { cleanupFn = cleanup; });
    };

    var effect = new ReactiveEffect(wrappedFn, {
      scheduler: function () {
        if (options.flush === 'sync') {
          wrappedFn();
        } else {
          queueJob(wrappedFn);
        }
      },
    });

    effect.run();

    return function () {
      effect.stop();
      if (cleanupFn) { cleanupFn(); cleanupFn = undefined; }
    };
  }

  // ============================================================
  // 渲染函数 h() 和 VNode
  // ============================================================

  var ShapeFlags = {
    ELEMENT: 1,
    FUNCTIONAL_COMPONENT: 2,
    STATEFUL_COMPONENT: 4,
    TEXT_CHILDREN: 8,
    ARRAY_CHILDREN: 16,
    SLOTS_CHILDREN: 32,
  };

  var Fragment = Symbol('Fragment');

  function isStringOrNumber(val) {
    return typeof val === 'string' || typeof val === 'number';
  }

  function isVNode(val) {
    return (
      val !== null &&
      typeof val === 'object' &&
      val.type !== undefined &&
      val.shapeFlag !== undefined
    );
  }

  function normalizeChildren(vnode, children) {
    if (children == null) return;
    if (isStringOrNumber(children)) {
      vnode.children = String(children);
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    } else if (Array.isArray(children)) {
      var normalized = [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child == null || typeof child === 'boolean') continue;
        if (Array.isArray(child)) {
          for (var j = 0; j < child.length; j++) {
            var c = child[j];
            if (c != null && typeof c !== 'boolean') {
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
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else if (typeof children === 'object') {
      vnode.children = children;
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
    }
  }

  function createVNode(type, props, children) {
    var shapeFlag = 0;
    if (typeof type === 'string') {
      shapeFlag = ShapeFlags.ELEMENT;
    } else if (type === Fragment) {
      shapeFlag = 0;
    } else if (typeof type === 'function') {
      shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT;
    } else if (typeof type === 'object' && type !== null) {
      if (type.setup || type.__vccOpts || type.render) {
        shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
      }
    }

    var key = props && props.key != null ? props.key : null;
    var ref = props && props.ref != null ? props.ref : null;
    var cleanProps = props;
    if (props) {
      cleanProps = {};
      for (var k in props) {
        if (k !== 'key' && k !== 'ref') cleanProps[k] = props[k];
      }
    }

    var vnode = {
      type: type,
      props: cleanProps,
      children: null,
      key: key,
      ref: ref,
      shapeFlag: shapeFlag,
      el: null,
      component: null,
    };

    if (children != null) {
      normalizeChildren(vnode, children);
    }

    return vnode;
  }

  function h(type, props, children) {
    return createVNode(type, props || null, children != null ? children : null);
  }

  // ============================================================
  // DOM 渲染器
  // ============================================================

  function createMinimalDOMRenderer() {
    return {
      createElement: function (tag) { return document.createElement(tag); },
      createText: function (text) { return document.createTextNode(text); },
      createComment: function (text) { return document.createComment(text); },
      setAttribute: function (el, key, val) { el.setAttribute(key, String(val)); },
      removeAttribute: function (el, key) { el.removeAttribute(key); },
      setStyle: function (el, style) {
        if (typeof style === 'string') {
          el.style.cssText = style;
        } else if (style && typeof style === 'object') {
          for (var k in style) { el.style[k] = style[k]; }
        }
      },
      setClass: function (el, cls) {
        if (typeof cls === 'string') {
          el.className = cls;
        } else if (cls && typeof cls === 'object') {
          var classList = [];
          for (var k in cls) { if (cls[k]) classList.push(k); }
          el.className = classList.join(' ');
        } else {
          el.className = '';
        }
      },
      insert: function (parent, child, ref) {
        if (ref != null) parent.insertBefore(child, ref);
        else parent.appendChild(child);
      },
      remove: function (child) {
        if (child.parentNode) child.parentNode.removeChild(child);
      },
      replace: function (parent, oldChild, newChild) {
        parent.replaceChild(newChild, oldChild);
      },
      addEventListener: function (el, event, handler, options) {
        el.addEventListener(event, handler, options);
      },
      removeEventListener: function (el, event, handler) {
        el.removeEventListener(event, handler);
      },
      nextTick: function (cb) { Promise.resolve().then(cb); },
      parentNode: function (el) { return el.parentNode; },
      nextSibling: function (el) { return el.nextSibling; },
      querySelector: function (selector) { return document.querySelector(selector); },
    };
  }

  // ============================================================
  // 简易 VNode 到 DOM 渲染
  // ============================================================

  function renderVNode(vnode, renderer) {
    if (vnode == null || typeof vnode === 'boolean') return null;
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return renderer.createText(String(vnode));
    }

    // Fragment
    if (vnode.type === Fragment) {
      var fragment = document.createDocumentFragment();
      if (Array.isArray(vnode.children)) {
        for (var i = 0; i < vnode.children.length; i++) {
          var childEl = renderVNode(vnode.children[i], renderer);
          if (childEl) fragment.appendChild(childEl);
        }
      }
      return fragment;
    }

    // 元素
    if (typeof vnode.type === 'string') {
      var el = renderer.createElement(vnode.type);
      vnode.el = el;

      // 处理 props
      if (vnode.props) {
        for (var key in vnode.props) {
          var value = vnode.props[key];
          if (key === 'class' || key === 'className') {
            el.className = value;
          } else if (key === 'style' && typeof value === 'object') {
            for (var sk in value) { el.style[sk] = value[sk]; }
          } else if (key.startsWith('on') && typeof value === 'function') {
            var eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, value);
          } else if (key === 'key' || key === 'ref') {
            // skip
          } else {
            el.setAttribute(key, String(value));
          }
        }
      }

      // 处理子节点
      if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = vnode.children;
      } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (Array.isArray(vnode.children)) {
          for (var ci = 0; ci < vnode.children.length; ci++) {
            var childNode = renderVNode(vnode.children[ci], renderer);
            if (childNode) el.appendChild(childNode);
          }
        }
      }

      return el;
    }

    return null;
  }

  // ============================================================
  // createApp
  // ============================================================

  function createApp(rootComponent, rootProps) {
    rootProps = rootProps || {};
    var installedPlugins = new Set();
    var components = {};
    var directives = {};
    var config = {};
    var globalProperties = {};
    var rootInstance = null;
    var renderer = null;
    var updateRunner = null;
    var mountedContainer = null;
    var isMounted = false;

    var normalizedRootComponent = typeof rootComponent === 'function'
      ? { render: rootComponent }
      : rootComponent;

    // 初始化状态
    var rawState = typeof normalizedRootComponent.state === 'function'
      ? normalizedRootComponent.state()
      : (normalizedRootComponent.state ? Object.assign({}, normalizedRootComponent.state) : {});

    var state = reactive(rawState);

    // 创建 renderProxy: 将 this 绑定到 state
    var renderProxy = new Proxy(state, {
      get: function (target, key, receiver) {
        var val = Reflect.get(target, key, receiver);
        return val;
      },
      set: function (target, key, value, receiver) {
        return Reflect.set(target, key, value, receiver);
      },
    });

    var app = {
      config: config,
      globalProperties: globalProperties,
      get _instance() { return rootInstance; },

      mount: function (container) {
        if (isMounted) {
          console.warn('[Lyt] 应用已经挂载，不能重复挂载。');
          return app;
        }

        var el;
        if (typeof container === 'string') {
          el = document.querySelector(container);
          if (!el) throw new Error('[Lyt] 找不到挂载目标: "' + container + '"');
        } else {
          el = container;
        }
        mountedContainer = el;

        renderer = createMinimalDOMRenderer();

        // 执行 init
        if (typeof normalizedRootComponent.init === 'function') {
          normalizedRootComponent.init.call(renderProxy, rootProps);
        }

        // 执行 setup
        if (typeof normalizedRootComponent.setup === 'function') {
          var setupResult = normalizedRootComponent.setup(rootProps, { attrs: {} });
          if (setupResult && typeof setupResult === 'object') {
            for (var sk in setupResult) {
              state[sk] = setupResult[sk];
            }
          }
        }

        // 执行 mounted
        if (typeof normalizedRootComponent.mounted === 'function') {
          setTimeout(function () {
            normalizedRootComponent.mounted.call(renderProxy);
          }, 0);
        }

        // 渲染函数
        var renderFn = normalizedRootComponent.render;

        // 执行渲染
        function doRender() {
          if (!renderFn || !mountedContainer) return;
          var vnode;
          try {
            vnode = renderFn.call(renderProxy);
          } catch (e) {
            console.error('[Lyt] 渲染错误:', e);
            return;
          }
          if (!vnode) return;

          mountedContainer.innerHTML = '';
          var domEl = renderVNode(vnode, renderer);
          if (domEl) {
            if (domEl.nodeType === 11) { // DocumentFragment
              while (domEl.firstChild) {
                mountedContainer.appendChild(domEl.firstChild);
              }
            } else {
              mountedContainer.appendChild(domEl);
            }
          }
        }

        // 首次渲染
        doRender();

        // 响应式更新
        updateRunner = effect(function () {
          if (!isMounted) return;
          doRender();
        }, { lazy: true });

        // 启动响应式更新
        updateRunner.effect.run();

        isMounted = true;
        return app;
      },

      unmount: function () {
        if (!isMounted) {
          console.warn('[Lyt] 应用未挂载，无法卸载。');
          return;
        }
        if (updateRunner) {
          stop(updateRunner);
          updateRunner = null;
        }
        if (typeof normalizedRootComponent.beforeUnmount === 'function') {
          normalizedRootComponent.beforeUnmount.call(renderProxy);
        }
        if (typeof normalizedRootComponent.unmounted === 'function') {
          normalizedRootComponent.unmounted.call(renderProxy);
        }
        if (mountedContainer) mountedContainer.innerHTML = '';
        rootInstance = null;
        renderer = null;
        mountedContainer = null;
        isMounted = false;
      },

      use: function (plugin) {
        if (installedPlugins.has(plugin)) {
          console.warn('[Lyt] 插件已经安装，不能重复安装。');
          return app;
        }
        installedPlugins.add(plugin);
        if (typeof plugin.install === 'function') {
          plugin.install(app);
        } else if (typeof plugin === 'function') {
          plugin(app);
        }
        return app;
      },

      provide: function (key, value) {
        globalProperties[key] = value;
        return app;
      },

      inject: function (key, defaultValue) {
        var value = globalProperties[key];
        return value !== undefined ? value : defaultValue;
      },

      component: function (name, component) {
        if (!component) return components[name];
        components[name] = component;
        return app;
      },

      directive: function (name, directive) {
        if (!directive) return directives[name];
        directives[name] = directive;
        return app;
      },
    };

    return app;
  }

  // ============================================================
  // 导出
  // ============================================================

  var Lyt = {
    // 核心
    createApp: createApp,
    h: h,
    Fragment: Fragment,
    ShapeFlags: ShapeFlags,

    // 响应式
    reactive: reactive,
    readonly: readonly,
    shallowReactive: shallowReactive,
    toRaw: toRaw,
    isReactive: isReactive,
    isReadonly: isReadonly,
    markReadOnly: markReadOnly,
    markSkip: markSkip,

    // Ref
    ref: ref,
    shallowRef: shallowRef,
    isRef: isRef,
    unref: unref,
    toRef: toRef,
    toRefs: toRefs,
    triggerRef: triggerRef,

    // 计算属性
    computed: computed,

    // 副作用
    effect: effect,
    stop: stop,
    watch: watch,
    watchEffect: watchEffect,
    nextTick: nextTick,
  };

  // 暴露到全局
  if (typeof globalThis !== 'undefined') {
    globalThis.Lyt = Lyt;
  }
  if (typeof window !== 'undefined') {
    window.Lyt = Lyt;
  }
  if (typeof self !== 'undefined') {
    self.Lyt = Lyt;
  }

  // CommonJS / module 支持
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Lyt;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : this);
