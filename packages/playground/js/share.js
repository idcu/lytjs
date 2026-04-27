/**
 * Lyt.js Playground - Share Module
 *
 * Handles code sharing via URL hash encoding/decoding.
 * Uses LZString for compression.
 */

const ShareManager = (() => {
  let lzStringLoaded = false

  /**
   * Load LZString library from CDN
   */
  async function loadLZString() {
    if (window.LZString) {
      lzStringLoaded = true
      return
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js'
      script.onload = () => {
        lzStringLoaded = true
        resolve()
      }
      script.onerror = () => {
        console.warn('[Playground] Failed to load LZString, sharing will use base64 only')
        resolve() // Don't block, just warn
      }
      document.head.appendChild(script)
    })
  }

  /**
   * Generate a shareable URL from code
   */
  async function generateShareURL(code) {
    await loadLZString()

    let encoded
    if (window.LZString) {
      // Use LZString compression
      encoded = LZString.compressToEncodedURIComponent(code)
    } else {
      // Fallback to base64
      encoded = btoa(unescape(encodeURIComponent(code)))
    }

    const url = window.location.origin + window.location.pathname + '#code=' + encoded
    return url
  }

  /**
   * Extract code from URL hash
   */
  async function getCodeFromHash() {
    const hash = window.location.hash
    if (!hash || !hash.startsWith('#code=')) {
      return null
    }

    const encoded = hash.substring(6)
    if (!encoded) return null

    await loadLZString()

    try {
      if (window.LZString) {
        // Try LZString decompression first
        const decoded = LZString.decompressFromEncodedURIComponent(encoded)
        if (decoded) return decoded
      }

      // Fallback: try base64
      return decodeURIComponent(escape(atob(encoded)))
    } catch (e) {
      console.warn('[Playground] Failed to decode shared code:', e)
      return null
    }
  }

  /**
   * Check if URL contains shared code
   */
  function hasSharedCode() {
    const hash = window.location.hash
    return hash && hash.startsWith('#code=')
  }

  /**
   * Copy share URL to clipboard
   */
  async function copyShareURL(code) {
    const url = await generateShareURL(code)
    try {
      await navigator.clipboard.writeText(url)
      return { success: true, url }
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        return { success: true, url }
      } catch (e2) {
        return { success: false, url }
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }

  /**
   * Clear the URL hash
   */
  function clearHash() {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  return {
    generateShareURL,
    getCodeFromHash,
    hasSharedCode,
    copyShareURL,
    clearHash
  }
})()
