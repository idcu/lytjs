import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' })
globalThis.window = dom.window as any
globalThis.document = dom.window.document as any
globalThis.location = dom.window.location as any
globalThis.history = dom.window.history as any
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window) as any
globalThis.removeEventListener = dom.window.removeEventListener.bind(dom.window) as any

dom.window.addEventListener('hashchange', () => {
  console.log('hashchange event fired, hash:', dom.window.location.hash)
})

dom.window.location.hash = '#/about'
console.log('after setting hash:', dom.window.location.hash)

setTimeout(() => {
  console.log('after timeout, hash:', dom.window.location.hash)
}, 50)
