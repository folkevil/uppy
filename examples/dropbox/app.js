(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var numberIsNan = require('number-is-nan');

module.exports = function (num) {
	if (typeof num !== 'number' || numberIsNan(num)) {
		throw new TypeError('Expected a number, got ' + typeof num);
	}

	var exponent;
	var unit;
	var neg = num < 0;
	var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	if (neg) {
		num = -num;
	}

	if (num < 1) {
		return (neg ? '-' : '') + num + ' B';
	}

	exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
	num = Number((num / Math.pow(1000, exponent)).toFixed(2));
	unit = units[exponent];

	return (neg ? '-' : '') + num + ' ' + unit;
};

},{"number-is-nan":2}],2:[function(require,module,exports){
'use strict';
module.exports = Number.isNaN || function (x) {
	return x !== x;
};

},{}],3:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      this.map[name].forEach(function(value) {
        callback.call(thisArg, value, name, this)
      }, this)
    }, this)
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (!body) {
        this._bodyText = ''
      } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {
        // Only support ArrayBuffers for POST method.
        // Receiving ArrayBuffers happens via Blobs, instead.
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body
    if (Request.prototype.isPrototypeOf(input)) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = input
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this)
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function headers(xhr) {
    var head = new Headers()
    var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request
      if (Request.prototype.isPrototypeOf(input) && !init) {
        request = input
      } else {
        request = new Request(input, init)
      }

      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],4:[function(require,module,exports){
var bel = require('bel') // turns template tag into DOM elements
var morphdom = require('morphdom') // efficiently diffs + morphs two DOM elements
var defaultEvents = require('./update-events.js') // default events to be copied when dom elements update

module.exports = bel

// TODO move this + defaultEvents to a new module once we receive more feedback
module.exports.update = function (fromNode, toNode, opts) {
  if (!opts) opts = {}
  if (opts.events !== false) {
    if (!opts.onBeforeMorphEl) opts.onBeforeMorphEl = copier
  }

  return morphdom(fromNode, toNode, opts)

  // morphdom only copies attributes. we decided we also wanted to copy events
  // that can be set via attributes
  function copier (f, t) {
    // copy events:
    var events = opts.events || defaultEvents
    for (var i = 0; i < events.length; i++) {
      var ev = events[i]
      if (t[ev]) { // if new element has a whitelisted attribute
        f[ev] = t[ev] // update existing element
      } else if (f[ev]) { // if existing element has it and new one doesnt
        f[ev] = undefined // remove it from existing element
      }
    }
    // copy values for form elements
    if ((f.nodeName === 'INPUT' && f.type !== 'file') || f.nodeName === 'TEXTAREA' || f.nodeName === 'SELECT') {
      if (t.getAttribute('value') === null) t.value = f.value
    }
  }
}

},{"./update-events.js":12,"bel":5,"morphdom":11}],5:[function(require,module,exports){
var document = require('global/document')
var hyperx = require('hyperx')
var onload = require('on-load')

var SVGNS = 'http://www.w3.org/2000/svg'
var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  selected: 1,
  willvalidate: 1
}
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else {
    el = document.createElement(tag)
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {}
    var unload = props.onunload || function () {}
    onload(el, function bel_onload () {
      load(el)
    }, function bel_onunload () {
      unload(el)
    },
    // We have to use non-standard `caller` to find who invokes `belCreateElement`
    belCreateElement.caller.caller.caller)
    delete props.onload
    delete props.onunload
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          el.setAttributeNS(null, p, val)
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node
          continue
        }
        node = document.createTextNode(node)
      }

      if (node && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  return el
}

module.exports = hyperx(belCreateElement)
module.exports.createElement = belCreateElement

},{"global/document":6,"hyperx":8,"on-load":10}],6:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":20}],7:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12

module.exports = function (h, opts) {
  h = attrToProp(h)
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state)) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === TEXT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[\w-]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":9}],9:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],10:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var watch = Object.create(null)
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36)
var KEY_ATTR = 'data-' + KEY_ID
var INDEX = 0

if (window && window.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) return
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff)
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff)
      eachMutation(mutations[i].addedNodes, turnon)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off, caller) {
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller]
  INDEX += 1
  return el
}

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el)
    watch[index][2] = 1
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el)
    watch[index][2] = 0
  }
}

function eachAttr (mutation, on, off) {
  var newValue = mutation.target.getAttribute(KEY_ATTR)
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue]
    return
  }
  if (watch[mutation.oldValue]) {
    off(mutation.oldValue, mutation.target)
  }
  if (watch[newValue]) {
    on(newValue, mutation.target)
  }
}

function sameOrigin (oldValue, newValue) {
  if (!oldValue || !newValue) return false
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch)
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR)
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i])
        }
      })
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn)
    }
  }
}

},{"global/document":6,"global/window":7}],11:[function(require,module,exports){
// Create a range object for efficently rendering strings to elements.
var range;

var testEl = (typeof document !== 'undefined') ?
    document.body || document.createElement('div') :
    {};

var XHTML = 'http://www.w3.org/1999/xhtml';
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var hasAttributeNS;

if (testEl.hasAttributeNS) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    hasAttributeNS = function(el, namespaceURI, name) {
        return !!el.getAttributeNode(name);
    };
}

function empty(o) {
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
}

function toElement(str) {
    if (!range && document.createRange) {
        range = document.createRange();
        range.selectNode(document.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = document.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        fromEl.selected = toEl.selected;
        if (fromEl.selected) {
            fromEl.setAttribute('selected', '');
        } else {
            fromEl.removeAttribute('selected', '');
        }
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        fromEl.checked = toEl.checked;
        if (fromEl.checked) {
            fromEl.setAttribute('checked', '');
        } else {
            fromEl.removeAttribute('checked');
        }

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }

        fromEl.disabled = toEl.disabled;
        if (fromEl.disabled) {
            fromEl.setAttribute('disabled', '');
        } else {
            fromEl.removeAttribute('disabled');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        if (fromEl.firstChild) {
            fromEl.firstChild.nodeValue = newValue;
        }
    }
};

function noop() {}

/**
 * Returns true if two node's names and namespace URIs are the same.
 *
 * @param {Element} a
 * @param {Element} b
 * @return {boolean}
 */
var compareNodeNames = function(a, b) {
    return a.nodeName === b.nodeName &&
           a.namespaceURI === b.namespaceURI;
};

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === XHTML ?
        document.createElement(name) :
        document.createElementNS(namespaceURI, name);
}

/**
 * Loop over all of the attributes on the target node and make sure the original
 * DOM node has the same attributes. If an attribute found on the original node
 * is not on the new node then remove it from the original node.
 *
 * @param  {Element} fromNode
 * @param  {Element} toNode
 */
function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    for (i = attrs.length - 1; i >= 0; i--) {
        attr = attrs[i];
        attrName = attr.name;
        attrValue = attr.value;
        attrNamespaceURI = attr.namespaceURI;

        if (attrNamespaceURI) {
            attrName = attr.localName || attrName;
            fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
        } else {
            fromValue = fromNode.getAttribute(attrName);
        }

        if (fromValue !== attrValue) {
            if (attrNamespaceURI) {
                fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
            } else {
                fromNode.setAttribute(attrName, attrValue);
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; i--) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (!hasAttributeNS(toNode, attrNamespaceURI, attrNamespaceURI ? attrName = attr.localName || attrName : attrName)) {
                if (attrNamespaceURI) {
                    fromNode.removeAttributeNS(attrNamespaceURI, attr.localName);
                } else {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdom(fromNode, toNode, options) {
    if (!options) {
        options = {};
    }

    if (typeof toNode === 'string') {
        if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
            var toNodeHtml = toNode;
            toNode = document.createElement('html');
            toNode.innerHTML = toNodeHtml;
        } else {
            toNode = toElement(toNode);
        }
    }

    // XXX optimization: if the nodes are equal, don't morph them
    /*
    if (fromNode.isEqualNode(toNode)) {
      return fromNode;
    }
    */

    var savedEls = {}; // Used to save off DOM elements with IDs
    var unmatchedEls = {};
    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
    var onNodeAdded = options.onNodeAdded || noop;
    var onBeforeElUpdated = options.onBeforeElUpdated || options.onBeforeMorphEl || noop;
    var onElUpdated = options.onElUpdated || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || options.onBeforeMorphElChildren || noop;
    var childrenOnly = options.childrenOnly === true;
    var movedEls = [];

    function removeNodeHelper(node, nestedInSavedEl) {
        var id = getNodeKey(node);
        // If the node has an ID then save it off since we will want
        // to reuse it in case the target DOM tree has a DOM element
        // with the same ID
        if (id) {
            savedEls[id] = node;
        } else if (!nestedInSavedEl) {
            // If we are not nested in a saved element then we know that this node has been
            // completely discarded and will not exist in the final DOM.
            onNodeDiscarded(node);
        }

        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {
                removeNodeHelper(curChild, nestedInSavedEl || id);
                curChild = curChild.nextSibling;
            }
        }
    }

    function walkDiscardedChildNodes(node) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {


                if (!getNodeKey(curChild)) {
                    // We only want to handle nodes that don't have an ID to avoid double
                    // walking the same saved element.

                    onNodeDiscarded(curChild);

                    // Walk recursively
                    walkDiscardedChildNodes(curChild);
                }

                curChild = curChild.nextSibling;
            }
        }
    }

    function removeNode(node, parentNode, alreadyVisited) {
        if (onBeforeNodeDiscarded(node) === false) {
            return;
        }

        parentNode.removeChild(node);
        if (alreadyVisited) {
            if (!getNodeKey(node)) {
                onNodeDiscarded(node);
                walkDiscardedChildNodes(node);
            }
        } else {
            removeNodeHelper(node);
        }
    }

    function morphEl(fromEl, toEl, alreadyVisited, childrenOnly) {
        var toElKey = getNodeKey(toEl);
        if (toElKey) {
            // If an element with an ID is being morphed then it is will be in the final
            // DOM so clear it out of the saved elements collection
            delete savedEls[toElKey];
        }

        if (!childrenOnly) {
            if (onBeforeElUpdated(fromEl, toEl) === false) {
                return;
            }

            morphAttrs(fromEl, toEl);
            onElUpdated(fromEl);

            if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                return;
            }
        }

        if (fromEl.nodeName !== 'TEXTAREA') {
            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeId;

            var fromNextSibling;
            var toNextSibling;
            var savedEl;
            var unmatchedEl;

            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeId = getNodeKey(curToNodeChild);

                while (curFromNodeChild) {
                    var curFromNodeId = getNodeKey(curFromNodeChild);
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (!alreadyVisited) {
                        if (curFromNodeId && (unmatchedEl = unmatchedEls[curFromNodeId])) {
                            unmatchedEl.parentNode.replaceChild(curFromNodeChild, unmatchedEl);
                            morphEl(curFromNodeChild, unmatchedEl, alreadyVisited);
                            curFromNodeChild = fromNextSibling;
                            continue;
                        }
                    }

                    var curFromNodeType = curFromNodeChild.nodeType;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        var isCompatible = false;

                        // Both nodes being compared are Element nodes
                        if (curFromNodeType === ELEMENT_NODE) {
                            if (compareNodeNames(curFromNodeChild, curToNodeChild)) {
                                // We have compatible DOM elements
                                if (curFromNodeId || curToNodeId) {
                                    // If either DOM element has an ID then we
                                    // handle those differently since we want to
                                    // match up by ID
                                    if (curToNodeId === curFromNodeId) {
                                        isCompatible = true;
                                    }
                                } else {
                                    isCompatible = true;
                                }
                            }

                            if (isCompatible) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                morphEl(curFromNodeChild, curToNodeChild, alreadyVisited);
                            }
                        // Both nodes being compared are Text or Comment nodes
                    } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                        }

                        if (isCompatible) {
                            curToNodeChild = toNextSibling;
                            curFromNodeChild = fromNextSibling;
                            continue outer;
                        }
                    }

                    // No compatible match so remove the old node from the DOM
                    // and continue trying to find a match in the original DOM
                    removeNode(curFromNodeChild, fromEl, alreadyVisited);
                    curFromNodeChild = fromNextSibling;
                }

                if (curToNodeId) {
                    if ((savedEl = savedEls[curToNodeId])) {
                        if (compareNodeNames(savedEl, curToNodeChild)) {
                            morphEl(savedEl, curToNodeChild, true);
                            // We want to append the saved element instead
                            curToNodeChild = savedEl;
                        } else {
                            delete savedEls[curToNodeId];
                            onNodeDiscarded(savedEl);
                        }
                    } else {
                        // The current DOM element in the target tree has an ID
                        // but we did not find a match in any of the
                        // corresponding siblings. We just put the target
                        // element in the old DOM tree but if we later find an
                        // element in the old DOM tree that has a matching ID
                        // then we will replace the target element with the
                        // corresponding old element and morph the old element
                        unmatchedEls[curToNodeId] = curToNodeChild;
                    }
                }

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to node"
                // to the end
                if (onBeforeNodeAdded(curToNodeChild) !== false) {
                    fromEl.appendChild(curToNodeChild);
                    onNodeAdded(curToNodeChild);
                }

                if (curToNodeChild.nodeType === ELEMENT_NODE &&
                    (curToNodeId || curToNodeChild.firstChild)) {
                    // The element that was just added to the original DOM may
                    // have some nested elements with a key/ID that needs to be
                    // matched up with other elements. We'll add the element to
                    // a list so that we can later process the nested elements
                    // if there are any unmatched keyed elements that were
                    // discarded
                    movedEls.push(curToNodeChild);
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            // We have processed all of the "to nodes". If curFromNodeChild is
            // non-null then we still have some from nodes left over that need
            // to be removed
            while (curFromNodeChild) {
                fromNextSibling = curFromNodeChild.nextSibling;
                removeNode(curFromNodeChild, fromEl, alreadyVisited);
                curFromNodeChild = fromNextSibling;
            }
        }

        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
            specialElHandler(fromEl, toEl);
        }
    } // END: morphEl(...)

    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;

    if (!childrenOnly) {
        // Handle the case where we are given two DOM nodes that are not
        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
        if (morphedNodeType === ELEMENT_NODE) {
            if (toNodeType === ELEMENT_NODE) {
                if (!compareNodeNames(fromNode, toNode)) {
                    onNodeDiscarded(fromNode);
                    morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                }
            } else {
                // Going from an element node to a text node
                morphedNode = toNode;
            }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
            if (toNodeType === morphedNodeType) {
                morphedNode.nodeValue = toNode.nodeValue;
                return morphedNode;
            } else {
                // Text node to something else
                morphedNode = toNode;
            }
        }
    }

    if (morphedNode === toNode) {
        // The "to node" was not compatible with the "from node" so we had to
        // toss out the "from node" and use the "to node"
        onNodeDiscarded(fromNode);
    } else {
        morphEl(morphedNode, toNode, false, childrenOnly);

        /**
         * What we will do here is walk the tree for the DOM element that was
         * moved from the target DOM tree to the original DOM tree and we will
         * look for keyed elements that could be matched to keyed elements that
         * were earlier discarded.  If we find a match then we will move the
         * saved element into the final DOM tree.
         */
        var handleMovedEl = function(el) {
            var curChild = el.firstChild;
            while (curChild) {
                var nextSibling = curChild.nextSibling;

                var key = getNodeKey(curChild);
                if (key) {
                    var savedEl = savedEls[key];
                    if (savedEl && compareNodeNames(curChild, savedEl)) {
                        curChild.parentNode.replaceChild(savedEl, curChild);
                        // true: already visited the saved el tree
                        morphEl(savedEl, curChild, true);
                        curChild = nextSibling;
                        if (empty(savedEls)) {
                            return false;
                        }
                        continue;
                    }
                }

                if (curChild.nodeType === ELEMENT_NODE) {
                    handleMovedEl(curChild);
                }

                curChild = nextSibling;
            }
        };

        // The loop below is used to possibly match up any discarded
        // elements in the original DOM tree with elemenets from the
        // target tree that were moved over without visiting their
        // children
        if (!empty(savedEls)) {
            handleMovedElsLoop:
            while (movedEls.length) {
                var movedElsTemp = movedEls;
                movedEls = [];
                for (var i=0; i<movedElsTemp.length; i++) {
                    if (handleMovedEl(movedElsTemp[i]) === false) {
                        // There are no more unmatched elements so completely end
                        // the loop
                        break handleMovedElsLoop;
                    }
                }
            }
        }

        // Fire the "onNodeDiscarded" event for any saved elements
        // that never found a new home in the morphed DOM
        for (var savedElId in savedEls) {
            if (savedEls.hasOwnProperty(savedElId)) {
                var savedEl = savedEls[savedElId];
                onNodeDiscarded(savedEl);
                walkDiscardedChildNodes(savedEl);
            }
        }
    }

    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        // If we had to swap out the from node with a new node because the old
        // node was not compatible with the target node then we need to
        // replace the old DOM node in the original DOM tree. This is only
        // possible if the original DOM node was part of a DOM tree which
        // we know is the case if it has a parent node.
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }

    return morphedNode;
}

module.exports = morphdom;

},{}],12:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],13:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _templateObject = _taggedTemplateLiteralLoose(['<img alt="', '" src="', '">'], ['<img alt="', '" src="', '">']);

var _Utils = require('../core/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _Translator = require('../core/Translator');

var _Translator2 = _interopRequireDefault(_Translator);

var _prettyBytes = require('pretty-bytes');

var _prettyBytes2 = _interopRequireDefault(_prettyBytes);

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _UppySocket = require('./UppySocket');

var _UppySocket2 = _interopRequireDefault(_UppySocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteralLoose(strings, raw) { strings.raw = raw; return strings; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Main Uppy core
 *
 * @param {object} opts general options, like locales, to show modal or not to show
 */

var Core = function () {
  function Core(opts) {
    _classCallCheck(this, Core);

    // set default options
    var defaultOptions = {
      // load English as the default locales
      locales: require('../locales/en_US.js'),
      autoProceed: true,
      debug: false
    };

    // Merge default options with the ones set by user
    this.opts = _extends({}, defaultOptions, opts);

    // Dictates in what order different plugin types are ran:
    this.types = ['presetter', 'orchestrator', 'progressindicator', 'acquirer', 'uploader', 'presenter'];

    this.type = 'core';

    // Container for different types of plugins
    this.plugins = {};

    this.translator = new _Translator2.default({ locales: this.opts.locales });
    this.i18n = this.translator.translate.bind(this.translator);
    this.initSocket = this.initSocket.bind(this);

    this.emitter = new _events2.default.EventEmitter();

    this.state = {
      files: {}
    };

    if (this.opts.debug) {
      // for debugging and testing
      global.UppyState = this.state;
      global.uppyLog = '';
      global.UppyAddFile = this.addFile.bind(this);
    }
  }

  /**
   * Iterate on all plugins and run `update` on them. Called each time when state changes
   *
   */


  Core.prototype.updateAll = function updateAll() {
    var _this = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this.plugins[pluginType].forEach(function (plugin) {
        plugin.update();
      });
    });
  };

  /**
   * Updates state
   *
   * @param {newState} object
   */


  Core.prototype.setState = function setState(newState) {
    this.log('Setting state to: ');
    this.log(newState);
    this.state = _extends({}, this.state, newState);
    this.updateAll();
  };

  /**
   * Gets current state, making sure to make a copy of the state object and pass that,
   * instead of an actual reference to `this.state`
   *
   */


  Core.prototype.getState = function getState() {
    return this.state;
  };

  Core.prototype.addMeta = function addMeta(meta, fileID) {
    if (typeof fileID === 'undefined') {
      var updatedFiles = _extends({}, this.state.files);
      for (var file in updatedFiles) {
        updatedFiles[file].meta = meta;
      }
      this.setState({ files: updatedFiles });
    }
  };

  Core.prototype.addFile = function addFile(file) {
    var _this2 = this;

    var updatedFiles = _extends({}, this.state.files);

    var fileType = file.type.split('/');
    var fileTypeGeneral = fileType[0];
    var fileTypeSpecific = fileType[1];
    var fileID = _Utils2.default.generateFileID(file.name);

    updatedFiles[fileID] = {
      source: file.source || '',
      id: fileID,
      name: file.name,
      type: {
        general: fileTypeGeneral,
        specific: fileTypeSpecific
      },
      data: file.data,
      progress: 0,
      totalSize: file.data.size ? (0, _prettyBytes2.default)(file.data.size) : '?',
      uploadedSize: 0,
      isRemote: file.isRemote || false,
      remote: file.remote
    };

    this.setState({ files: updatedFiles });

    if (fileTypeGeneral === 'image') {
      // this.addImgPreviewToFile(updatedFiles[fileID])
      _Utils2.default.readImage(updatedFiles[fileID].data, function (imgEl) {
        var newImageWidth = 200;
        var newImageHeight = _Utils2.default.getProportionalImageHeight(imgEl, newImageWidth);
        var resizedImgSrc = _Utils2.default.resizeImage(imgEl, newImageWidth, newImageHeight);

        var updatedFiles = _extends({}, _this2.state.files);
        updatedFiles[fileID].previewEl = (0, _yoYo2.default)(_templateObject, file.name, resizedImgSrc);
        _this2.setState({ files: updatedFiles });
      });
    }

    if (this.opts.autoProceed) {
      this.emitter.emit('next');
    }
  };

  /**
   * Registers listeners for all global actions, like:
   * `file-add`, `file-remove`, `upload-progress`, `reset`
   *
   */


  Core.prototype.actions = function actions() {
    var _this3 = this;

    this.emitter.on('file-add', function (data) {
      _this3.addFile(data);
    });

    // `remove-file` removes a file from `state.files`, for example when
    // a user decides not to upload particular file and clicks a button to remove it
    this.emitter.on('file-remove', function (fileID) {
      var updatedFiles = _extends({}, _this3.state.files);
      delete updatedFiles[fileID];
      _this3.setState({ files: updatedFiles });
    });

    this.emitter.on('upload-progress', function (data) {
      var percentage = (data.bytesUploaded / data.bytesTotal * 100).toFixed(2);
      percentage = Math.round(percentage);

      var updatedFiles = _extends({}, _this3.state.files);
      updatedFiles[data.id].progress = percentage;
      updatedFiles[data.id].uploadedSize = data.bytesUploaded ? (0, _prettyBytes2.default)(data.bytesUploaded) : '?';

      var inProgress = Object.keys(updatedFiles).map(function (file) {
        return file.progress !== 0;
      });

      // calculate total progress, using the number of files currently uploading,
      // multiplied by 100 and the summ of individual progress of each file
      var progressMax = Object.keys(inProgress).length * 100;
      var progressAll = 0;
      Object.keys(updatedFiles).forEach(function (file) {
        progressAll = progressAll + updatedFiles[file].progress;
      });

      var totalProgress = progressAll * 100 / progressMax;

      _this3.setState({
        totalProgress: totalProgress,
        files: updatedFiles
      });
    });

    // `upload-success` adds successfully uploaded file to `state.uploadedFiles`
    // and fires `remove-file` to remove it from `state.files`
    this.emitter.on('upload-success', function (file) {
      var updatedFiles = _extends({}, _this3.state.files);
      updatedFiles[file.id] = file;
      _this3.setState({ files: updatedFiles });
      // this.log(this.state.uploadedFiles)
      // this.emitter.emit('file-remove', file.id)
    });
  };

  /**
   * Registers a plugin with Core
   *
   * @param {Class} Plugin object
   * @param {Object} options object that will be passed to Plugin later
   * @return {Object} self for chaining
   */


  Core.prototype.use = function use(Plugin, opts) {
    // Instantiate
    var plugin = new Plugin(this, opts);
    var pluginName = plugin.id;
    this.plugins[plugin.type] = this.plugins[plugin.type] || [];

    if (!pluginName) {
      throw new Error('Your plugin must have a name');
    }

    if (!plugin.type) {
      throw new Error('Your plugin must have a type');
    }

    var existsPluginAlready = this.getPlugin(pluginName);
    if (existsPluginAlready) {
      var msg = 'Already found a plugin named \'' + existsPluginAlready.name + '\'.\n        Tried to use: \'' + pluginName + '\'.\n        Uppy is currently limited to running one of every plugin.\n        Share your use case with us over at\n        https://github.com/transloadit/uppy/issues/\n        if you want us to reconsider.';
      throw new Error(msg);
    }

    this.plugins[plugin.type].push(plugin);

    return this;
  };

  /**
   * Find one Plugin by name
   *
   * @param string name description
   */


  Core.prototype.getPlugin = function getPlugin(name) {
    var foundPlugin = false;
    this.iteratePlugins(function (plugin) {
      var pluginName = plugin.id;
      if (pluginName === name) {
        foundPlugin = plugin;
        return false;
      }
    });
    return foundPlugin;
  };

  /**
   * Iterate through all `use`d plugins
   *
   * @param function method description
   */


  Core.prototype.iteratePlugins = function iteratePlugins(method) {
    var _this4 = this;

    Object.keys(this.plugins).forEach(function (pluginType) {
      _this4.plugins[pluginType].forEach(method);
    });
  };

  /**
   * Logs stuff to console, only if `debug` is set to true. Silent in production.
   *
   * @return {String|Object} to log
   */


  Core.prototype.log = function log(msg) {
    if (!this.opts.debug) {
      return;
    }
    if (msg === '' + msg) {
      console.log('LOG: ' + msg);
    } else {
      console.log('LOG↓');
      console.dir(msg);
    }
    global.uppyLog = global.uppyLog + '\n' + 'DEBUG LOG: ' + msg;
  };

  /**
   * Runs all plugins of the same type in parallel
   *
   * @param {string} type that wants to set progress
   * @param {array} files
   * @return {Promise} of all methods
   */


  Core.prototype.runType = function runType(type, method, files) {
    var methods = this.plugins[type].map(function (plugin) {
      return plugin[method](_Utils2.default.flatten(files));
    });

    return Promise.all(methods).catch(function (error) {
      return console.error(error);
    });
  };

  /**
   * Runs a waterfall of runType plugin packs, like so:
   * All preseters(data) --> All acquirers(data) --> All uploaders(data) --> done
   */


  Core.prototype.run = function run() {
    var _this5 = this;

    this.log('Core is run, initializing actions, installing plugins...');

    this.actions();

    // Forse set `autoProceed` option to false if there are multiple selector Plugins active
    if (this.plugins.acquirer && this.plugins.acquirer.length > 1) {
      this.opts.autoProceed = false;
    }

    // Install all plugins
    Object.keys(this.plugins).forEach(function (pluginType) {
      _this5.plugins[pluginType].forEach(function (plugin) {
        plugin.install();
      });
    });

    return;

    // Each Plugin can have `run` and/or `install` methods.
    // `install` adds event listeners and does some non-blocking work, useful for `progressindicator`,
    // `run` waits for the previous step to finish (user selects files) before proceeding
    // ['install', 'run'].forEach((method) => {
    //   // First we select only plugins of current type,
    //   // then create an array of runType methods of this plugins
    //   const typeMethods = this.types.filter((type) => this.plugins[type])
    //     .map((type) => this.runType.bind(this, type, method))
    //   // Run waterfall of typeMethods
    //   return Utils.promiseWaterfall(typeMethods)
    //     .then((result) => {
    //       // If results are empty, don't log upload results. Hasn't run yet.
    //       if (result[0] !== undefined) {
    //         this.log(result)
    //         this.log('Upload result -> success!')
    //         return result
    //       }
    //     })
    //     .catch((error) => this.log('Upload result -> failed:', error))
    // })
  };

  Core.prototype.initSocket = function initSocket(opts) {
    if (!this.socket) {
      this.socket = new _UppySocket2.default(opts);
    }

    return this.socket;
  };

  return Core;
}();

exports.default = Core;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../core/Translator":14,"../core/Utils":16,"../locales/en_US.js":17,"./UppySocket":15,"events":21,"pretty-bytes":1,"yo-yo":4}],14:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Translates strings with interpolation & pluralization support.Extensible with custom dictionaries
 * and pluralization functions.
 *
 * Borrows heavily from and inspired by Polyglot https://github.com/airbnb/polyglot.js,
 * basically a stripped-down version of it. Differences: pluralization functions are not hardcoded
 * and can be easily added among with dictionaries, nested objects are used for pluralization
 * as opposed to `||||` delimeter
 *
 * Usage example: `translator.translate('files_chosen', {smart_count: 3})`
 *
 * @param {object} opts
 */

var Translator = function () {
  function Translator(opts) {
    _classCallCheck(this, Translator);

    var defaultOptions = {};
    this.opts = _extends({}, defaultOptions, opts);
  }

  /**
   * Takes a string with placeholder variables like `%{smart_count} file selected`
   * and replaces it with values from options `{smart_count: 5}`
   *
   * @license https://github.com/airbnb/polyglot.js/blob/master/LICENSE
   * taken from https://github.com/airbnb/polyglot.js/blob/master/lib/polyglot.js#L299
   *
   * @param {string} phrase that needs interpolation, with placeholders
   * @param {object} options with values that will be used to replace placeholders
   * @return {string} interpolated
   */


  Translator.prototype.interpolate = function interpolate(phrase, options) {
    var replace = String.prototype.replace;
    var dollarRegex = /\$/g;
    var dollarBillsYall = '$$$$';

    for (var arg in options) {
      if (arg !== '_' && options.hasOwnProperty(arg)) {
        // Ensure replacement value is escaped to prevent special $-prefixed
        // regex replace tokens. the "$$$$" is needed because each "$" needs to
        // be escaped with "$" itself, and we need two in the resulting output.
        var replacement = options[arg];
        if (typeof replacement === 'string') {
          replacement = replace.call(options[arg], dollarRegex, dollarBillsYall);
        }
        // We create a new `RegExp` each time instead of using a more-efficient
        // string replace so that the same argument can be replaced multiple times
        // in the same phrase.
        phrase = replace.call(phrase, new RegExp('%\\{' + arg + '\\}', 'g'), replacement);
      }
    }
    return phrase;
  };

  /**
   * Public translate method
   *
   * @param {string} key
   * @param {object} options with values that will be used later to replace placeholders in string
   * @return {string} translated (and interpolated)
   */


  Translator.prototype.translate = function translate(key, options) {
    if (options && options.smart_count) {
      var plural = this.opts.locales.pluralize(options.smart_count);
      return this.interpolate(this.opts.locales.strings[key][plural], options);
    }

    return this.interpolate(this.opts.locales.strings[key], options);
  };

  return Translator;
}();

exports.default = Translator;

},{}],15:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var UppySocket = function () {
  function UppySocket(opts) {
    var _this = this;

    _classCallCheck(this, UppySocket);

    this.queued = [];
    this.isOpen = false;
    this.socket = new WebSocket(opts.target);
    this.emitter = new _events2.default.EventEmitter();

    this.socket.onopen = function (e) {
      _this.isOpen = true;

      while (_this.queued.length > 0 && _this.isOpen) {
        var first = _this.queued[0];
        _this.send(first.action, first.payload);
        _this.queued = _this.queued.slice(1);
      }
    };

    this.socket.onclose = function (e) {
      _this.isOpen = false;
    };

    this._handleMessage = this._handleMessage.bind(this);

    this.socket.onmessage = this._handleMessage;

    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.once = this.once.bind(this);
    this.send = this.send.bind(this);
  }

  UppySocket.prototype.send = function send(action, payload) {
    // attach uuid

    if (!this.isOpen) {
      this.queued.push({ action: action, payload: payload });
      return;
    }

    this.socket.send(JSON.stringify({
      action: action,
      payload: payload
    }));
  };

  UppySocket.prototype.on = function on(action, handler) {
    this.emitter.on(action, handler);
  };

  UppySocket.prototype.emit = function emit(action, payload) {
    this.emitter.emit(action, payload);
  };

  UppySocket.prototype.once = function once(action, handler) {
    this.emitter.once(action, handler);
  };

  UppySocket.prototype._handleMessage = function _handleMessage(e) {
    try {
      var message = JSON.parse(e.data);
      this.emit(message.action, message.payload);
    } catch (err) {
      console.log(err);
    }
  };

  return UppySocket;
}();

exports.default = UppySocket;

},{"events":21}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;
/**
 * A collection of small utility functions that help with dom manipulation, adding listeners,
 * promises and other good things.
 *
 * @module Utils
 */

/**
 * Runs a waterfall of promises: calls each task, passing the result
 * from the previous one as an argument. The first task is run with an empty array.
 *
 * @memberof Utils
 * @param {array} methods of Promises to run waterfall on
 * @return {Promise} of the final task
 */
function promiseWaterfall(methods) {
  var resolvedPromise = methods[0];
  var tasks = methods.slice(1);

  var finalTaskPromise = tasks.reduce(function (prevTaskPromise, task) {
    return prevTaskPromise.then(task);
  }, resolvedPromise([])); // initial value

  return finalTaskPromise;
}

/**
 * Shallow flatten nested arrays.
 */
function flatten(arr) {
  return [].concat.apply([], arr);
}

/**
 * `querySelectorAll` that returns a normal array instead of fileList
 */
function qsa(selector, context) {
  return Array.prototype.slice.call((context || document).querySelectorAll(selector) || []);
}

/**
 * Partition array by a grouping function.
 * @param  {[type]} array      Input array
 * @param  {[type]} groupingFn Grouping function
 * @return {[type]}            Array of arrays
 */
function groupBy(array, groupingFn) {
  return array.reduce(function (result, item) {
    var key = groupingFn(item);
    var xs = result.get(key) || [];
    xs.push(item);
    result.set(key, xs);
    return result;
  }, new Map());
}

/**
 * Tests if every array element passes predicate
 * @param  {Array}  array       Input array
 * @param  {Object} predicateFn Predicate
 * @return {bool}               Every element pass
 */
function every(array, predicateFn) {
  return array.reduce(function (result, item) {
    if (!result) {
      return false;
    }

    return predicateFn(item);
  }, true);
}

/**
 * Converts list into array
*/
function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

/**
 * Takes a fileName and turns it into fileID, by converting to lowercase,
 * removing extra characters and adding unix timestamp
 *
 * @param {String} fileName
 *
 */
function generateFileID(fileName) {
  var fileID = fileName.toLowerCase();
  fileID = fileID.replace(/[^A-Z0-9]/ig, '');
  fileID = fileID + Date.now();
  return fileID;
}

function extend() {
  for (var _len = arguments.length, objs = Array(_len), _key = 0; _key < _len; _key++) {
    objs[_key] = arguments[_key];
  }

  return Object.assign.apply(this, [{}].concat(objs));
}

/**
 * Takes function or class, returns its name.
 * Because IE doesn’t support `constructor.name`.
 * https://gist.github.com/dfkaye/6384439, http://stackoverflow.com/a/15714445
 *
 * @param {Object} fn — function
 *
 */
function getFnName(fn) {
  var f = typeof fn === 'function';
  var s = f && (fn.name && ['', fn.name] || fn.toString().match(/function ([^\(]+)/));
  return !f && 'not a function' || s && s[1] || 'anonymous';
}

/**
 * Reads image as data URI from file object,
 * the one you get from input[type=file] or drag & drop.
 * This will only read image files, skipping others
 *
 * @param {Object} imgObject
 * @param {Function} cb callback that will be called once the image is read
 *
 */
function readImage(imgObject, cb) {
  // if (!imgObject.type.match(/image.*/)) {
  //   console.log('The file is not an image: ', imgObject.type)
  //   return
  // }

  var reader = new FileReader();
  reader.addEventListener('load', function (ev) {
    var imgSrcBase64 = ev.target.result;
    var img = new Image();
    img.onload = function () {
      return cb(img);
    };
    img.src = imgSrcBase64;
  });
  reader.addEventListener('error', function (err) {
    console.log('FileReader error' + err);
  });
  reader.readAsDataURL(imgObject);
}

function getProportionalImageHeight(img, newWidth) {
  var aspect = img.width / img.height;
  var newHeight = Math.round(newWidth / aspect);
  return newHeight;
}

/**
 * Resizes an image to specified width and height, using canvas
 * See https://davidwalsh.name/resize-image-canvas
 *
 * @param {Object} img element
 * @param {String} width of the resulting image
 * @param {String} height of the resulting image
 * @return {String} dataURL of the resized image
 */
function resizeImage(img, width, height) {
  // create an off-screen canvas
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  // set its dimension to target size
  canvas.width = width;
  canvas.height = height;

  // draw source image into the off-screen canvas:
  ctx.drawImage(img, 0, 0, width, height);

  // encode image to data-uri with base64 version of compressed image
  // canvas.toDataURL('image/jpeg', quality);  // quality = [0.0, 1.0]
  return canvas.toDataURL();
}

exports.default = {
  promiseWaterfall: promiseWaterfall,
  generateFileID: generateFileID,
  getFnName: getFnName,
  toArray: toArray,
  every: every,
  flatten: flatten,
  groupBy: groupBy,
  qsa: qsa,
  extend: extend,
  readImage: readImage,
  resizeImage: resizeImage,
  getProportionalImageHeight: getProportionalImageHeight
};

},{}],17:[function(require,module,exports){
'use strict';

var en_US = {};

en_US.strings = {
  chooseFile: 'Choose a file',
  youHaveChosen: 'You have chosen: %{fileName}',
  orDragDrop: 'or drag it here',
  filesChosen: {
    0: '%{smart_count} file selected',
    1: '%{smart_count} files selected'
  },
  filesUploaded: {
    0: '%{smart_count} file uploaded',
    1: '%{smart_count} files uploaded'
  },
  files: {
    0: '%{smart_count} file',
    1: '%{smart_count} files'
  },
  uploadFiles: {
    0: 'Upload %{smart_count} file',
    1: 'Upload %{smart_count} files'
  },
  selectToUpload: 'Select files to upload',
  closeModal: 'Close Modal',
  upload: 'Upload'
};

en_US.pluralize = function (n) {
  if (n === 1) {
    return 0;
  }
  return 1;
};

if (typeof window !== 'undefined' && typeof window.Uppy !== 'undefined') {
  window.Uppy.locales.en_US = en_US;
}

module.exports = en_US;

},{}],18:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _templateObject = _taggedTemplateLiteralLoose(['\n      <svg class="UppyIcon UppyModalTab-icon" width="28" height="28" viewBox="0 0 16 16">\n        <path d="M2.955 14.93l2.667-4.62H16l-2.667 4.62H2.955zm2.378-4.62l-2.666 4.62L0 10.31l5.19-8.99 2.666 4.62-2.523 4.37zm10.523-.25h-5.333l-5.19-8.99h5.334l5.19 8.99z"/>\n      </svg>\n    '], ['\n      <svg class="UppyIcon UppyModalTab-icon" width="28" height="28" viewBox="0 0 16 16">\n        <path d="M2.955 14.93l2.667-4.62H16l-2.667 4.62H2.955zm2.378-4.62l-2.666 4.62L0 10.31l5.19-8.99 2.666 4.62-2.523 4.37zm10.523-.25h-5.333l-5.19-8.99h5.334l5.19 8.99z"/>\n      </svg>\n    ']),
    _templateObject2 = _taggedTemplateLiteralLoose(['\n      <div class="UppyGoogleDrive-authenticate">\n        <h1>You need to authenticate with Google before selecting files.</h1>\n        <a href=', '>Authenticate</a>\n      </div>\n    '], ['\n      <div class="UppyGoogleDrive-authenticate">\n        <h1>You need to authenticate with Google before selecting files.</h1>\n        <a href=', '>Authenticate</a>\n      </div>\n    ']),
    _templateObject3 = _taggedTemplateLiteralLoose(['<li><button onclick=', '>', '</button></li> '], ['<li><button onclick=', '>', '</button></li> ']),
    _templateObject4 = _taggedTemplateLiteralLoose(['\n        <div>\n          <h1><span class="UppyGoogleDrive-fileIcon"><img src=', '/></span>', '</h1>\n          <ul>\n            <li>Type: ', '</li>\n            <li>Modified By Me: ', '</li>\n          </ul>\n          ', '\n        </div>\n      '], ['\n        <div>\n          <h1><span class="UppyGoogleDrive-fileIcon"><img src=', '/></span>', '</h1>\n          <ul>\n            <li>Type: ', '</li>\n            <li>Modified By Me: ', '</li>\n          </ul>\n          ', '\n        </div>\n      ']),
    _templateObject5 = _taggedTemplateLiteralLoose(['<img src=', ' class="UppyGoogleDrive-fileThumbnail" />'], ['<img src=', ' class="UppyGoogleDrive-fileThumbnail" />']),
    _templateObject6 = _taggedTemplateLiteralLoose([''], ['']),
    _templateObject7 = _taggedTemplateLiteralLoose(['\n      <div>\n        <div class="UppyGoogleDrive-header">\n          <ul class="UppyGoogleDrive-breadcrumbs">\n            ', '\n          </ul>\n        </div>\n        <div class="container-fluid">\n          <div class="row">\n            <div class="hidden-md-down col-lg-3 col-xl-3">\n              <ul class="UppyGoogleDrive-sidebar">\n                <li class="UppyGoogleDrive-filter"><input class="UppyGoogleDrive-focusInput" type=\'text\' onkeyup=', ' placeholder="Search.." value=', '/></li>\n                <li><button onclick=', '><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list_3.png"/> My Drive</button></li>\n                <li><button><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_shared_collection_list_1.png"/> Shared with me</button></li>\n                <li><button onclick=', '>Logout</button></li>\n              </ul>\n            </div>\n            <div class="col-md-12 col-lg-9 col-xl-6">\n              <div class="UppyGoogleDrive-browserContainer">\n                <table class="UppyGoogleDrive-browser">\n                  <thead>\n                    <tr>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Name</td>\n                      <td>Owner</td>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Last Modified</td>\n                      <td>Filesize</td>\n                    </tr>\n                  </thead>\n                  <tbody>\n                    ', '\n                    ', '\n                  </tbody>\n                </table>\n              </div>\n            </div>\n            <div class="hidden-lg-down col-xl-2">\n              <div class="UppyGoogleDrive-fileInfo">\n                ', '\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    '], ['\n      <div>\n        <div class="UppyGoogleDrive-header">\n          <ul class="UppyGoogleDrive-breadcrumbs">\n            ', '\n          </ul>\n        </div>\n        <div class="container-fluid">\n          <div class="row">\n            <div class="hidden-md-down col-lg-3 col-xl-3">\n              <ul class="UppyGoogleDrive-sidebar">\n                <li class="UppyGoogleDrive-filter"><input class="UppyGoogleDrive-focusInput" type=\'text\' onkeyup=', ' placeholder="Search.." value=', '/></li>\n                <li><button onclick=', '><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_collection_list_3.png"/> My Drive</button></li>\n                <li><button><img src="https://ssl.gstatic.com/docs/doclist/images/icon_11_shared_collection_list_1.png"/> Shared with me</button></li>\n                <li><button onclick=', '>Logout</button></li>\n              </ul>\n            </div>\n            <div class="col-md-12 col-lg-9 col-xl-6">\n              <div class="UppyGoogleDrive-browserContainer">\n                <table class="UppyGoogleDrive-browser">\n                  <thead>\n                    <tr>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Name</td>\n                      <td>Owner</td>\n                      <td class="UppyGoogleDrive-sortableHeader" onclick=', '>Last Modified</td>\n                      <td>Filesize</td>\n                    </tr>\n                  </thead>\n                  <tbody>\n                    ', '\n                    ', '\n                  </tbody>\n                </table>\n              </div>\n            </div>\n            <div class="hidden-lg-down col-xl-2">\n              <div class="UppyGoogleDrive-fileInfo">\n                ', '\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    ']),
    _templateObject8 = _taggedTemplateLiteralLoose(['\n      <tr class=', '\n        onclick=', '\n        ondblclick=', '>\n        <td><span class="UppyGoogleDrive-folderIcon"><img src=', '/></span> ', '</td>\n        <td>Me</td>\n        <td>', '</td>\n        <td>-</td>\n      </tr>\n    '], ['\n      <tr class=', '\n        onclick=', '\n        ondblclick=', '>\n        <td><span class="UppyGoogleDrive-folderIcon"><img src=', '/></span> ', '</td>\n        <td>Me</td>\n        <td>', '</td>\n        <td>-</td>\n      </tr>\n    ']),
    _templateObject9 = _taggedTemplateLiteralLoose(['\n      <div>\n        <span>\n          Something went wrong.  Probably our fault. ', '\n        </span>\n      </div>\n    '], ['\n      <div>\n        <span>\n          Something went wrong.  Probably our fault. ', '\n        </span>\n      </div>\n    ']);

var _Utils = require('../core/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _Plugin2 = require('./Plugin');

var _Plugin3 = _interopRequireDefault(_Plugin2);

require('whatwg-fetch');

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteralLoose(strings, raw) { strings.raw = raw; return strings; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Google = function (_Plugin) {
  _inherits(Google, _Plugin);

  function Google(core, opts) {
    _classCallCheck(this, Google);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, core, opts));

    _this.type = 'acquirer';
    _this.id = 'GoogleDrive';
    _this.title = 'Google Drive';
    _this.icon = (0, _yoYo2.default)(_templateObject);

    _this.files = [];

    // Logic
    _this.addFile = _this.addFile.bind(_this);
    _this.getFolder = _this.getFolder.bind(_this);
    _this.handleClick = _this.handleClick.bind(_this);
    _this.logout = _this.logout.bind(_this);

    // Visual
    _this.renderBrowserItem = _this.renderBrowserItem.bind(_this);
    _this.filterItems = _this.filterItems.bind(_this);
    _this.filterQuery = _this.filterQuery.bind(_this);
    _this.renderAuth = _this.renderAuth.bind(_this);
    _this.renderBrowser = _this.renderBrowser.bind(_this);
    _this.sortByTitle = _this.sortByTitle.bind(_this);
    _this.sortByDate = _this.sortByDate.bind(_this);
    _this.render = _this.render.bind(_this);

    // set default options
    var defaultOptions = {};

    // merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);

    var host = _this.opts.host.replace(/^https?:\/\//, '');

    _this.socket = _this.core.initSocket({
      target: 'ws://' + host + '/'
    });

    _this.socket.on('google.auth.pass', function () {
      console.log('google.auth.pass');
      _this.getFolder(_this.core.getState().googleDrive.directory.id);
    });

    _this.socket.on('uppy.debug', function (payload) {
      console.log('GOOGLE DEBUG:');
      console.log(payload);
    });

    _this.socket.on('google.list.ok', function (data) {
      console.log('google.list.ok');
      var folders = [];
      var files = [];
      data.items.forEach(function (item) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          folders.push(item);
        } else {
          files.push(item);
        }
      });

      _this.updateState({
        folders: folders,
        files: files,
        authenticated: true
      });
    });

    _this.socket.on('google.list.fail', function (data) {
      console.log('google.list.fail');
      console.log(data);
    });

    _this.socket.on('google.auth.fail', function () {
      console.log('google.auth.fail');
      _this.updateState({
        authenticated: false
      });
    });
    return _this;
  }

  Google.prototype.install = function install() {
    var _this2 = this;

    // Set default state for Google Drive
    this.core.setState({
      googleDrive: {
        authenticated: false,
        files: [],
        folders: [],
        directory: [{
          title: 'My Drive',
          id: 'root'
        }],
        active: {},
        filterInput: ''
      }
    });

    var target = this.opts.target;
    var plugin = this;
    this.target = this.mount(target, plugin);

    this.checkAuthentication().then(function (authenticated) {
      _this2.updateState({ authenticated: authenticated });

      if (authenticated) {
        return _this2.getFolder(_this2.core.getState().googleDrive.directory.id);
      }

      return authenticated;
    }).then(function (newState) {
      _this2.updateState(newState);
    });

    return;
  };

  Google.prototype.focus = function focus() {
    var firstInput = document.querySelector(this.target + ' .UppyGoogleDrive-focusInput');

    // only works for the first time if wrapped in setTimeout for some reason
    // firstInput.focus()
    setTimeout(function () {
      firstInput.focus();
    }, 10);
  };

  /**
   * Little shorthand to update the state with my new state
   */


  Google.prototype.updateState = function updateState(newState) {
    var state = this.core.state;

    var googleDrive = _extends({}, state.googleDrive, newState);

    this.core.setState({ googleDrive: googleDrive });
  };

  /**
   * Check to see if the user is authenticated.
   * @return {Promise} authentication status
   */


  Google.prototype.checkAuthentication = function checkAuthentication() {
    var _this3 = this;

    return fetch(this.opts.host + '/google/authorize', {
      method: 'get',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(function (res) {
      if (res.status >= 200 && res.status <= 300) {
        return res.json();
      } else {
        _this3.updateState({
          authenticated: false,
          error: true
        });
        var error = new Error(res.statusText);
        error.response = res;
        throw error;
      }
    }).then(function (data) {
      return data.isAuthenticated;
    }).catch(function (err) {
      return err;
    });
  };

  /**
   * Based on folder ID, fetch a new folder
   * @param  {String} id Folder id
   * @return {Promise}   Folders/files in folder
   */


  Google.prototype.getFolder = function getFolder() {
    var _this4 = this;

    var id = arguments.length <= 0 || arguments[0] === undefined ? 'root' : arguments[0];

    return fetch(this.opts.host + '/google/list?dir=' + id, {
      method: 'get',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(function (res) {
      if (res.status >= 200 && res.status <= 300) {
        return res.json().then(function (data) {
          // let result = Utils.groupBy(data.items, (item) => item.mimeType)
          var folders = [];
          var files = [];
          data.items.forEach(function (item) {
            if (item.mimeType === 'application/vnd.google-apps.folder') {
              folders.push(item);
            } else {
              files.push(item);
            }
          });
          return {
            folders: folders,
            files: files
          };
        });
      } else {
        _this4.handleError(res);
        var error = new Error(res.statusText);
        error.response = res;
        throw error;
      }
    }).catch(function (err) {
      return err;
    });
  };

  /**
   * Fetches new folder and adds to breadcrumb nav
   * @param  {String} id    Folder id
   * @param  {String} title Folder title
   */


  Google.prototype.getNextFolder = function getNextFolder(id, title) {
    var _this5 = this;

    this.getFolder(id).then(function (data) {
      var state = _this5.core.getState().googleDrive;

      var index = state.directory.findIndex(function (dir) {
        return id === dir.id;
      });
      var directory = void 0;

      if (index !== -1) {
        directory = state.directory.slice(0, index + 1);
      } else {
        directory = state.directory.concat([{
          id: id,
          title: title
        }]);
      }

      _this5.updateState(_Utils2.default.extend(data, { directory: directory }));
    });
  };

  Google.prototype.addFile = function addFile(file) {
    var tagFile = {
      source: this,
      data: file,
      name: file.title,
      type: this.getFileType(file),
      remote: {
        action: 'google.get',
        payload: {
          id: file.id
        }
      }
    };

    this.core.emitter.emit('file-add', tagFile);
  };

  Google.prototype.handleError = function handleError(response) {
    var _this6 = this;

    this.checkAuthentication().then(function (authenticated) {
      _this6.updateState({ authenticated: authenticated });
    });
  };

  /**
   * Removes session token on client side.
   */


  Google.prototype.logout = function logout() {
    var _this7 = this;

    fetch(this.opts.host + '/google/logout?redirect=' + location.href, {
      method: 'get',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(function (res) {
      return res.json();
    }).then(function (res) {
      if (res.ok) {
        console.log('ok');
        var newState = {
          authenticated: false,
          files: [],
          folders: [],
          directory: [{
            title: 'My Drive',
            id: 'root'
          }]
        };

        _this7.updateState(newState);
      }
    });
  };

  Google.prototype.getFileType = function getFileType(file) {
    var fileTypes = {
      'application/vnd.google-apps.folder': 'Folder',
      'application/vnd.google-apps.document': 'Google Docs',
      'application/vnd.google-apps.spreadsheet': 'Google Sheets',
      'application/vnd.google-apps.presentation': 'Google Slides',
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image'
    };

    return fileTypes[file.mimeType] ? fileTypes[file.mimeType] : file.fileExtension.toUpperCase();
  };

  /**
   * Used to set active file/folder.
   * @param  {Object} file   Active file/folder
   */


  Google.prototype.handleClick = function handleClick(file) {
    var state = this.core.getState().googleDrive;
    var newState = _extends({}, state, {
      active: file
    });

    this.updateState(newState);
  };

  Google.prototype.filterQuery = function filterQuery(e) {
    var state = this.core.getState().googleDrive;
    this.updateState(_extends({}, state, {
      filterInput: e.target.value
    }));
  };

  Google.prototype.filterItems = function filterItems(items) {
    var state = this.core.getState().googleDrive;
    return items.filter(function (folder) {
      return folder.title.toLowerCase().indexOf(state.filterInput.toLowerCase()) !== -1;
    });
  };

  Google.prototype.sortByTitle = function sortByTitle() {
    var state = this.core.getState().googleDrive;
    var files = state.files;
    var folders = state.folders;
    var sorting = state.sorting;


    var sortedFiles = files.sort(function (fileA, fileB) {
      if (sorting === 'titleDescending') {
        return fileB.title.localeCompare(fileA.title);
      }
      return fileA.title.localeCompare(fileB.title);
    });

    var sortedFolders = folders.sort(function (folderA, folderB) {
      if (sorting === 'titleDescending') {
        return folderB.title.localeCompare(folderA.title);
      }
      return folderA.title.localeCompare(folderB.title);
    });

    this.updateState(_extends({}, state, {
      files: sortedFiles,
      folders: sortedFolders,
      sorting: sorting === 'titleDescending' ? 'titleAscending' : 'titleDescending'
    }));
  };

  Google.prototype.sortByDate = function sortByDate() {
    var state = this.core.getState().googleDrive;
    var files = state.files;
    var folders = state.folders;
    var sorting = state.sorting;


    var sortedFiles = files.sort(function (fileA, fileB) {
      var a = new Date(fileA.modifiedByMeDate);
      var b = new Date(fileB.modifiedByMeDate);

      if (sorting === 'dateDescending') {
        return a > b ? -1 : a < b ? 1 : 0;
      }
      return a > b ? 1 : a < b ? -1 : 0;
    });

    var sortedFolders = folders.sort(function (folderA, folderB) {
      var a = new Date(folderA.modifiedByMeDate);
      var b = new Date(folderB.modifiedByMeDate);

      if (sorting === 'dateDescending') {
        return a > b ? -1 : a < b ? 1 : 0;
      }

      return a > b ? 1 : a < b ? -1 : 0;
    });

    this.updateState(_extends({}, state, {
      files: sortedFiles,
      folders: sortedFolders,
      sorting: sorting === 'dateDescending' ? 'dateAscending' : 'dateDescending'
    }));
  };

  /**
   * Render user authentication view
   */


  Google.prototype.renderAuth = function renderAuth() {
    var state = btoa(JSON.stringify({
      redirect: location.href.split('#')[0]
    }));

    var link = this.opts.host + '/connect/google?state=' + state;
    return (0, _yoYo2.default)(_templateObject2, link);
  };

  /**
   * Render file browser
   * @param  {Object} state Google Drive state
   */


  Google.prototype.renderBrowser = function renderBrowser(state) {
    var _this8 = this;

    var folders = state.folders;
    var files = state.files;
    var previewElem = '';
    var isFileSelected = Object.keys(state.active).length !== 0 && JSON.stringify(state.active) !== JSON.stringify({});

    if (state.filterInput !== '') {
      folders = this.filterItems(state.folders);
      files = this.filterItems(state.files);
    }

    folders = folders.map(function (folder) {
      return _this8.renderBrowserItem(folder);
    });
    files = files.map(function (file) {
      return _this8.renderBrowserItem(file);
    });

    var breadcrumbs = state.directory.map(function (dir) {
      return (0, _yoYo2.default)(_templateObject3, _this8.getNextFolder.bind(_this8, dir.id, dir.title), dir.title);
    });
    if (isFileSelected) {
      previewElem = (0, _yoYo2.default)(_templateObject4, state.active.iconLink, state.active.title, this.getFileType(state.active), state.active.modifiedByMeDate, state.active.thumbnailLink ? (0, _yoYo2.default)(_templateObject5, state.active.thumbnailLink) : (0, _yoYo2.default)(_templateObject6));
    }

    return (0, _yoYo2.default)(_templateObject7, breadcrumbs, this.filterQuery, state.filterInput, this.getNextFolder.bind(this, 'root', 'My Drive'), this.logout, this.sortByTitle, this.sortByDate, folders, files, previewElem);
  };

  Google.prototype.renderBrowserItem = function renderBrowserItem(item) {
    var state = this.core.getState().googleDrive;
    var isAFileSelected = Object.keys(state.active).length !== 0 && JSON.stringify(state.active) !== JSON.stringify({});
    var isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    return (0, _yoYo2.default)(_templateObject8, isAFileSelected && state.active.id === item.id ? 'is-active' : '', this.handleClick.bind(this, item), isFolder ? this.getNextFolder.bind(this, item.id, item.title) : this.addFile.bind(this, item), item.iconLink, item.title, item.modifiedByMeDate);
  };

  Google.prototype.renderError = function renderError(err) {
    return (0, _yoYo2.default)(_templateObject9, err);
  };

  Google.prototype.render = function render(state) {
    if (state.googleDrive.error) {
      return this.renderError();
    }

    if (!state.googleDrive.authenticated) {
      return this.renderAuth();
    }

    return this.renderBrowser(state.googleDrive);
  };

  return Google;
}(_Plugin3.default);

exports.default = Google;

},{"../core/Utils":16,"./Plugin":19,"whatwg-fetch":3,"yo-yo":4}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Boilerplate that all Plugins share - and should not be used
 * directly. It also shows which methods final plugins should implement/override,
 * this deciding on structure.
 *
 * @param {object} main Uppy core object
 * @param {object} object with plugin options
 * @return {array | string} files or success/fail message
 */

var Plugin = function () {
  function Plugin(core, opts) {
    _classCallCheck(this, Plugin);

    this.core = core;
    this.opts = opts;
    this.type = 'none';

    this.update = this.update.bind(this);
    this.mount = this.mount.bind(this);
    this.focus = this.focus.bind(this);
    this.install = this.install.bind(this);
  }

  Plugin.prototype.update = function update() {
    if (typeof this.el === 'undefined') {
      return;
    }

    var newEl = this.render(this.core.state);
    _yoYo2.default.update(this.el, newEl);
  };

  /**
   * Check if supplied `target` is a `string` or an `object`.
   * If it’s an object — target is a plugin, and we search `plugins`
   * for a plugin with same name and return its target.
   *
   * @param {String|Object} target
   *
   */


  Plugin.prototype.mount = function mount(target, plugin) {
    var callerPluginName = plugin.id;

    if (typeof target === 'string') {
      this.core.log('Installing ' + callerPluginName + ' to ' + target);

      // clear everything inside the target selector
      // if (replaceTargetContent) {
      //   document.querySelector(target).innerHTML = ''
      // }
      this.el = plugin.render(this.core.state);
      document.querySelector(target).appendChild(this.el);

      return target;
    } else {
      // TODO: is instantiating the plugin really the way to roll
      // just to get the plugin name?
      var Target = target;
      var targetPluginName = new Target().id;

      this.core.log('Installing ' + callerPluginName + ' to ' + targetPluginName);

      var targetPlugin = this.core.getPlugin(targetPluginName);
      var selectorTarget = targetPlugin.addTarget(plugin);

      return selectorTarget;
    }
  };

  Plugin.prototype.focus = function focus() {
    return;
  };

  Plugin.prototype.install = function install() {
    return;
  };

  Plugin.prototype.run = function run() {
    return;
  };

  return Plugin;
}();

exports.default = Plugin;

},{"yo-yo":4}],20:[function(require,module,exports){

},{}],21:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],22:[function(require,module,exports){
'use strict';

var _Core = require('../../../../src/core/Core.js');

var _Core2 = _interopRequireDefault(_Core);

var _GoogleDrive = require('../../../../src/plugins/GoogleDrive.js');

var _GoogleDrive2 = _interopRequireDefault(_GoogleDrive);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uppy = new _Core2.default({ wait: false });
uppy.use(_GoogleDrive2.default, { selector: '#target' }).run();

var drop = new _GoogleDrive2.default();

console.log(uppy.type);
console.dir(drop);

},{"../../../../src/core/Core.js":13,"../../../../src/plugins/GoogleDrive.js":18}]},{},[22])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvcHJldHR5LWJ5dGVzL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3ByZXR0eS1ieXRlcy9ub2RlX21vZHVsZXMvbnVtYmVyLWlzLW5hbi9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy93aGF0d2ctZmV0Y2gvZmV0Y2guanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9nbG9iYWwvZG9jdW1lbnQuanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvaHlwZXJ4L25vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHkvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vbm9kZV9tb2R1bGVzL2JlbC9ub2RlX21vZHVsZXMvb24tbG9hZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvbW9ycGhkb20vbGliL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3lvLXlvL3VwZGF0ZS1ldmVudHMuanMiLCIuLi9zcmMvY29yZS9Db3JlLmpzIiwiLi4vc3JjL2NvcmUvVHJhbnNsYXRvci5qcyIsIi4uL3NyYy9jb3JlL1VwcHlTb2NrZXQuanMiLCIuLi9zcmMvY29yZS9VdGlscy5qcyIsIi4uL3NyYy9sb2NhbGVzL2VuX1VTLmpzIiwiLi4vc3JjL3BsdWdpbnMvR29vZ2xlRHJpdmUuanMiLCIuLi9zcmMvcGx1Z2lucy9QbHVnaW4uanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJzcmMvZXhhbXBsZXMvZHJvcGJveC9hcHAuZXM2Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxU0E7Ozs7QUFDQTs7Ozs7O0FBRUEsSUFBTSxPQUFPLG1CQUFTLEVBQUMsTUFBTSxLQUFQLEVBQVQsQ0FBYjtBQUNBLEtBQ0csR0FESCx3QkFDZ0IsRUFBQyxVQUFVLFNBQVgsRUFEaEIsRUFFRyxHQUZIOztBQUlBLElBQU0sT0FBTywyQkFBYjs7QUFFQSxRQUFRLEdBQVIsQ0FBWSxLQUFLLElBQWpCO0FBQ0EsUUFBUSxHQUFSLENBQVksSUFBWiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG52YXIgbnVtYmVySXNOYW4gPSByZXF1aXJlKCdudW1iZXItaXMtbmFuJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG51bSkge1xuXHRpZiAodHlwZW9mIG51bSAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYW4obnVtKSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgbnVtYmVyLCBnb3QgJyArIHR5cGVvZiBudW0pO1xuXHR9XG5cblx0dmFyIGV4cG9uZW50O1xuXHR2YXIgdW5pdDtcblx0dmFyIG5lZyA9IG51bSA8IDA7XG5cdHZhciB1bml0cyA9IFsnQicsICdrQicsICdNQicsICdHQicsICdUQicsICdQQicsICdFQicsICdaQicsICdZQiddO1xuXG5cdGlmIChuZWcpIHtcblx0XHRudW0gPSAtbnVtO1xuXHR9XG5cblx0aWYgKG51bSA8IDEpIHtcblx0XHRyZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bSArICcgQic7XG5cdH1cblxuXHRleHBvbmVudCA9IE1hdGgubWluKE1hdGguZmxvb3IoTWF0aC5sb2cobnVtKSAvIE1hdGgubG9nKDEwMDApKSwgdW5pdHMubGVuZ3RoIC0gMSk7XG5cdG51bSA9IE51bWJlcigobnVtIC8gTWF0aC5wb3coMTAwMCwgZXhwb25lbnQpKS50b0ZpeGVkKDIpKTtcblx0dW5pdCA9IHVuaXRzW2V4cG9uZW50XTtcblxuXHRyZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bSArICcgJyArIHVuaXQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gKHgpIHtcblx0cmV0dXJuIHggIT09IHg7XG59O1xuIiwiKGZ1bmN0aW9uKHNlbGYpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBzZWFyY2hQYXJhbXM6ICdVUkxTZWFyY2hQYXJhbXMnIGluIHNlbGYsXG4gICAgaXRlcmFibGU6ICdTeW1ib2wnIGluIHNlbGYgJiYgJ2l0ZXJhdG9yJyBpbiBTeW1ib2wsXG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZixcbiAgICBhcnJheUJ1ZmZlcjogJ0FycmF5QnVmZmVyJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gU3RyaW5nKG5hbWUpXG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IFN0cmluZyh2YWx1ZSlcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICAvLyBCdWlsZCBhIGRlc3RydWN0aXZlIGl0ZXJhdG9yIGZvciB0aGUgdmFsdWUgbGlzdFxuICBmdW5jdGlvbiBpdGVyYXRvckZvcihpdGVtcykge1xuICAgIHZhciBpdGVyYXRvciA9IHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBpdGVtcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiB7ZG9uZTogdmFsdWUgPT09IHVuZGVmaW5lZCwgdmFsdWU6IHZhbHVlfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgICBpdGVyYXRvcltTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvclxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVyYXRvclxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICB9LCB0aGlzKVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0sIHRoaXMpXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHRoaXMubWFwW25hbWVdLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB2YWx1ZSwgbmFtZSwgdGhpcylcbiAgICAgIH0sIHRoaXMpXG4gICAgfSwgdGhpcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKG5hbWUpIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHsgaXRlbXMucHVzaCh2YWx1ZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGl0ZW1zID0gW11cbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24odmFsdWUsIG5hbWUpIHsgaXRlbXMucHVzaChbbmFtZSwgdmFsdWVdKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIGlmIChzdXBwb3J0Lml0ZXJhYmxlKSB7XG4gICAgSGVhZGVycy5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXNcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmFycmF5QnVmZmVyICYmIEFycmF5QnVmZmVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgIC8vIE9ubHkgc3VwcG9ydCBBcnJheUJ1ZmZlcnMgZm9yIFBPU1QgbWV0aG9kLlxuICAgICAgICAvLyBSZWNlaXZpbmcgQXJyYXlCdWZmZXJzIGhhcHBlbnMgdmlhIEJsb2JzLCBpbnN0ZWFkLlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSkge1xuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ3RleHQvcGxhaW47Y2hhcnNldD1VVEYtOCcpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUJsb2IgJiYgdGhpcy5fYm9keUJsb2IudHlwZSkge1xuICAgICAgICAgIHRoaXMuaGVhZGVycy5zZXQoJ2NvbnRlbnQtdHlwZScsIHRoaXMuX2JvZHlCbG9iLnR5cGUpXG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5zZWFyY2hQYXJhbXMgJiYgVVJMU2VhcmNoUGFyYW1zLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHZhciBib2R5ID0gb3B0aW9ucy5ib2R5XG4gICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpKSB7XG4gICAgICBpZiAoaW5wdXQuYm9keVVzZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJylcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gaW5wdXQudXJsXG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gaW5wdXQuY3JlZGVudGlhbHNcbiAgICAgIGlmICghb3B0aW9ucy5oZWFkZXJzKSB7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKGlucHV0LmhlYWRlcnMpXG4gICAgICB9XG4gICAgICB0aGlzLm1ldGhvZCA9IGlucHV0Lm1ldGhvZFxuICAgICAgdGhpcy5tb2RlID0gaW5wdXQubW9kZVxuICAgICAgaWYgKCFib2R5KSB7XG4gICAgICAgIGJvZHkgPSBpbnB1dC5fYm9keUluaXRcbiAgICAgICAgaW5wdXQuYm9keVVzZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXJsID0gaW5wdXRcbiAgICB9XG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCB0aGlzLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIGlmIChvcHRpb25zLmhlYWRlcnMgfHwgIXRoaXMuaGVhZGVycykge1xuICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIH1cbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCB0aGlzLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgdGhpcy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShib2R5KVxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodGhpcylcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gaGVhZGVycyh4aHIpIHtcbiAgICB2YXIgaGVhZCA9IG5ldyBIZWFkZXJzKClcbiAgICB2YXIgcGFpcnMgPSAoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpIHx8ICcnKS50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgcGFpcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgIHZhciBzcGxpdCA9IGhlYWRlci50cmltKCkuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHNwbGl0LnNoaWZ0KCkudHJpbSgpXG4gICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc6JykudHJpbSgpXG4gICAgICBoZWFkLmFwcGVuZChrZXksIHZhbHVlKVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICB0aGlzLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzID8gb3B0aW9ucy5oZWFkZXJzIDogbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgUmVzcG9uc2UucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZSh0aGlzLl9ib2R5SW5pdCwge1xuICAgICAgc3RhdHVzOiB0aGlzLnN0YXR1cyxcbiAgICAgIHN0YXR1c1RleHQ6IHRoaXMuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHRoaXMuaGVhZGVycyksXG4gICAgICB1cmw6IHRoaXMudXJsXG4gICAgfSlcbiAgfVxuXG4gIFJlc3BvbnNlLmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IDAsIHN0YXR1c1RleHQ6ICcnfSlcbiAgICByZXNwb25zZS50eXBlID0gJ2Vycm9yJ1xuICAgIHJldHVybiByZXNwb25zZVxuICB9XG5cbiAgdmFyIHJlZGlyZWN0U3RhdHVzZXMgPSBbMzAxLCAzMDIsIDMwMywgMzA3LCAzMDhdXG5cbiAgUmVzcG9uc2UucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHN0YXR1cykge1xuICAgIGlmIChyZWRpcmVjdFN0YXR1c2VzLmluZGV4T2Yoc3RhdHVzKSA9PT0gLTEpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHN0YXR1cyBjb2RlJylcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtzdGF0dXM6IHN0YXR1cywgaGVhZGVyczoge2xvY2F0aW9uOiB1cmx9fSlcbiAgfVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnNcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdFxuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2VcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24oaW5wdXQsIGluaXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgcmVxdWVzdFxuICAgICAgaWYgKFJlcXVlc3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoaW5wdXQpICYmICFpbml0KSB7XG4gICAgICAgIHJlcXVlc3QgPSBpbnB1dFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGlucHV0LCBpbml0KVxuICAgICAgfVxuXG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMoeGhyKSxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlVVJMKClcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC51cmwsIHRydWUpXG5cbiAgICAgIGlmIChyZXF1ZXN0LmNyZWRlbnRpYWxzID09PSAnaW5jbHVkZScpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWVcbiAgICAgIH1cblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0LmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiByZXF1ZXN0Ll9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogcmVxdWVzdC5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuIiwidmFyIGJlbCA9IHJlcXVpcmUoJ2JlbCcpIC8vIHR1cm5zIHRlbXBsYXRlIHRhZyBpbnRvIERPTSBlbGVtZW50c1xudmFyIG1vcnBoZG9tID0gcmVxdWlyZSgnbW9ycGhkb20nKSAvLyBlZmZpY2llbnRseSBkaWZmcyArIG1vcnBocyB0d28gRE9NIGVsZW1lbnRzXG52YXIgZGVmYXVsdEV2ZW50cyA9IHJlcXVpcmUoJy4vdXBkYXRlLWV2ZW50cy5qcycpIC8vIGRlZmF1bHQgZXZlbnRzIHRvIGJlIGNvcGllZCB3aGVuIGRvbSBlbGVtZW50cyB1cGRhdGVcblxubW9kdWxlLmV4cG9ydHMgPSBiZWxcblxuLy8gVE9ETyBtb3ZlIHRoaXMgKyBkZWZhdWx0RXZlbnRzIHRvIGEgbmV3IG1vZHVsZSBvbmNlIHdlIHJlY2VpdmUgbW9yZSBmZWVkYmFja1xubW9kdWxlLmV4cG9ydHMudXBkYXRlID0gZnVuY3Rpb24gKGZyb21Ob2RlLCB0b05vZGUsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge31cbiAgaWYgKG9wdHMuZXZlbnRzICE9PSBmYWxzZSkge1xuICAgIGlmICghb3B0cy5vbkJlZm9yZU1vcnBoRWwpIG9wdHMub25CZWZvcmVNb3JwaEVsID0gY29waWVyXG4gIH1cblxuICByZXR1cm4gbW9ycGhkb20oZnJvbU5vZGUsIHRvTm9kZSwgb3B0cylcblxuICAvLyBtb3JwaGRvbSBvbmx5IGNvcGllcyBhdHRyaWJ1dGVzLiB3ZSBkZWNpZGVkIHdlIGFsc28gd2FudGVkIHRvIGNvcHkgZXZlbnRzXG4gIC8vIHRoYXQgY2FuIGJlIHNldCB2aWEgYXR0cmlidXRlc1xuICBmdW5jdGlvbiBjb3BpZXIgKGYsIHQpIHtcbiAgICAvLyBjb3B5IGV2ZW50czpcbiAgICB2YXIgZXZlbnRzID0gb3B0cy5ldmVudHMgfHwgZGVmYXVsdEV2ZW50c1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZXYgPSBldmVudHNbaV1cbiAgICAgIGlmICh0W2V2XSkgeyAvLyBpZiBuZXcgZWxlbWVudCBoYXMgYSB3aGl0ZWxpc3RlZCBhdHRyaWJ1dGVcbiAgICAgICAgZltldl0gPSB0W2V2XSAvLyB1cGRhdGUgZXhpc3RpbmcgZWxlbWVudFxuICAgICAgfSBlbHNlIGlmIChmW2V2XSkgeyAvLyBpZiBleGlzdGluZyBlbGVtZW50IGhhcyBpdCBhbmQgbmV3IG9uZSBkb2VzbnRcbiAgICAgICAgZltldl0gPSB1bmRlZmluZWQgLy8gcmVtb3ZlIGl0IGZyb20gZXhpc3RpbmcgZWxlbWVudFxuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb3B5IHZhbHVlcyBmb3IgZm9ybSBlbGVtZW50c1xuICAgIGlmICgoZi5ub2RlTmFtZSA9PT0gJ0lOUFVUJyAmJiBmLnR5cGUgIT09ICdmaWxlJykgfHwgZi5ub2RlTmFtZSA9PT0gJ1RFWFRBUkVBJyB8fCBmLm5vZGVOYW1lID09PSAnU0VMRUNUJykge1xuICAgICAgaWYgKHQuZ2V0QXR0cmlidXRlKCd2YWx1ZScpID09PSBudWxsKSB0LnZhbHVlID0gZi52YWx1ZVxuICAgIH1cbiAgfVxufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZSgnZ2xvYmFsL2RvY3VtZW50JylcbnZhciBoeXBlcnggPSByZXF1aXJlKCdoeXBlcngnKVxudmFyIG9ubG9hZCA9IHJlcXVpcmUoJ29uLWxvYWQnKVxuXG52YXIgU1ZHTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnXG52YXIgQk9PTF9QUk9QUyA9IHtcbiAgYXV0b2ZvY3VzOiAxLFxuICBjaGVja2VkOiAxLFxuICBkZWZhdWx0Y2hlY2tlZDogMSxcbiAgZGlzYWJsZWQ6IDEsXG4gIGZvcm1ub3ZhbGlkYXRlOiAxLFxuICBpbmRldGVybWluYXRlOiAxLFxuICByZWFkb25seTogMSxcbiAgcmVxdWlyZWQ6IDEsXG4gIHNlbGVjdGVkOiAxLFxuICB3aWxsdmFsaWRhdGU6IDFcbn1cbnZhciBTVkdfVEFHUyA9IFtcbiAgJ3N2ZycsXG4gICdhbHRHbHlwaCcsICdhbHRHbHlwaERlZicsICdhbHRHbHlwaEl0ZW0nLCAnYW5pbWF0ZScsICdhbmltYXRlQ29sb3InLFxuICAnYW5pbWF0ZU1vdGlvbicsICdhbmltYXRlVHJhbnNmb3JtJywgJ2NpcmNsZScsICdjbGlwUGF0aCcsICdjb2xvci1wcm9maWxlJyxcbiAgJ2N1cnNvcicsICdkZWZzJywgJ2Rlc2MnLCAnZWxsaXBzZScsICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLFxuICAnZmVDb21wb25lbnRUcmFuc2ZlcicsICdmZUNvbXBvc2l0ZScsICdmZUNvbnZvbHZlTWF0cml4JywgJ2ZlRGlmZnVzZUxpZ2h0aW5nJyxcbiAgJ2ZlRGlzcGxhY2VtZW50TWFwJywgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRmxvb2QnLCAnZmVGdW5jQScsICdmZUZ1bmNCJyxcbiAgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJywgJ2ZlTWVyZ2UnLCAnZmVNZXJnZU5vZGUnLFxuICAnZmVNb3JwaG9sb2d5JywgJ2ZlT2Zmc2V0JywgJ2ZlUG9pbnRMaWdodCcsICdmZVNwZWN1bGFyTGlnaHRpbmcnLFxuICAnZmVTcG90TGlnaHQnLCAnZmVUaWxlJywgJ2ZlVHVyYnVsZW5jZScsICdmaWx0ZXInLCAnZm9udCcsICdmb250LWZhY2UnLFxuICAnZm9udC1mYWNlLWZvcm1hdCcsICdmb250LWZhY2UtbmFtZScsICdmb250LWZhY2Utc3JjJywgJ2ZvbnQtZmFjZS11cmknLFxuICAnZm9yZWlnbk9iamVjdCcsICdnJywgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJywgJ2xpbmUnLFxuICAnbGluZWFyR3JhZGllbnQnLCAnbWFya2VyJywgJ21hc2snLCAnbWV0YWRhdGEnLCAnbWlzc2luZy1nbHlwaCcsICdtcGF0aCcsXG4gICdwYXRoJywgJ3BhdHRlcm4nLCAncG9seWdvbicsICdwb2x5bGluZScsICdyYWRpYWxHcmFkaWVudCcsICdyZWN0JyxcbiAgJ3NldCcsICdzdG9wJywgJ3N3aXRjaCcsICdzeW1ib2wnLCAndGV4dCcsICd0ZXh0UGF0aCcsICd0aXRsZScsICd0cmVmJyxcbiAgJ3RzcGFuJywgJ3VzZScsICd2aWV3JywgJ3ZrZXJuJ1xuXVxuXG5mdW5jdGlvbiBiZWxDcmVhdGVFbGVtZW50ICh0YWcsIHByb3BzLCBjaGlsZHJlbikge1xuICB2YXIgZWxcblxuICAvLyBJZiBhbiBzdmcgdGFnLCBpdCBuZWVkcyBhIG5hbWVzcGFjZVxuICBpZiAoU1ZHX1RBR1MuaW5kZXhPZih0YWcpICE9PSAtMSkge1xuICAgIHByb3BzLm5hbWVzcGFjZSA9IFNWR05TXG4gIH1cblxuICAvLyBJZiB3ZSBhcmUgdXNpbmcgYSBuYW1lc3BhY2VcbiAgdmFyIG5zID0gZmFsc2VcbiAgaWYgKHByb3BzLm5hbWVzcGFjZSkge1xuICAgIG5zID0gcHJvcHMubmFtZXNwYWNlXG4gICAgZGVsZXRlIHByb3BzLm5hbWVzcGFjZVxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBlbGVtZW50XG4gIGlmIChucykge1xuICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5zLCB0YWcpXG4gIH0gZWxzZSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZylcbiAgfVxuXG4gIC8vIElmIGFkZGluZyBvbmxvYWQgZXZlbnRzXG4gIGlmIChwcm9wcy5vbmxvYWQgfHwgcHJvcHMub251bmxvYWQpIHtcbiAgICB2YXIgbG9hZCA9IHByb3BzLm9ubG9hZCB8fCBmdW5jdGlvbiAoKSB7fVxuICAgIHZhciB1bmxvYWQgPSBwcm9wcy5vbnVubG9hZCB8fCBmdW5jdGlvbiAoKSB7fVxuICAgIG9ubG9hZChlbCwgZnVuY3Rpb24gYmVsX29ubG9hZCAoKSB7XG4gICAgICBsb2FkKGVsKVxuICAgIH0sIGZ1bmN0aW9uIGJlbF9vbnVubG9hZCAoKSB7XG4gICAgICB1bmxvYWQoZWwpXG4gICAgfSxcbiAgICAvLyBXZSBoYXZlIHRvIHVzZSBub24tc3RhbmRhcmQgYGNhbGxlcmAgdG8gZmluZCB3aG8gaW52b2tlcyBgYmVsQ3JlYXRlRWxlbWVudGBcbiAgICBiZWxDcmVhdGVFbGVtZW50LmNhbGxlci5jYWxsZXIuY2FsbGVyKVxuICAgIGRlbGV0ZSBwcm9wcy5vbmxvYWRcbiAgICBkZWxldGUgcHJvcHMub251bmxvYWRcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgcHJvcGVydGllc1xuICBmb3IgKHZhciBwIGluIHByb3BzKSB7XG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICB2YXIga2V5ID0gcC50b0xvd2VyQ2FzZSgpXG4gICAgICB2YXIgdmFsID0gcHJvcHNbcF1cbiAgICAgIC8vIE5vcm1hbGl6ZSBjbGFzc05hbWVcbiAgICAgIGlmIChrZXkgPT09ICdjbGFzc25hbWUnKSB7XG4gICAgICAgIGtleSA9ICdjbGFzcydcbiAgICAgICAgcCA9ICdjbGFzcydcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBmb3IgYXR0cmlidXRlIGdldHMgdHJhbnNmb3JtZWQgdG8gaHRtbEZvciwgYnV0IHdlIGp1c3Qgc2V0IGFzIGZvclxuICAgICAgaWYgKHAgPT09ICdodG1sRm9yJykge1xuICAgICAgICBwID0gJ2ZvcidcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgaXMgYm9vbGVhbiwgc2V0IGl0c2VsZiB0byB0aGUga2V5XG4gICAgICBpZiAoQk9PTF9QUk9QU1trZXldKSB7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgdmFsID0ga2V5XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgY29udGludWVcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgcHJlZmVycyBiZWluZyBzZXQgZGlyZWN0bHkgdnMgc2V0QXR0cmlidXRlXG4gICAgICBpZiAoa2V5LnNsaWNlKDAsIDIpID09PSAnb24nKSB7XG4gICAgICAgIGVsW3BdID0gdmFsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobnMpIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhudWxsLCBwLCB2YWwpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWwuc2V0QXR0cmlidXRlKHAsIHZhbClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGVuZENoaWxkIChjaGlsZHMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRzKSkgcmV0dXJuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRzW2ldXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgICBhcHBlbmRDaGlsZChub2RlKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdudW1iZXInIHx8XG4gICAgICAgIHR5cGVvZiBub2RlID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIERhdGUgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICBub2RlID0gbm9kZS50b1N0cmluZygpXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKGVsLmxhc3RDaGlsZCAmJiBlbC5sYXN0Q2hpbGQubm9kZU5hbWUgPT09ICcjdGV4dCcpIHtcbiAgICAgICAgICBlbC5sYXN0Q2hpbGQubm9kZVZhbHVlICs9IG5vZGVcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKVxuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSAmJiBub2RlLm5vZGVUeXBlKSB7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFwcGVuZENoaWxkKGNoaWxkcmVuKVxuXG4gIHJldHVybiBlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGh5cGVyeChiZWxDcmVhdGVFbGVtZW50KVxubW9kdWxlLmV4cG9ydHMuY3JlYXRlRWxlbWVudCA9IGJlbENyZWF0ZUVsZW1lbnRcbiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG4iLCJpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWw7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKXtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNlbGY7XG59IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0ge307XG59XG4iLCJ2YXIgYXR0clRvUHJvcCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eScpXG5cbnZhciBWQVIgPSAwLCBURVhUID0gMSwgT1BFTiA9IDIsIENMT1NFID0gMywgQVRUUiA9IDRcbnZhciBBVFRSX0tFWSA9IDUsIEFUVFJfS0VZX1cgPSA2XG52YXIgQVRUUl9WQUxVRV9XID0gNywgQVRUUl9WQUxVRSA9IDhcbnZhciBBVFRSX1ZBTFVFX1NRID0gOSwgQVRUUl9WQUxVRV9EUSA9IDEwXG52YXIgQVRUUl9FUSA9IDExLCBBVFRSX0JSRUFLID0gMTJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaCwgb3B0cykge1xuICBoID0gYXR0clRvUHJvcChoKVxuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuICB2YXIgY29uY2F0ID0gb3B0cy5jb25jYXQgfHwgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gU3RyaW5nKGEpICsgU3RyaW5nKGIpXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKHN0cmluZ3MpIHtcbiAgICB2YXIgc3RhdGUgPSBURVhULCByZWcgPSAnJ1xuICAgIHZhciBhcmdsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgdmFyIHBhcnRzID0gW11cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGkgPCBhcmdsZW4gLSAxKSB7XG4gICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbaSsxXVxuICAgICAgICB2YXIgcCA9IHBhcnNlKHN0cmluZ3NbaV0pXG4gICAgICAgIHZhciB4c3RhdGUgPSBzdGF0ZVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfU1EpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFIpIHhzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgIHAucHVzaChbIFZBUiwgeHN0YXRlLCBhcmcgXSlcbiAgICAgICAgcGFydHMucHVzaC5hcHBseShwYXJ0cywgcClcbiAgICAgIH0gZWxzZSBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwYXJzZShzdHJpbmdzW2ldKSlcbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IFtudWxsLHt9LFtdXVxuICAgIHZhciBzdGFjayA9IFtbdHJlZSwtMV1dXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGN1ciA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVxuICAgICAgdmFyIHAgPSBwYXJ0c1tpXSwgcyA9IHBbMF1cbiAgICAgIGlmIChzID09PSBPUEVOICYmIC9eXFwvLy50ZXN0KHBbMV0pKSB7XG4gICAgICAgIHZhciBpeCA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVsxXVxuICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMSkge1xuICAgICAgICAgIHN0YWNrLnBvcCgpXG4gICAgICAgICAgc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdWzJdW2l4XSA9IGgoXG4gICAgICAgICAgICBjdXJbMF0sIGN1clsxXSwgY3VyWzJdLmxlbmd0aCA/IGN1clsyXSA6IHVuZGVmaW5lZFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBPUEVOKSB7XG4gICAgICAgIHZhciBjID0gW3BbMV0se30sW11dXG4gICAgICAgIGN1clsyXS5wdXNoKGMpXG4gICAgICAgIHN0YWNrLnB1c2goW2MsY3VyWzJdLmxlbmd0aC0xXSlcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkgfHwgKHMgPT09IFZBUiAmJiBwWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgdmFyIGtleSA9ICcnXG4gICAgICAgIHZhciBjb3B5S2V5XG4gICAgICAgIGZvciAoOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsxXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcnRzW2ldWzBdID09PSBWQVIgJiYgcGFydHNbaV1bMV0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcnRzW2ldWzJdID09PSAnb2JqZWN0JyAmJiAha2V5KSB7XG4gICAgICAgICAgICAgIGZvciAoY29weUtleSBpbiBwYXJ0c1tpXVsyXSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0c1tpXVsyXS5oYXNPd25Qcm9wZXJ0eShjb3B5S2V5KSAmJiAhY3VyWzFdW2NvcHlLZXldKSB7XG4gICAgICAgICAgICAgICAgICBjdXJbMV1bY29weUtleV0gPSBwYXJ0c1tpXVsyXVtjb3B5S2V5XVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAga2V5ID0gY29uY2F0KGtleSwgcGFydHNbaV1bMl0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX0VRKSBpKytcbiAgICAgICAgdmFyIGogPSBpXG4gICAgICAgIGZvciAoOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfVkFMVUUgfHwgcGFydHNbaV1bMF0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBpZiAoIWN1clsxXVtrZXldKSBjdXJbMV1ba2V5XSA9IHN0cmZuKHBhcnRzW2ldWzFdKVxuICAgICAgICAgICAgZWxzZSBjdXJbMV1ba2V5XSA9IGNvbmNhdChjdXJbMV1ba2V5XSwgcGFydHNbaV1bMV0pXG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSXG4gICAgICAgICAgJiYgKHBhcnRzW2ldWzFdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMl0pXG4gICAgICAgICAgICBlbHNlIGN1clsxXVtrZXldID0gY29uY2F0KGN1clsxXVtrZXldLCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGtleS5sZW5ndGggJiYgIWN1clsxXVtrZXldICYmIGkgPT09IGpcbiAgICAgICAgICAgICYmIChwYXJ0c1tpXVswXSA9PT0gQ0xPU0UgfHwgcGFydHNbaV1bMF0gPT09IEFUVFJfQlJFQUspKSB7XG4gICAgICAgICAgICAgIC8vIGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL2luZnJhc3RydWN0dXJlLmh0bWwjYm9vbGVhbi1hdHRyaWJ1dGVzXG4gICAgICAgICAgICAgIC8vIGVtcHR5IHN0cmluZyBpcyBmYWxzeSwgbm90IHdlbGwgYmVoYXZlZCB2YWx1ZSBpbiBicm93c2VyXG4gICAgICAgICAgICAgIGN1clsxXVtrZXldID0ga2V5LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIGN1clsxXVtwWzFdXSA9IHRydWVcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIGN1clsxXVtwWzJdXSA9IHRydWVcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQ0xPU0UpIHtcbiAgICAgICAgaWYgKHNlbGZDbG9zaW5nKGN1clswXSkgJiYgc3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFZBUiAmJiBwWzFdID09PSBURVhUKSB7XG4gICAgICAgIGlmIChwWzJdID09PSB1bmRlZmluZWQgfHwgcFsyXSA9PT0gbnVsbCkgcFsyXSA9ICcnXG4gICAgICAgIGVsc2UgaWYgKCFwWzJdKSBwWzJdID0gY29uY2F0KCcnLCBwWzJdKVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwWzJdWzBdKSkge1xuICAgICAgICAgIGN1clsyXS5wdXNoLmFwcGx5KGN1clsyXSwgcFsyXSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdXJbMl0ucHVzaChwWzJdKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFRFWFQpIHtcbiAgICAgICAgY3VyWzJdLnB1c2gocFsxXSlcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9FUSB8fCBzID09PSBBVFRSX0JSRUFLKSB7XG4gICAgICAgIC8vIG5vLW9wXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3VuaGFuZGxlZDogJyArIHMpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRyZWVbMl0ubGVuZ3RoID4gMSAmJiAvXlxccyokLy50ZXN0KHRyZWVbMl1bMF0pKSB7XG4gICAgICB0cmVlWzJdLnNoaWZ0KClcbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAyXG4gICAgfHwgKHRyZWVbMl0ubGVuZ3RoID09PSAyICYmIC9cXFMvLnRlc3QodHJlZVsyXVsxXSkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdtdWx0aXBsZSByb290IGVsZW1lbnRzIG11c3QgYmUgd3JhcHBlZCBpbiBhbiBlbmNsb3NpbmcgdGFnJ1xuICAgICAgKVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdKSAmJiB0eXBlb2YgdHJlZVsyXVswXVswXSA9PT0gJ3N0cmluZydcbiAgICAmJiBBcnJheS5pc0FycmF5KHRyZWVbMl1bMF1bMl0pKSB7XG4gICAgICB0cmVlWzJdWzBdID0gaCh0cmVlWzJdWzBdWzBdLCB0cmVlWzJdWzBdWzFdLCB0cmVlWzJdWzBdWzJdKVxuICAgIH1cbiAgICByZXR1cm4gdHJlZVsyXVswXVxuXG4gICAgZnVuY3Rpb24gcGFyc2UgKHN0cikge1xuICAgICAgdmFyIHJlcyA9IFtdXG4gICAgICBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVykgc3RhdGUgPSBBVFRSXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYyA9IHN0ci5jaGFyQXQoaSlcbiAgICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIGMgPT09ICc8Jykge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSByZXMucHVzaChbVEVYVCwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gT1BFTlxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICc+JyAmJiAhcXVvdChzdGF0ZSkpIHtcbiAgICAgICAgICBpZiAoc3RhdGUgPT09IE9QRU4pIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzLnB1c2goW0NMT1NFXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gVEVYVFxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBURVhUKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW09QRU4sIHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1tcXHctXS8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgICByZWcgPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlfV1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSAmJiBjID09PSAnPScpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSxbQVRUUl9FUV0pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoKHN0YXRlID09PSBBVFRSX0tFWV9XIHx8IHN0YXRlID09PSBBVFRSKSAmJiBjID09PSAnPScpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9FUV0pXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1dcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmICEvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIGlmICgvW1xcdy1dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgICByZWcgKz0gY1xuICAgICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIH0gZWxzZSBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmIGMgPT09ICdcIicpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfRFFcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmIGMgPT09IFwiJ1wiKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgICBpLS1cbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUVxuICAgICAgICB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzdGF0ZSA9PT0gVEVYVCAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtURVhULHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdHJmbiAoeCkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh0eXBlb2YgeCA9PT0gJ3N0cmluZycpIHJldHVybiB4XG4gICAgZWxzZSBpZiAoeCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcpIHJldHVybiB4XG4gICAgZWxzZSByZXR1cm4gY29uY2F0KCcnLCB4KVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1b3QgKHN0YXRlKSB7XG4gIHJldHVybiBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUVxufVxuXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuZnVuY3Rpb24gaGFzIChvYmosIGtleSkgeyByZXR1cm4gaGFzT3duLmNhbGwob2JqLCBrZXkpIH1cblxudmFyIGNsb3NlUkUgPSBSZWdFeHAoJ14oJyArIFtcbiAgJ2FyZWEnLCAnYmFzZScsICdiYXNlZm9udCcsICdiZ3NvdW5kJywgJ2JyJywgJ2NvbCcsICdjb21tYW5kJywgJ2VtYmVkJyxcbiAgJ2ZyYW1lJywgJ2hyJywgJ2ltZycsICdpbnB1dCcsICdpc2luZGV4JywgJ2tleWdlbicsICdsaW5rJywgJ21ldGEnLCAncGFyYW0nLFxuICAnc291cmNlJywgJ3RyYWNrJywgJ3dicicsXG4gIC8vIFNWRyBUQUdTXG4gICdhbmltYXRlJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2N1cnNvcicsICdkZXNjJywgJ2VsbGlwc2UnLFxuICAnZmVCbGVuZCcsICdmZUNvbG9yTWF0cml4JywgJ2ZlQ29tcG9uZW50VHJhbnNmZXInLCAnZmVDb21wb3NpdGUnLFxuICAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsICdmZURpc3BsYWNlbWVudE1hcCcsXG4gICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsICdmZUZ1bmNHJywgJ2ZlRnVuY1InLFxuICAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlTm9kZScsICdmZU1vcnBob2xvZ3knLFxuICAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLFxuICAnZmVUdXJidWxlbmNlJywgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXVyaScsXG4gICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JlY3QnLCAnc2V0JywgJ3N0b3AnLCAndHJlZicsICd1c2UnLCAndmlldycsXG4gICd2a2Vybidcbl0uam9pbignfCcpICsgJykoPzpbXFwuI11bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspKiQnKVxuZnVuY3Rpb24gc2VsZkNsb3NpbmcgKHRhZykgeyByZXR1cm4gY2xvc2VSRS50ZXN0KHRhZykgfVxuIiwibW9kdWxlLmV4cG9ydHMgPSBhdHRyaWJ1dGVUb1Byb3BlcnR5XG5cbnZhciB0cmFuc2Zvcm0gPSB7XG4gICdjbGFzcyc6ICdjbGFzc05hbWUnLFxuICAnZm9yJzogJ2h0bWxGb3InLFxuICAnaHR0cC1lcXVpdic6ICdodHRwRXF1aXYnXG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZVRvUHJvcGVydHkgKGgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YWdOYW1lLCBhdHRycywgY2hpbGRyZW4pIHtcbiAgICBmb3IgKHZhciBhdHRyIGluIGF0dHJzKSB7XG4gICAgICBpZiAoYXR0ciBpbiB0cmFuc2Zvcm0pIHtcbiAgICAgICAgYXR0cnNbdHJhbnNmb3JtW2F0dHJdXSA9IGF0dHJzW2F0dHJdXG4gICAgICAgIGRlbGV0ZSBhdHRyc1thdHRyXVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaCh0YWdOYW1lLCBhdHRycywgY2hpbGRyZW4pXG4gIH1cbn1cbiIsIi8qIGdsb2JhbCBNdXRhdGlvbk9ic2VydmVyICovXG52YXIgZG9jdW1lbnQgPSByZXF1aXJlKCdnbG9iYWwvZG9jdW1lbnQnKVxudmFyIHdpbmRvdyA9IHJlcXVpcmUoJ2dsb2JhbC93aW5kb3cnKVxudmFyIHdhdGNoID0gT2JqZWN0LmNyZWF0ZShudWxsKVxudmFyIEtFWV9JRCA9ICdvbmxvYWRpZCcgKyAobmV3IERhdGUoKSAlIDllNikudG9TdHJpbmcoMzYpXG52YXIgS0VZX0FUVFIgPSAnZGF0YS0nICsgS0VZX0lEXG52YXIgSU5ERVggPSAwXG5cbmlmICh3aW5kb3cgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKG11dGF0aW9ucykge1xuICAgIGlmIChPYmplY3Qua2V5cyh3YXRjaCkubGVuZ3RoIDwgMSkgcmV0dXJuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtdXRhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtdXRhdGlvbnNbaV0uYXR0cmlidXRlTmFtZSA9PT0gS0VZX0FUVFIpIHtcbiAgICAgICAgZWFjaEF0dHIobXV0YXRpb25zW2ldLCB0dXJub24sIHR1cm5vZmYpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBlYWNoTXV0YXRpb24obXV0YXRpb25zW2ldLnJlbW92ZWROb2RlcywgdHVybm9mZilcbiAgICAgIGVhY2hNdXRhdGlvbihtdXRhdGlvbnNbaV0uYWRkZWROb2RlcywgdHVybm9uKVxuICAgIH1cbiAgfSlcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWUsXG4gICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVPbGRWYWx1ZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVGaWx0ZXI6IFtLRVlfQVRUUl1cbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBvbmxvYWQgKGVsLCBvbiwgb2ZmLCBjYWxsZXIpIHtcbiAgb24gPSBvbiB8fCBmdW5jdGlvbiAoKSB7fVxuICBvZmYgPSBvZmYgfHwgZnVuY3Rpb24gKCkge31cbiAgZWwuc2V0QXR0cmlidXRlKEtFWV9BVFRSLCAnbycgKyBJTkRFWClcbiAgd2F0Y2hbJ28nICsgSU5ERVhdID0gW29uLCBvZmYsIDAsIGNhbGxlciB8fCBvbmxvYWQuY2FsbGVyXVxuICBJTkRFWCArPSAxXG4gIHJldHVybiBlbFxufVxuXG5mdW5jdGlvbiB0dXJub24gKGluZGV4LCBlbCkge1xuICBpZiAod2F0Y2hbaW5kZXhdWzBdICYmIHdhdGNoW2luZGV4XVsyXSA9PT0gMCkge1xuICAgIHdhdGNoW2luZGV4XVswXShlbClcbiAgICB3YXRjaFtpbmRleF1bMl0gPSAxXG4gIH1cbn1cblxuZnVuY3Rpb24gdHVybm9mZiAoaW5kZXgsIGVsKSB7XG4gIGlmICh3YXRjaFtpbmRleF1bMV0gJiYgd2F0Y2hbaW5kZXhdWzJdID09PSAxKSB7XG4gICAgd2F0Y2hbaW5kZXhdWzFdKGVsKVxuICAgIHdhdGNoW2luZGV4XVsyXSA9IDBcbiAgfVxufVxuXG5mdW5jdGlvbiBlYWNoQXR0ciAobXV0YXRpb24sIG9uLCBvZmYpIHtcbiAgdmFyIG5ld1ZhbHVlID0gbXV0YXRpb24udGFyZ2V0LmdldEF0dHJpYnV0ZShLRVlfQVRUUilcbiAgaWYgKHNhbWVPcmlnaW4obXV0YXRpb24ub2xkVmFsdWUsIG5ld1ZhbHVlKSkge1xuICAgIHdhdGNoW25ld1ZhbHVlXSA9IHdhdGNoW211dGF0aW9uLm9sZFZhbHVlXVxuICAgIHJldHVyblxuICB9XG4gIGlmICh3YXRjaFttdXRhdGlvbi5vbGRWYWx1ZV0pIHtcbiAgICBvZmYobXV0YXRpb24ub2xkVmFsdWUsIG11dGF0aW9uLnRhcmdldClcbiAgfVxuICBpZiAod2F0Y2hbbmV3VmFsdWVdKSB7XG4gICAgb24obmV3VmFsdWUsIG11dGF0aW9uLnRhcmdldClcbiAgfVxufVxuXG5mdW5jdGlvbiBzYW1lT3JpZ2luIChvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgaWYgKCFvbGRWYWx1ZSB8fCAhbmV3VmFsdWUpIHJldHVybiBmYWxzZVxuICByZXR1cm4gd2F0Y2hbb2xkVmFsdWVdWzNdID09PSB3YXRjaFtuZXdWYWx1ZV1bM11cbn1cblxuZnVuY3Rpb24gZWFjaE11dGF0aW9uIChub2RlcywgZm4pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh3YXRjaClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChub2Rlc1tpXSAmJiBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUgJiYgbm9kZXNbaV0uZ2V0QXR0cmlidXRlKEtFWV9BVFRSKSkge1xuICAgICAgdmFyIG9ubG9hZGlkID0gbm9kZXNbaV0uZ2V0QXR0cmlidXRlKEtFWV9BVFRSKVxuICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgIGlmIChvbmxvYWRpZCA9PT0gaykge1xuICAgICAgICAgIGZuKGssIG5vZGVzW2ldKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICBpZiAobm9kZXNbaV0uY2hpbGROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICBlYWNoTXV0YXRpb24obm9kZXNbaV0uY2hpbGROb2RlcywgZm4pXG4gICAgfVxuICB9XG59XG4iLCIvLyBDcmVhdGUgYSByYW5nZSBvYmplY3QgZm9yIGVmZmljZW50bHkgcmVuZGVyaW5nIHN0cmluZ3MgdG8gZWxlbWVudHMuXG52YXIgcmFuZ2U7XG5cbnZhciB0ZXN0RWwgPSAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykgP1xuICAgIGRvY3VtZW50LmJvZHkgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykgOlxuICAgIHt9O1xuXG52YXIgWEhUTUwgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCc7XG52YXIgRUxFTUVOVF9OT0RFID0gMTtcbnZhciBURVhUX05PREUgPSAzO1xudmFyIENPTU1FTlRfTk9ERSA9IDg7XG5cbi8vIEZpeGVzIDxodHRwczovL2dpdGh1Yi5jb20vcGF0cmljay1zdGVlbGUtaWRlbS9tb3JwaGRvbS9pc3N1ZXMvMzI+XG4vLyAoSUU3KyBzdXBwb3J0KSA8PUlFNyBkb2VzIG5vdCBzdXBwb3J0IGVsLmhhc0F0dHJpYnV0ZShuYW1lKVxudmFyIGhhc0F0dHJpYnV0ZU5TO1xuXG5pZiAodGVzdEVsLmhhc0F0dHJpYnV0ZU5TKSB7XG4gICAgaGFzQXR0cmlidXRlTlMgPSBmdW5jdGlvbihlbCwgbmFtZXNwYWNlVVJJLCBuYW1lKSB7XG4gICAgICAgIHJldHVybiBlbC5oYXNBdHRyaWJ1dGVOUyhuYW1lc3BhY2VVUkksIG5hbWUpO1xuICAgIH07XG59IGVsc2UgaWYgKHRlc3RFbC5oYXNBdHRyaWJ1dGUpIHtcbiAgICBoYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZShuYW1lKTtcbiAgICB9O1xufSBlbHNlIHtcbiAgICBoYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuICEhZWwuZ2V0QXR0cmlidXRlTm9kZShuYW1lKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBlbXB0eShvKSB7XG4gICAgZm9yICh2YXIgayBpbiBvKSB7XG4gICAgICAgIGlmIChvLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHRvRWxlbWVudChzdHIpIHtcbiAgICBpZiAoIXJhbmdlICYmIGRvY3VtZW50LmNyZWF0ZVJhbmdlKSB7XG4gICAgICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZShkb2N1bWVudC5ib2R5KTtcbiAgICB9XG5cbiAgICB2YXIgZnJhZ21lbnQ7XG4gICAgaWYgKHJhbmdlICYmIHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudCkge1xuICAgICAgICBmcmFnbWVudCA9IHJhbmdlLmNyZWF0ZUNvbnRleHR1YWxGcmFnbWVudChzdHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYm9keScpO1xuICAgICAgICBmcmFnbWVudC5pbm5lckhUTUwgPSBzdHI7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudC5jaGlsZE5vZGVzWzBdO1xufVxuXG52YXIgc3BlY2lhbEVsSGFuZGxlcnMgPSB7XG4gICAgLyoqXG4gICAgICogTmVlZGVkIGZvciBJRS4gQXBwYXJlbnRseSBJRSBkb2Vzbid0IHRoaW5rIHRoYXQgXCJzZWxlY3RlZFwiIGlzIGFuXG4gICAgICogYXR0cmlidXRlIHdoZW4gcmVhZGluZyBvdmVyIHRoZSBhdHRyaWJ1dGVzIHVzaW5nIHNlbGVjdEVsLmF0dHJpYnV0ZXNcbiAgICAgKi9cbiAgICBPUFRJT046IGZ1bmN0aW9uKGZyb21FbCwgdG9FbCkge1xuICAgICAgICBmcm9tRWwuc2VsZWN0ZWQgPSB0b0VsLnNlbGVjdGVkO1xuICAgICAgICBpZiAoZnJvbUVsLnNlbGVjdGVkKSB7XG4gICAgICAgICAgICBmcm9tRWwuc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21FbC5yZW1vdmVBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBUaGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSBpcyBzcGVjaWFsIGZvciB0aGUgPGlucHV0PiBlbGVtZW50IHNpbmNlIGl0IHNldHNcbiAgICAgKiB0aGUgaW5pdGlhbCB2YWx1ZS4gQ2hhbmdpbmcgdGhlIFwidmFsdWVcIiBhdHRyaWJ1dGUgd2l0aG91dCBjaGFuZ2luZyB0aGVcbiAgICAgKiBcInZhbHVlXCIgcHJvcGVydHkgd2lsbCBoYXZlIG5vIGVmZmVjdCBzaW5jZSBpdCBpcyBvbmx5IHVzZWQgdG8gdGhlIHNldCB0aGVcbiAgICAgKiBpbml0aWFsIHZhbHVlLiAgU2ltaWxhciBmb3IgdGhlIFwiY2hlY2tlZFwiIGF0dHJpYnV0ZSwgYW5kIFwiZGlzYWJsZWRcIi5cbiAgICAgKi9cbiAgICBJTlBVVDogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIGZyb21FbC5jaGVja2VkID0gdG9FbC5jaGVja2VkO1xuICAgICAgICBpZiAoZnJvbUVsLmNoZWNrZWQpIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUoJ2NoZWNrZWQnLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCdjaGVja2VkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnJvbUVsLnZhbHVlICE9PSB0b0VsLnZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSB0b0VsLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b0VsLCBudWxsLCAndmFsdWUnKSkge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgndmFsdWUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZyb21FbC5kaXNhYmxlZCA9IHRvRWwuZGlzYWJsZWQ7XG4gICAgICAgIGlmIChmcm9tRWwuZGlzYWJsZWQpIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBURVhUQVJFQTogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IG5ld1ZhbHVlKSB7XG4gICAgICAgICAgICBmcm9tRWwudmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm9tRWwuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgZnJvbUVsLmZpcnN0Q2hpbGQubm9kZVZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdHdvIG5vZGUncyBuYW1lcyBhbmQgbmFtZXNwYWNlIFVSSXMgYXJlIHRoZSBzYW1lLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gYVxuICogQHBhcmFtIHtFbGVtZW50fSBiXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG52YXIgY29tcGFyZU5vZGVOYW1lcyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYS5ub2RlTmFtZSA9PT0gYi5ub2RlTmFtZSAmJlxuICAgICAgICAgICBhLm5hbWVzcGFjZVVSSSA9PT0gYi5uYW1lc3BhY2VVUkk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhbiBlbGVtZW50LCBvcHRpb25hbGx5IHdpdGggYSBrbm93biBuYW1lc3BhY2UgVVJJLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSBlbGVtZW50IG5hbWUsIGUuZy4gJ2Rpdicgb3IgJ3N2ZydcbiAqIEBwYXJhbSB7c3RyaW5nfSBbbmFtZXNwYWNlVVJJXSB0aGUgZWxlbWVudCdzIG5hbWVzcGFjZSBVUkksIGkuZS4gdGhlIHZhbHVlIG9mXG4gKiBpdHMgYHhtbG5zYCBhdHRyaWJ1dGUgb3IgaXRzIGluZmVycmVkIG5hbWVzcGFjZS5cbiAqXG4gKiBAcmV0dXJuIHtFbGVtZW50fVxuICovXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50TlMobmFtZSwgbmFtZXNwYWNlVVJJKSB7XG4gICAgcmV0dXJuICFuYW1lc3BhY2VVUkkgfHwgbmFtZXNwYWNlVVJJID09PSBYSFRNTCA/XG4gICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQobmFtZSkgOlxuICAgICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobmFtZXNwYWNlVVJJLCBuYW1lKTtcbn1cblxuLyoqXG4gKiBMb29wIG92ZXIgYWxsIG9mIHRoZSBhdHRyaWJ1dGVzIG9uIHRoZSB0YXJnZXQgbm9kZSBhbmQgbWFrZSBzdXJlIHRoZSBvcmlnaW5hbFxuICogRE9NIG5vZGUgaGFzIHRoZSBzYW1lIGF0dHJpYnV0ZXMuIElmIGFuIGF0dHJpYnV0ZSBmb3VuZCBvbiB0aGUgb3JpZ2luYWwgbm9kZVxuICogaXMgbm90IG9uIHRoZSBuZXcgbm9kZSB0aGVuIHJlbW92ZSBpdCBmcm9tIHRoZSBvcmlnaW5hbCBub2RlLlxuICpcbiAqIEBwYXJhbSAge0VsZW1lbnR9IGZyb21Ob2RlXG4gKiBAcGFyYW0gIHtFbGVtZW50fSB0b05vZGVcbiAqL1xuZnVuY3Rpb24gbW9ycGhBdHRycyhmcm9tTm9kZSwgdG9Ob2RlKSB7XG4gICAgdmFyIGF0dHJzID0gdG9Ob2RlLmF0dHJpYnV0ZXM7XG4gICAgdmFyIGk7XG4gICAgdmFyIGF0dHI7XG4gICAgdmFyIGF0dHJOYW1lO1xuICAgIHZhciBhdHRyTmFtZXNwYWNlVVJJO1xuICAgIHZhciBhdHRyVmFsdWU7XG4gICAgdmFyIGZyb21WYWx1ZTtcblxuICAgIGZvciAoaSA9IGF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICAgIGF0dHJWYWx1ZSA9IGF0dHIudmFsdWU7XG4gICAgICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSTtcblxuICAgICAgICBpZiAoYXR0ck5hbWVzcGFjZVVSSSkge1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZTtcbiAgICAgICAgICAgIGZyb21WYWx1ZSA9IGZyb21Ob2RlLmdldEF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21WYWx1ZSA9IGZyb21Ob2RlLmdldEF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnJvbVZhbHVlICE9PSBhdHRyVmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICAgICAgZnJvbU5vZGUuc2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZyb21Ob2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBhbnkgZXh0cmEgYXR0cmlidXRlcyBmb3VuZCBvbiB0aGUgb3JpZ2luYWwgRE9NIGVsZW1lbnQgdGhhdFxuICAgIC8vIHdlcmVuJ3QgZm91bmQgb24gdGhlIHRhcmdldCBlbGVtZW50LlxuICAgIGF0dHJzID0gZnJvbU5vZGUuYXR0cmlidXRlcztcblxuICAgIGZvciAoaSA9IGF0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyc1tpXTtcbiAgICAgICAgaWYgKGF0dHIuc3BlY2lmaWVkICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICAgICAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUkk7XG5cbiAgICAgICAgICAgIGlmICghaGFzQXR0cmlidXRlTlModG9Ob2RlLCBhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZXNwYWNlVVJJID8gYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZSA6IGF0dHJOYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb21Ob2RlLnJlbW92ZUF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHIubG9jYWxOYW1lKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBDb3BpZXMgdGhlIGNoaWxkcmVuIG9mIG9uZSBET00gZWxlbWVudCB0byBhbm90aGVyIERPTSBlbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG1vdmVDaGlsZHJlbihmcm9tRWwsIHRvRWwpIHtcbiAgICB2YXIgY3VyQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgdmFyIG5leHRDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICB0b0VsLmFwcGVuZENoaWxkKGN1ckNoaWxkKTtcbiAgICAgICAgY3VyQ2hpbGQgPSBuZXh0Q2hpbGQ7XG4gICAgfVxuICAgIHJldHVybiB0b0VsO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0R2V0Tm9kZUtleShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuaWQ7XG59XG5cbmZ1bmN0aW9uIG1vcnBoZG9tKGZyb21Ob2RlLCB0b05vZGUsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdG9Ob2RlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoZnJvbU5vZGUubm9kZU5hbWUgPT09ICcjZG9jdW1lbnQnIHx8IGZyb21Ob2RlLm5vZGVOYW1lID09PSAnSFRNTCcpIHtcbiAgICAgICAgICAgIHZhciB0b05vZGVIdG1sID0gdG9Ob2RlO1xuICAgICAgICAgICAgdG9Ob2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaHRtbCcpO1xuICAgICAgICAgICAgdG9Ob2RlLmlubmVySFRNTCA9IHRvTm9kZUh0bWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0b05vZGUgPSB0b0VsZW1lbnQodG9Ob2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFhYWCBvcHRpbWl6YXRpb246IGlmIHRoZSBub2RlcyBhcmUgZXF1YWwsIGRvbid0IG1vcnBoIHRoZW1cbiAgICAvKlxuICAgIGlmIChmcm9tTm9kZS5pc0VxdWFsTm9kZSh0b05vZGUpKSB7XG4gICAgICByZXR1cm4gZnJvbU5vZGU7XG4gICAgfVxuICAgICovXG5cbiAgICB2YXIgc2F2ZWRFbHMgPSB7fTsgLy8gVXNlZCB0byBzYXZlIG9mZiBET00gZWxlbWVudHMgd2l0aCBJRHNcbiAgICB2YXIgdW5tYXRjaGVkRWxzID0ge307XG4gICAgdmFyIGdldE5vZGVLZXkgPSBvcHRpb25zLmdldE5vZGVLZXkgfHwgZGVmYXVsdEdldE5vZGVLZXk7XG4gICAgdmFyIG9uQmVmb3JlTm9kZUFkZGVkID0gb3B0aW9ucy5vbkJlZm9yZU5vZGVBZGRlZCB8fCBub29wO1xuICAgIHZhciBvbk5vZGVBZGRlZCA9IG9wdGlvbnMub25Ob2RlQWRkZWQgfHwgbm9vcDtcbiAgICB2YXIgb25CZWZvcmVFbFVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxVcGRhdGVkIHx8IG9wdGlvbnMub25CZWZvcmVNb3JwaEVsIHx8IG5vb3A7XG4gICAgdmFyIG9uRWxVcGRhdGVkID0gb3B0aW9ucy5vbkVsVXBkYXRlZCB8fCBub29wO1xuICAgIHZhciBvbkJlZm9yZU5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgIHZhciBvbk5vZGVEaXNjYXJkZWQgPSBvcHRpb25zLm9uTm9kZURpc2NhcmRlZCB8fCBub29wO1xuICAgIHZhciBvbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkID0gb3B0aW9ucy5vbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkIHx8IG9wdGlvbnMub25CZWZvcmVNb3JwaEVsQ2hpbGRyZW4gfHwgbm9vcDtcbiAgICB2YXIgY2hpbGRyZW5Pbmx5ID0gb3B0aW9ucy5jaGlsZHJlbk9ubHkgPT09IHRydWU7XG4gICAgdmFyIG1vdmVkRWxzID0gW107XG5cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlSGVscGVyKG5vZGUsIG5lc3RlZEluU2F2ZWRFbCkge1xuICAgICAgICB2YXIgaWQgPSBnZXROb2RlS2V5KG5vZGUpO1xuICAgICAgICAvLyBJZiB0aGUgbm9kZSBoYXMgYW4gSUQgdGhlbiBzYXZlIGl0IG9mZiBzaW5jZSB3ZSB3aWxsIHdhbnRcbiAgICAgICAgLy8gdG8gcmV1c2UgaXQgaW4gY2FzZSB0aGUgdGFyZ2V0IERPTSB0cmVlIGhhcyBhIERPTSBlbGVtZW50XG4gICAgICAgIC8vIHdpdGggdGhlIHNhbWUgSURcbiAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICBzYXZlZEVsc1tpZF0gPSBub2RlO1xuICAgICAgICB9IGVsc2UgaWYgKCFuZXN0ZWRJblNhdmVkRWwpIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGFyZSBub3QgbmVzdGVkIGluIGEgc2F2ZWQgZWxlbWVudCB0aGVuIHdlIGtub3cgdGhhdCB0aGlzIG5vZGUgaGFzIGJlZW5cbiAgICAgICAgICAgIC8vIGNvbXBsZXRlbHkgZGlzY2FyZGVkIGFuZCB3aWxsIG5vdCBleGlzdCBpbiB0aGUgZmluYWwgRE9NLlxuICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKG5vZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gbm9kZS5maXJzdENoaWxkO1xuICAgICAgICAgICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlTm9kZUhlbHBlcihjdXJDaGlsZCwgbmVzdGVkSW5TYXZlZEVsIHx8IGlkKTtcbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcblxuXG4gICAgICAgICAgICAgICAgaWYgKCFnZXROb2RlS2V5KGN1ckNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBvbmx5IHdhbnQgdG8gaGFuZGxlIG5vZGVzIHRoYXQgZG9uJ3QgaGF2ZSBhbiBJRCB0byBhdm9pZCBkb3VibGVcbiAgICAgICAgICAgICAgICAgICAgLy8gd2Fsa2luZyB0aGUgc2FtZSBzYXZlZCBlbGVtZW50LlxuXG4gICAgICAgICAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChjdXJDaGlsZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gV2FsayByZWN1cnNpdmVseVxuICAgICAgICAgICAgICAgICAgICB3YWxrRGlzY2FyZGVkQ2hpbGROb2RlcyhjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBjdXJDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSwgcGFyZW50Tm9kZSwgYWxyZWFkeVZpc2l0ZWQpIHtcbiAgICAgICAgaWYgKG9uQmVmb3JlTm9kZURpc2NhcmRlZChub2RlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgICAgIGlmIChhbHJlYWR5VmlzaXRlZCkge1xuICAgICAgICAgICAgaWYgKCFnZXROb2RlS2V5KG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKG5vZGUpO1xuICAgICAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKG5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlTm9kZUhlbHBlcihub2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vcnBoRWwoZnJvbUVsLCB0b0VsLCBhbHJlYWR5VmlzaXRlZCwgY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgIHZhciB0b0VsS2V5ID0gZ2V0Tm9kZUtleSh0b0VsKTtcbiAgICAgICAgaWYgKHRvRWxLZXkpIHtcbiAgICAgICAgICAgIC8vIElmIGFuIGVsZW1lbnQgd2l0aCBhbiBJRCBpcyBiZWluZyBtb3JwaGVkIHRoZW4gaXQgaXMgd2lsbCBiZSBpbiB0aGUgZmluYWxcbiAgICAgICAgICAgIC8vIERPTSBzbyBjbGVhciBpdCBvdXQgb2YgdGhlIHNhdmVkIGVsZW1lbnRzIGNvbGxlY3Rpb25cbiAgICAgICAgICAgIGRlbGV0ZSBzYXZlZEVsc1t0b0VsS2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgICAgICBpZiAob25CZWZvcmVFbFVwZGF0ZWQoZnJvbUVsLCB0b0VsKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vcnBoQXR0cnMoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgICAgIG9uRWxVcGRhdGVkKGZyb21FbCk7XG5cbiAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsQ2hpbGRyZW5VcGRhdGVkKGZyb21FbCwgdG9FbCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZyb21FbC5ub2RlTmFtZSAhPT0gJ1RFWFRBUkVBJykge1xuICAgICAgICAgICAgdmFyIGN1clRvTm9kZUNoaWxkID0gdG9FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tRWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHZhciBjdXJUb05vZGVJZDtcblxuICAgICAgICAgICAgdmFyIGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgIHZhciB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgdmFyIHNhdmVkRWw7XG4gICAgICAgICAgICB2YXIgdW5tYXRjaGVkRWw7XG5cbiAgICAgICAgICAgIG91dGVyOiB3aGlsZSAoY3VyVG9Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB0b05leHRTaWJsaW5nID0gY3VyVG9Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgY3VyVG9Ob2RlSWQgPSBnZXROb2RlS2V5KGN1clRvTm9kZUNoaWxkKTtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJGcm9tTm9kZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJGcm9tTm9kZUlkID0gZ2V0Tm9kZUtleShjdXJGcm9tTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5leHRTaWJsaW5nID0gY3VyRnJvbU5vZGVDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWFscmVhZHlWaXNpdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVJZCAmJiAodW5tYXRjaGVkRWwgPSB1bm1hdGNoZWRFbHNbY3VyRnJvbU5vZGVJZF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5tYXRjaGVkRWwucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoY3VyRnJvbU5vZGVDaGlsZCwgdW5tYXRjaGVkRWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoY3VyRnJvbU5vZGVDaGlsZCwgdW5tYXRjaGVkRWwsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlVHlwZSA9IGN1ckZyb21Ob2RlQ2hpbGQubm9kZVR5cGU7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gY3VyVG9Ob2RlQ2hpbGQubm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0NvbXBhdGlibGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgRWxlbWVudCBub2Rlc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBhcmVOb2RlTmFtZXMoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIGhhdmUgY29tcGF0aWJsZSBET00gZWxlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1ckZyb21Ob2RlSWQgfHwgY3VyVG9Ob2RlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGVpdGhlciBET00gZWxlbWVudCBoYXMgYW4gSUQgdGhlbiB3ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIHRob3NlIGRpZmZlcmVudGx5IHNpbmNlIHdlIHdhbnQgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoIHVwIGJ5IElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlSWQgPT09IGN1ckZyb21Ob2RlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbXBhdGlibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgZm91bmQgY29tcGF0aWJsZSBET00gZWxlbWVudHMgc28gdHJhbnNmb3JtXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IFwiZnJvbVwiIG5vZGUgdG8gbWF0Y2ggdGhlIGN1cnJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFyZ2V0IERPTSBub2RlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3JwaEVsKGN1ckZyb21Ob2RlQ2hpbGQsIGN1clRvTm9kZUNoaWxkLCBhbHJlYWR5VmlzaXRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQm90aCBub2RlcyBiZWluZyBjb21wYXJlZCBhcmUgVGV4dCBvciBDb21tZW50IG5vZGVzXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBURVhUX05PREUgfHwgY3VyRnJvbU5vZGVUeXBlID09IENPTU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGx5IHVwZGF0ZSBub2RlVmFsdWUgb24gdGhlIG9yaWdpbmFsIG5vZGUgdG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHRleHQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkLm5vZGVWYWx1ZSA9IGN1clRvTm9kZUNoaWxkLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIG91dGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gY29tcGF0aWJsZSBtYXRjaCBzbyByZW1vdmUgdGhlIG9sZCBub2RlIGZyb20gdGhlIERPTVxuICAgICAgICAgICAgICAgICAgICAvLyBhbmQgY29udGludWUgdHJ5aW5nIHRvIGZpbmQgYSBtYXRjaCBpbiB0aGUgb3JpZ2luYWwgRE9NXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCBhbHJlYWR5VmlzaXRlZCk7XG4gICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoc2F2ZWRFbCA9IHNhdmVkRWxzW2N1clRvTm9kZUlkXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wYXJlTm9kZU5hbWVzKHNhdmVkRWwsIGN1clRvTm9kZUNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoc2F2ZWRFbCwgY3VyVG9Ob2RlQ2hpbGQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIHdhbnQgdG8gYXBwZW5kIHRoZSBzYXZlZCBlbGVtZW50IGluc3RlYWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IHNhdmVkRWw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlZEVsc1tjdXJUb05vZGVJZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKHNhdmVkRWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgRE9NIGVsZW1lbnQgaW4gdGhlIHRhcmdldCB0cmVlIGhhcyBhbiBJRFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYnV0IHdlIGRpZCBub3QgZmluZCBhIG1hdGNoIGluIGFueSBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmRpbmcgc2libGluZ3MuIFdlIGp1c3QgcHV0IHRoZSB0YXJnZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgaW4gdGhlIG9sZCBET00gdHJlZSBidXQgaWYgd2UgbGF0ZXIgZmluZCBhblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCBpbiB0aGUgb2xkIERPTSB0cmVlIHRoYXQgaGFzIGEgbWF0Y2hpbmcgSURcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZW4gd2Ugd2lsbCByZXBsYWNlIHRoZSB0YXJnZXQgZWxlbWVudCB3aXRoIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZGluZyBvbGQgZWxlbWVudCBhbmQgbW9ycGggdGhlIG9sZCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB1bm1hdGNoZWRFbHNbY3VyVG9Ob2RlSWRdID0gY3VyVG9Ob2RlQ2hpbGQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnb3QgdGhpcyBmYXIgdGhlbiB3ZSBkaWQgbm90IGZpbmQgYSBjYW5kaWRhdGUgbWF0Y2ggZm9yXG4gICAgICAgICAgICAgICAgLy8gb3VyIFwidG8gbm9kZVwiIGFuZCB3ZSBleGhhdXN0ZWQgYWxsIG9mIHRoZSBjaGlsZHJlbiBcImZyb21cIlxuICAgICAgICAgICAgICAgIC8vIG5vZGVzLiBUaGVyZWZvcmUsIHdlIHdpbGwganVzdCBhcHBlbmQgdGhlIGN1cnJlbnQgXCJ0byBub2RlXCJcbiAgICAgICAgICAgICAgICAvLyB0byB0aGUgZW5kXG4gICAgICAgICAgICAgICAgaWYgKG9uQmVmb3JlTm9kZUFkZGVkKGN1clRvTm9kZUNoaWxkKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbUVsLmFwcGVuZENoaWxkKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgb25Ob2RlQWRkZWQoY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVDaGlsZC5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFICYmXG4gICAgICAgICAgICAgICAgICAgIChjdXJUb05vZGVJZCB8fCBjdXJUb05vZGVDaGlsZC5maXJzdENoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGUgZWxlbWVudCB0aGF0IHdhcyBqdXN0IGFkZGVkIHRvIHRoZSBvcmlnaW5hbCBET00gbWF5XG4gICAgICAgICAgICAgICAgICAgIC8vIGhhdmUgc29tZSBuZXN0ZWQgZWxlbWVudHMgd2l0aCBhIGtleS9JRCB0aGF0IG5lZWRzIHRvIGJlXG4gICAgICAgICAgICAgICAgICAgIC8vIG1hdGNoZWQgdXAgd2l0aCBvdGhlciBlbGVtZW50cy4gV2UnbGwgYWRkIHRoZSBlbGVtZW50IHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGEgbGlzdCBzbyB0aGF0IHdlIGNhbiBsYXRlciBwcm9jZXNzIHRoZSBuZXN0ZWQgZWxlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgYXJlIGFueSB1bm1hdGNoZWQga2V5ZWQgZWxlbWVudHMgdGhhdCB3ZXJlXG4gICAgICAgICAgICAgICAgICAgIC8vIGRpc2NhcmRlZFxuICAgICAgICAgICAgICAgICAgICBtb3ZlZEVscy5wdXNoKGN1clRvTm9kZUNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJUb05vZGVDaGlsZCA9IHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UgaGF2ZSBwcm9jZXNzZWQgYWxsIG9mIHRoZSBcInRvIG5vZGVzXCIuIElmIGN1ckZyb21Ob2RlQ2hpbGQgaXNcbiAgICAgICAgICAgIC8vIG5vbi1udWxsIHRoZW4gd2Ugc3RpbGwgaGF2ZSBzb21lIGZyb20gbm9kZXMgbGVmdCBvdmVyIHRoYXQgbmVlZFxuICAgICAgICAgICAgLy8gdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgd2hpbGUgKGN1ckZyb21Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIHJlbW92ZU5vZGUoY3VyRnJvbU5vZGVDaGlsZCwgZnJvbUVsLCBhbHJlYWR5VmlzaXRlZCk7XG4gICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcGVjaWFsRWxIYW5kbGVyID0gc3BlY2lhbEVsSGFuZGxlcnNbZnJvbUVsLm5vZGVOYW1lXTtcbiAgICAgICAgaWYgKHNwZWNpYWxFbEhhbmRsZXIpIHtcbiAgICAgICAgICAgIHNwZWNpYWxFbEhhbmRsZXIoZnJvbUVsLCB0b0VsKTtcbiAgICAgICAgfVxuICAgIH0gLy8gRU5EOiBtb3JwaEVsKC4uLilcblxuICAgIHZhciBtb3JwaGVkTm9kZSA9IGZyb21Ob2RlO1xuICAgIHZhciBtb3JwaGVkTm9kZVR5cGUgPSBtb3JwaGVkTm9kZS5ub2RlVHlwZTtcbiAgICB2YXIgdG9Ob2RlVHlwZSA9IHRvTm9kZS5ub2RlVHlwZTtcblxuICAgIGlmICghY2hpbGRyZW5Pbmx5KSB7XG4gICAgICAgIC8vIEhhbmRsZSB0aGUgY2FzZSB3aGVyZSB3ZSBhcmUgZ2l2ZW4gdHdvIERPTSBub2RlcyB0aGF0IGFyZSBub3RcbiAgICAgICAgLy8gY29tcGF0aWJsZSAoZS5nLiA8ZGl2PiAtLT4gPHNwYW4+IG9yIDxkaXY+IC0tPiBURVhUKVxuICAgICAgICBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgIGlmICh0b05vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbXBhcmVOb2RlTmFtZXMoZnJvbU5vZGUsIHRvTm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICAgICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSBtb3ZlQ2hpbGRyZW4oZnJvbU5vZGUsIGNyZWF0ZUVsZW1lbnROUyh0b05vZGUubm9kZU5hbWUsIHRvTm9kZS5uYW1lc3BhY2VVUkkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEdvaW5nIGZyb20gYW4gZWxlbWVudCBub2RlIHRvIGEgdGV4dCBub2RlXG4gICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSB0b05vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobW9ycGhlZE5vZGVUeXBlID09PSBURVhUX05PREUgfHwgbW9ycGhlZE5vZGVUeXBlID09PSBDT01NRU5UX05PREUpIHsgLy8gVGV4dCBvciBjb21tZW50IG5vZGVcbiAgICAgICAgICAgIGlmICh0b05vZGVUeXBlID09PSBtb3JwaGVkTm9kZVR5cGUpIHtcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZS5ub2RlVmFsdWUgPSB0b05vZGUubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiBtb3JwaGVkTm9kZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVGV4dCBub2RlIHRvIHNvbWV0aGluZyBlbHNlXG4gICAgICAgICAgICAgICAgbW9ycGhlZE5vZGUgPSB0b05vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobW9ycGhlZE5vZGUgPT09IHRvTm9kZSkge1xuICAgICAgICAvLyBUaGUgXCJ0byBub2RlXCIgd2FzIG5vdCBjb21wYXRpYmxlIHdpdGggdGhlIFwiZnJvbSBub2RlXCIgc28gd2UgaGFkIHRvXG4gICAgICAgIC8vIHRvc3Mgb3V0IHRoZSBcImZyb20gbm9kZVwiIGFuZCB1c2UgdGhlIFwidG8gbm9kZVwiXG4gICAgICAgIG9uTm9kZURpc2NhcmRlZChmcm9tTm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbW9ycGhFbChtb3JwaGVkTm9kZSwgdG9Ob2RlLCBmYWxzZSwgY2hpbGRyZW5Pbmx5KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hhdCB3ZSB3aWxsIGRvIGhlcmUgaXMgd2FsayB0aGUgdHJlZSBmb3IgdGhlIERPTSBlbGVtZW50IHRoYXQgd2FzXG4gICAgICAgICAqIG1vdmVkIGZyb20gdGhlIHRhcmdldCBET00gdHJlZSB0byB0aGUgb3JpZ2luYWwgRE9NIHRyZWUgYW5kIHdlIHdpbGxcbiAgICAgICAgICogbG9vayBmb3Iga2V5ZWQgZWxlbWVudHMgdGhhdCBjb3VsZCBiZSBtYXRjaGVkIHRvIGtleWVkIGVsZW1lbnRzIHRoYXRcbiAgICAgICAgICogd2VyZSBlYXJsaWVyIGRpc2NhcmRlZC4gIElmIHdlIGZpbmQgYSBtYXRjaCB0aGVuIHdlIHdpbGwgbW92ZSB0aGVcbiAgICAgICAgICogc2F2ZWQgZWxlbWVudCBpbnRvIHRoZSBmaW5hbCBET00gdHJlZS5cbiAgICAgICAgICovXG4gICAgICAgIHZhciBoYW5kbGVNb3ZlZEVsID0gZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IGVsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBjdXJDaGlsZC5uZXh0U2libGluZztcblxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXROb2RlS2V5KGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzYXZlZEVsID0gc2F2ZWRFbHNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVkRWwgJiYgY29tcGFyZU5vZGVOYW1lcyhjdXJDaGlsZCwgc2F2ZWRFbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHNhdmVkRWwsIGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRydWU6IGFscmVhZHkgdmlzaXRlZCB0aGUgc2F2ZWQgZWwgdHJlZVxuICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChzYXZlZEVsLCBjdXJDaGlsZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IG5leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVtcHR5KHNhdmVkRWxzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGN1ckNoaWxkLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlTW92ZWRFbChjdXJDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3VyQ2hpbGQgPSBuZXh0U2libGluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUaGUgbG9vcCBiZWxvdyBpcyB1c2VkIHRvIHBvc3NpYmx5IG1hdGNoIHVwIGFueSBkaXNjYXJkZWRcbiAgICAgICAgLy8gZWxlbWVudHMgaW4gdGhlIG9yaWdpbmFsIERPTSB0cmVlIHdpdGggZWxlbWVuZXRzIGZyb20gdGhlXG4gICAgICAgIC8vIHRhcmdldCB0cmVlIHRoYXQgd2VyZSBtb3ZlZCBvdmVyIHdpdGhvdXQgdmlzaXRpbmcgdGhlaXJcbiAgICAgICAgLy8gY2hpbGRyZW5cbiAgICAgICAgaWYgKCFlbXB0eShzYXZlZEVscykpIHtcbiAgICAgICAgICAgIGhhbmRsZU1vdmVkRWxzTG9vcDpcbiAgICAgICAgICAgIHdoaWxlIChtb3ZlZEVscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbW92ZWRFbHNUZW1wID0gbW92ZWRFbHM7XG4gICAgICAgICAgICAgICAgbW92ZWRFbHMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGk8bW92ZWRFbHNUZW1wLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVNb3ZlZEVsKG1vdmVkRWxzVGVtcFtpXSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGVyZSBhcmUgbm8gbW9yZSB1bm1hdGNoZWQgZWxlbWVudHMgc28gY29tcGxldGVseSBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoZSBsb29wXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhayBoYW5kbGVNb3ZlZEVsc0xvb3A7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaXJlIHRoZSBcIm9uTm9kZURpc2NhcmRlZFwiIGV2ZW50IGZvciBhbnkgc2F2ZWQgZWxlbWVudHNcbiAgICAgICAgLy8gdGhhdCBuZXZlciBmb3VuZCBhIG5ldyBob21lIGluIHRoZSBtb3JwaGVkIERPTVxuICAgICAgICBmb3IgKHZhciBzYXZlZEVsSWQgaW4gc2F2ZWRFbHMpIHtcbiAgICAgICAgICAgIGlmIChzYXZlZEVscy5oYXNPd25Qcm9wZXJ0eShzYXZlZEVsSWQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNhdmVkRWwgPSBzYXZlZEVsc1tzYXZlZEVsSWRdO1xuICAgICAgICAgICAgICAgIG9uTm9kZURpc2NhcmRlZChzYXZlZEVsKTtcbiAgICAgICAgICAgICAgICB3YWxrRGlzY2FyZGVkQ2hpbGROb2RlcyhzYXZlZEVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICghY2hpbGRyZW5Pbmx5ICYmIG1vcnBoZWROb2RlICE9PSBmcm9tTm9kZSAmJiBmcm9tTm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgIC8vIElmIHdlIGhhZCB0byBzd2FwIG91dCB0aGUgZnJvbSBub2RlIHdpdGggYSBuZXcgbm9kZSBiZWNhdXNlIHRoZSBvbGRcbiAgICAgICAgLy8gbm9kZSB3YXMgbm90IGNvbXBhdGlibGUgd2l0aCB0aGUgdGFyZ2V0IG5vZGUgdGhlbiB3ZSBuZWVkIHRvXG4gICAgICAgIC8vIHJlcGxhY2UgdGhlIG9sZCBET00gbm9kZSBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUuIFRoaXMgaXMgb25seVxuICAgICAgICAvLyBwb3NzaWJsZSBpZiB0aGUgb3JpZ2luYWwgRE9NIG5vZGUgd2FzIHBhcnQgb2YgYSBET00gdHJlZSB3aGljaFxuICAgICAgICAvLyB3ZSBrbm93IGlzIHRoZSBjYXNlIGlmIGl0IGhhcyBhIHBhcmVudCBub2RlLlxuICAgICAgICBmcm9tTm9kZS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChtb3JwaGVkTm9kZSwgZnJvbU5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiBtb3JwaGVkTm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtb3JwaGRvbTtcbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuICAvLyBhdHRyaWJ1dGUgZXZlbnRzIChjYW4gYmUgc2V0IHdpdGggYXR0cmlidXRlcylcbiAgJ29uY2xpY2snLFxuICAnb25kYmxjbGljaycsXG4gICdvbm1vdXNlZG93bicsXG4gICdvbm1vdXNldXAnLFxuICAnb25tb3VzZW92ZXInLFxuICAnb25tb3VzZW1vdmUnLFxuICAnb25tb3VzZW91dCcsXG4gICdvbmRyYWdzdGFydCcsXG4gICdvbmRyYWcnLFxuICAnb25kcmFnZW50ZXInLFxuICAnb25kcmFnbGVhdmUnLFxuICAnb25kcmFnb3ZlcicsXG4gICdvbmRyb3AnLFxuICAnb25kcmFnZW5kJyxcbiAgJ29ua2V5ZG93bicsXG4gICdvbmtleXByZXNzJyxcbiAgJ29ua2V5dXAnLFxuICAnb251bmxvYWQnLFxuICAnb25hYm9ydCcsXG4gICdvbmVycm9yJyxcbiAgJ29ucmVzaXplJyxcbiAgJ29uc2Nyb2xsJyxcbiAgJ29uc2VsZWN0JyxcbiAgJ29uY2hhbmdlJyxcbiAgJ29uc3VibWl0JyxcbiAgJ29ucmVzZXQnLFxuICAnb25mb2N1cycsXG4gICdvbmJsdXInLFxuICAnb25pbnB1dCcsXG4gIC8vIG90aGVyIGNvbW1vbiBldmVudHNcbiAgJ29uY29udGV4dG1lbnUnLFxuICAnb25mb2N1c2luJyxcbiAgJ29uZm9jdXNvdXQnXG5dXG4iLCJpbXBvcnQgVXRpbHMgZnJvbSAnLi4vY29yZS9VdGlscydcbmltcG9ydCBUcmFuc2xhdG9yIGZyb20gJy4uL2NvcmUvVHJhbnNsYXRvcidcbmltcG9ydCBwcmV0dHlCeXRlcyBmcm9tICdwcmV0dHktYnl0ZXMnXG5pbXBvcnQgeW8gZnJvbSAneW8teW8nXG5pbXBvcnQgZWUgZnJvbSAnZXZlbnRzJ1xuaW1wb3J0IFVwcHlTb2NrZXQgZnJvbSAnLi9VcHB5U29ja2V0J1xuXG4vKipcbiAqIE1haW4gVXBweSBjb3JlXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdHMgZ2VuZXJhbCBvcHRpb25zLCBsaWtlIGxvY2FsZXMsIHRvIHNob3cgbW9kYWwgb3Igbm90IHRvIHNob3dcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29yZSB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgICAgLy8gbG9hZCBFbmdsaXNoIGFzIHRoZSBkZWZhdWx0IGxvY2FsZXNcbiAgICAgIGxvY2FsZXM6IHJlcXVpcmUoJy4uL2xvY2FsZXMvZW5fVVMuanMnKSxcbiAgICAgIGF1dG9Qcm9jZWVkOiB0cnVlLFxuICAgICAgZGVidWc6IGZhbHNlXG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIC8vIERpY3RhdGVzIGluIHdoYXQgb3JkZXIgZGlmZmVyZW50IHBsdWdpbiB0eXBlcyBhcmUgcmFuOlxuICAgIHRoaXMudHlwZXMgPSBbICdwcmVzZXR0ZXInLCAnb3JjaGVzdHJhdG9yJywgJ3Byb2dyZXNzaW5kaWNhdG9yJywgJ2FjcXVpcmVyJywgJ3VwbG9hZGVyJywgJ3ByZXNlbnRlcicgXVxuXG4gICAgdGhpcy50eXBlID0gJ2NvcmUnXG5cbiAgICAvLyBDb250YWluZXIgZm9yIGRpZmZlcmVudCB0eXBlcyBvZiBwbHVnaW5zXG4gICAgdGhpcy5wbHVnaW5zID0ge31cblxuICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHtsb2NhbGVzOiB0aGlzLm9wdHMubG9jYWxlc30pXG4gICAgdGhpcy5pMThuID0gdGhpcy50cmFuc2xhdG9yLnRyYW5zbGF0ZS5iaW5kKHRoaXMudHJhbnNsYXRvcilcbiAgICB0aGlzLmluaXRTb2NrZXQgPSB0aGlzLmluaXRTb2NrZXQuYmluZCh0aGlzKVxuXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IGVlLkV2ZW50RW1pdHRlcigpXG5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgZmlsZXM6IHt9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0cy5kZWJ1Zykge1xuICAgICAgLy8gZm9yIGRlYnVnZ2luZyBhbmQgdGVzdGluZ1xuICAgICAgZ2xvYmFsLlVwcHlTdGF0ZSA9IHRoaXMuc3RhdGVcbiAgICAgIGdsb2JhbC51cHB5TG9nID0gJydcbiAgICAgIGdsb2JhbC5VcHB5QWRkRmlsZSA9IHRoaXMuYWRkRmlsZS5iaW5kKHRoaXMpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgb24gYWxsIHBsdWdpbnMgYW5kIHJ1biBgdXBkYXRlYCBvbiB0aGVtLiBDYWxsZWQgZWFjaCB0aW1lIHdoZW4gc3RhdGUgY2hhbmdlc1xuICAgKlxuICAgKi9cbiAgdXBkYXRlQWxsICgpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLnBsdWdpbnMpLmZvckVhY2goKHBsdWdpblR5cGUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luc1twbHVnaW5UeXBlXS5mb3JFYWNoKChwbHVnaW4pID0+IHtcbiAgICAgICAgcGx1Z2luLnVwZGF0ZSgpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBzdGF0ZVxuICAgKlxuICAgKiBAcGFyYW0ge25ld1N0YXRlfSBvYmplY3RcbiAgICovXG4gIHNldFN0YXRlIChuZXdTdGF0ZSkge1xuICAgIHRoaXMubG9nKCdTZXR0aW5nIHN0YXRlIHRvOiAnKVxuICAgIHRoaXMubG9nKG5ld1N0YXRlKVxuICAgIHRoaXMuc3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLCBuZXdTdGF0ZSlcbiAgICB0aGlzLnVwZGF0ZUFsbCgpXG4gIH1cblxuICAvKipcbiAgICogR2V0cyBjdXJyZW50IHN0YXRlLCBtYWtpbmcgc3VyZSB0byBtYWtlIGEgY29weSBvZiB0aGUgc3RhdGUgb2JqZWN0IGFuZCBwYXNzIHRoYXQsXG4gICAqIGluc3RlYWQgb2YgYW4gYWN0dWFsIHJlZmVyZW5jZSB0byBgdGhpcy5zdGF0ZWBcbiAgICpcbiAgICovXG4gIGdldFN0YXRlICgpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZVxuICB9XG5cbiAgYWRkTWV0YSAobWV0YSwgZmlsZUlEKSB7XG4gICAgaWYgKHR5cGVvZiBmaWxlSUQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLmZpbGVzKVxuICAgICAgZm9yIChsZXQgZmlsZSBpbiB1cGRhdGVkRmlsZXMpIHtcbiAgICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVdLm1ldGEgPSBtZXRhXG4gICAgICB9XG4gICAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcbiAgICB9XG4gIH1cblxuICBhZGRGaWxlIChmaWxlKSB7XG4gICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5maWxlcylcblxuICAgIGNvbnN0IGZpbGVUeXBlID0gZmlsZS50eXBlLnNwbGl0KCcvJylcbiAgICBjb25zdCBmaWxlVHlwZUdlbmVyYWwgPSBmaWxlVHlwZVswXVxuICAgIGNvbnN0IGZpbGVUeXBlU3BlY2lmaWMgPSBmaWxlVHlwZVsxXVxuICAgIGNvbnN0IGZpbGVJRCA9IFV0aWxzLmdlbmVyYXRlRmlsZUlEKGZpbGUubmFtZSlcblxuICAgIHVwZGF0ZWRGaWxlc1tmaWxlSURdID0ge1xuICAgICAgc291cmNlOiBmaWxlLnNvdXJjZSB8fCAnJyxcbiAgICAgIGlkOiBmaWxlSUQsXG4gICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICB0eXBlOiB7XG4gICAgICAgIGdlbmVyYWw6IGZpbGVUeXBlR2VuZXJhbCxcbiAgICAgICAgc3BlY2lmaWM6IGZpbGVUeXBlU3BlY2lmaWNcbiAgICAgIH0sXG4gICAgICBkYXRhOiBmaWxlLmRhdGEsXG4gICAgICBwcm9ncmVzczogMCxcbiAgICAgIHRvdGFsU2l6ZTogZmlsZS5kYXRhLnNpemUgPyBwcmV0dHlCeXRlcyhmaWxlLmRhdGEuc2l6ZSkgOiAnPycsXG4gICAgICB1cGxvYWRlZFNpemU6IDAsXG4gICAgICBpc1JlbW90ZTogZmlsZS5pc1JlbW90ZSB8fCBmYWxzZSxcbiAgICAgIHJlbW90ZTogZmlsZS5yZW1vdGVcbiAgICB9XG5cbiAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcblxuICAgIGlmIChmaWxlVHlwZUdlbmVyYWwgPT09ICdpbWFnZScpIHtcbiAgICAgIC8vIHRoaXMuYWRkSW1nUHJldmlld1RvRmlsZSh1cGRhdGVkRmlsZXNbZmlsZUlEXSlcbiAgICAgIFV0aWxzLnJlYWRJbWFnZSh1cGRhdGVkRmlsZXNbZmlsZUlEXS5kYXRhLCAoaW1nRWwpID0+IHtcbiAgICAgICAgY29uc3QgbmV3SW1hZ2VXaWR0aCA9IDIwMFxuICAgICAgICBjb25zdCBuZXdJbWFnZUhlaWdodCA9IFV0aWxzLmdldFByb3BvcnRpb25hbEltYWdlSGVpZ2h0KGltZ0VsLCBuZXdJbWFnZVdpZHRoKVxuICAgICAgICBjb25zdCByZXNpemVkSW1nU3JjID0gVXRpbHMucmVzaXplSW1hZ2UoaW1nRWwsIG5ld0ltYWdlV2lkdGgsIG5ld0ltYWdlSGVpZ2h0KVxuXG4gICAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlSURdLnByZXZpZXdFbCA9IHlvYDxpbWcgYWx0PVwiJHtmaWxlLm5hbWV9XCIgc3JjPVwiJHtyZXNpemVkSW1nU3JjfVwiPmBcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSh7ZmlsZXM6IHVwZGF0ZWRGaWxlc30pXG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdHMuYXV0b1Byb2NlZWQpIHtcbiAgICAgIHRoaXMuZW1pdHRlci5lbWl0KCduZXh0JylcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGxpc3RlbmVycyBmb3IgYWxsIGdsb2JhbCBhY3Rpb25zLCBsaWtlOlxuICAgKiBgZmlsZS1hZGRgLCBgZmlsZS1yZW1vdmVgLCBgdXBsb2FkLXByb2dyZXNzYCwgYHJlc2V0YFxuICAgKlxuICAgKi9cbiAgYWN0aW9ucyAoKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9uKCdmaWxlLWFkZCcsIChkYXRhKSA9PiB7XG4gICAgICB0aGlzLmFkZEZpbGUoZGF0YSlcbiAgICB9KVxuXG4gICAgLy8gYHJlbW92ZS1maWxlYCByZW1vdmVzIGEgZmlsZSBmcm9tIGBzdGF0ZS5maWxlc2AsIGZvciBleGFtcGxlIHdoZW5cbiAgICAvLyBhIHVzZXIgZGVjaWRlcyBub3QgdG8gdXBsb2FkIHBhcnRpY3VsYXIgZmlsZSBhbmQgY2xpY2tzIGEgYnV0dG9uIHRvIHJlbW92ZSBpdFxuICAgIHRoaXMuZW1pdHRlci5vbignZmlsZS1yZW1vdmUnLCAoZmlsZUlEKSA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLmZpbGVzKVxuICAgICAgZGVsZXRlIHVwZGF0ZWRGaWxlc1tmaWxlSURdXG4gICAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcbiAgICB9KVxuXG4gICAgdGhpcy5lbWl0dGVyLm9uKCd1cGxvYWQtcHJvZ3Jlc3MnLCAoZGF0YSkgPT4ge1xuICAgICAgbGV0IHBlcmNlbnRhZ2UgPSAoZGF0YS5ieXRlc1VwbG9hZGVkIC8gZGF0YS5ieXRlc1RvdGFsICogMTAwKS50b0ZpeGVkKDIpXG4gICAgICBwZXJjZW50YWdlID0gTWF0aC5yb3VuZChwZXJjZW50YWdlKVxuXG4gICAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLmZpbGVzKVxuICAgICAgdXBkYXRlZEZpbGVzW2RhdGEuaWRdLnByb2dyZXNzID0gcGVyY2VudGFnZVxuICAgICAgdXBkYXRlZEZpbGVzW2RhdGEuaWRdLnVwbG9hZGVkU2l6ZSA9IGRhdGEuYnl0ZXNVcGxvYWRlZCA/IHByZXR0eUJ5dGVzKGRhdGEuYnl0ZXNVcGxvYWRlZCkgOiAnPydcblxuICAgICAgY29uc3QgaW5Qcm9ncmVzcyA9IE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykubWFwKChmaWxlKSA9PiB7XG4gICAgICAgIHJldHVybiBmaWxlLnByb2dyZXNzICE9PSAwXG4gICAgICB9KVxuXG4gICAgICAvLyBjYWxjdWxhdGUgdG90YWwgcHJvZ3Jlc3MsIHVzaW5nIHRoZSBudW1iZXIgb2YgZmlsZXMgY3VycmVudGx5IHVwbG9hZGluZyxcbiAgICAgIC8vIG11bHRpcGxpZWQgYnkgMTAwIGFuZCB0aGUgc3VtbSBvZiBpbmRpdmlkdWFsIHByb2dyZXNzIG9mIGVhY2ggZmlsZVxuICAgICAgY29uc3QgcHJvZ3Jlc3NNYXggPSBPYmplY3Qua2V5cyhpblByb2dyZXNzKS5sZW5ndGggKiAxMDBcbiAgICAgIGxldCBwcm9ncmVzc0FsbCA9IDBcbiAgICAgIE9iamVjdC5rZXlzKHVwZGF0ZWRGaWxlcykuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICBwcm9ncmVzc0FsbCA9IHByb2dyZXNzQWxsICsgdXBkYXRlZEZpbGVzW2ZpbGVdLnByb2dyZXNzXG4gICAgICB9KVxuXG4gICAgICBjb25zdCB0b3RhbFByb2dyZXNzID0gcHJvZ3Jlc3NBbGwgKiAxMDAgLyBwcm9ncmVzc01heFxuXG4gICAgICB0aGlzLnNldFN0YXRlKHtcbiAgICAgICAgdG90YWxQcm9ncmVzczogdG90YWxQcm9ncmVzcyxcbiAgICAgICAgZmlsZXM6IHVwZGF0ZWRGaWxlc1xuICAgICAgfSlcbiAgICB9KVxuXG4gICAgLy8gYHVwbG9hZC1zdWNjZXNzYCBhZGRzIHN1Y2Nlc3NmdWxseSB1cGxvYWRlZCBmaWxlIHRvIGBzdGF0ZS51cGxvYWRlZEZpbGVzYFxuICAgIC8vIGFuZCBmaXJlcyBgcmVtb3ZlLWZpbGVgIHRvIHJlbW92ZSBpdCBmcm9tIGBzdGF0ZS5maWxlc2BcbiAgICB0aGlzLmVtaXR0ZXIub24oJ3VwbG9hZC1zdWNjZXNzJywgKGZpbGUpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICB1cGRhdGVkRmlsZXNbZmlsZS5pZF0gPSBmaWxlXG4gICAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcbiAgICAgIC8vIHRoaXMubG9nKHRoaXMuc3RhdGUudXBsb2FkZWRGaWxlcylcbiAgICAgIC8vIHRoaXMuZW1pdHRlci5lbWl0KCdmaWxlLXJlbW92ZScsIGZpbGUuaWQpXG4gICAgfSlcbiAgfVxuXG4vKipcbiAqIFJlZ2lzdGVycyBhIHBsdWdpbiB3aXRoIENvcmVcbiAqXG4gKiBAcGFyYW0ge0NsYXNzfSBQbHVnaW4gb2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBvYmplY3QgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byBQbHVnaW4gbGF0ZXJcbiAqIEByZXR1cm4ge09iamVjdH0gc2VsZiBmb3IgY2hhaW5pbmdcbiAqL1xuICB1c2UgKFBsdWdpbiwgb3B0cykge1xuICAgIC8vIEluc3RhbnRpYXRlXG4gICAgY29uc3QgcGx1Z2luID0gbmV3IFBsdWdpbih0aGlzLCBvcHRzKVxuICAgIGNvbnN0IHBsdWdpbk5hbWUgPSBwbHVnaW4uaWRcbiAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdID0gdGhpcy5wbHVnaW5zW3BsdWdpbi50eXBlXSB8fCBbXVxuXG4gICAgaWYgKCFwbHVnaW5OYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdXIgcGx1Z2luIG11c3QgaGF2ZSBhIG5hbWUnKVxuICAgIH1cblxuICAgIGlmICghcGx1Z2luLnR5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91ciBwbHVnaW4gbXVzdCBoYXZlIGEgdHlwZScpXG4gICAgfVxuXG4gICAgbGV0IGV4aXN0c1BsdWdpbkFscmVhZHkgPSB0aGlzLmdldFBsdWdpbihwbHVnaW5OYW1lKVxuICAgIGlmIChleGlzdHNQbHVnaW5BbHJlYWR5KSB7XG4gICAgICBsZXQgbXNnID0gYEFscmVhZHkgZm91bmQgYSBwbHVnaW4gbmFtZWQgJyR7ZXhpc3RzUGx1Z2luQWxyZWFkeS5uYW1lfScuXG4gICAgICAgIFRyaWVkIHRvIHVzZTogJyR7cGx1Z2luTmFtZX0nLlxuICAgICAgICBVcHB5IGlzIGN1cnJlbnRseSBsaW1pdGVkIHRvIHJ1bm5pbmcgb25lIG9mIGV2ZXJ5IHBsdWdpbi5cbiAgICAgICAgU2hhcmUgeW91ciB1c2UgY2FzZSB3aXRoIHVzIG92ZXIgYXRcbiAgICAgICAgaHR0cHM6Ly9naXRodWIuY29tL3RyYW5zbG9hZGl0L3VwcHkvaXNzdWVzL1xuICAgICAgICBpZiB5b3Ugd2FudCB1cyB0byByZWNvbnNpZGVyLmBcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpXG4gICAgfVxuXG4gICAgdGhpcy5wbHVnaW5zW3BsdWdpbi50eXBlXS5wdXNoKHBsdWdpbilcblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuLyoqXG4gKiBGaW5kIG9uZSBQbHVnaW4gYnkgbmFtZVxuICpcbiAqIEBwYXJhbSBzdHJpbmcgbmFtZSBkZXNjcmlwdGlvblxuICovXG4gIGdldFBsdWdpbiAobmFtZSkge1xuICAgIGxldCBmb3VuZFBsdWdpbiA9IGZhbHNlXG4gICAgdGhpcy5pdGVyYXRlUGx1Z2lucygocGx1Z2luKSA9PiB7XG4gICAgICBjb25zdCBwbHVnaW5OYW1lID0gcGx1Z2luLmlkXG4gICAgICBpZiAocGx1Z2luTmFtZSA9PT0gbmFtZSkge1xuICAgICAgICBmb3VuZFBsdWdpbiA9IHBsdWdpblxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3VuZFBsdWdpblxuICB9XG5cbi8qKlxuICogSXRlcmF0ZSB0aHJvdWdoIGFsbCBgdXNlYGQgcGx1Z2luc1xuICpcbiAqIEBwYXJhbSBmdW5jdGlvbiBtZXRob2QgZGVzY3JpcHRpb25cbiAqL1xuICBpdGVyYXRlUGx1Z2lucyAobWV0aG9kKSB7XG4gICAgT2JqZWN0LmtleXModGhpcy5wbHVnaW5zKS5mb3JFYWNoKChwbHVnaW5UeXBlKSA9PiB7XG4gICAgICB0aGlzLnBsdWdpbnNbcGx1Z2luVHlwZV0uZm9yRWFjaChtZXRob2QpXG4gICAgfSlcbiAgfVxuXG4vKipcbiAqIExvZ3Mgc3R1ZmYgdG8gY29uc29sZSwgb25seSBpZiBgZGVidWdgIGlzIHNldCB0byB0cnVlLiBTaWxlbnQgaW4gcHJvZHVjdGlvbi5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd8T2JqZWN0fSB0byBsb2dcbiAqL1xuICBsb2cgKG1zZykge1xuICAgIGlmICghdGhpcy5vcHRzLmRlYnVnKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKG1zZyA9PT0gYCR7bXNnfWApIHtcbiAgICAgIGNvbnNvbGUubG9nKGBMT0c6ICR7bXNnfWApXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKCdMT0fihpMnKVxuICAgICAgY29uc29sZS5kaXIobXNnKVxuICAgIH1cbiAgICBnbG9iYWwudXBweUxvZyA9IGdsb2JhbC51cHB5TG9nICsgJ1xcbicgKyAnREVCVUcgTE9HOiAnICsgbXNnXG4gIH1cblxuLyoqXG4gKiBSdW5zIGFsbCBwbHVnaW5zIG9mIHRoZSBzYW1lIHR5cGUgaW4gcGFyYWxsZWxcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSB0aGF0IHdhbnRzIHRvIHNldCBwcm9ncmVzc1xuICogQHBhcmFtIHthcnJheX0gZmlsZXNcbiAqIEByZXR1cm4ge1Byb21pc2V9IG9mIGFsbCBtZXRob2RzXG4gKi9cbiAgcnVuVHlwZSAodHlwZSwgbWV0aG9kLCBmaWxlcykge1xuICAgIGNvbnN0IG1ldGhvZHMgPSB0aGlzLnBsdWdpbnNbdHlwZV0ubWFwKFxuICAgICAgKHBsdWdpbikgPT4gcGx1Z2luW21ldGhvZF0oVXRpbHMuZmxhdHRlbihmaWxlcykpXG4gICAgKVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKG1ldGhvZHMpXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiBjb25zb2xlLmVycm9yKGVycm9yKSlcbiAgfVxuXG4vKipcbiAqIFJ1bnMgYSB3YXRlcmZhbGwgb2YgcnVuVHlwZSBwbHVnaW4gcGFja3MsIGxpa2Ugc286XG4gKiBBbGwgcHJlc2V0ZXJzKGRhdGEpIC0tPiBBbGwgYWNxdWlyZXJzKGRhdGEpIC0tPiBBbGwgdXBsb2FkZXJzKGRhdGEpIC0tPiBkb25lXG4gKi9cbiAgcnVuICgpIHtcbiAgICB0aGlzLmxvZygnQ29yZSBpcyBydW4sIGluaXRpYWxpemluZyBhY3Rpb25zLCBpbnN0YWxsaW5nIHBsdWdpbnMuLi4nKVxuXG4gICAgdGhpcy5hY3Rpb25zKClcblxuICAgIC8vIEZvcnNlIHNldCBgYXV0b1Byb2NlZWRgIG9wdGlvbiB0byBmYWxzZSBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgc2VsZWN0b3IgUGx1Z2lucyBhY3RpdmVcbiAgICBpZiAodGhpcy5wbHVnaW5zLmFjcXVpcmVyICYmIHRoaXMucGx1Z2lucy5hY3F1aXJlci5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLm9wdHMuYXV0b1Byb2NlZWQgPSBmYWxzZVxuICAgIH1cblxuICAgIC8vIEluc3RhbGwgYWxsIHBsdWdpbnNcbiAgICBPYmplY3Qua2V5cyh0aGlzLnBsdWdpbnMpLmZvckVhY2goKHBsdWdpblR5cGUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luc1twbHVnaW5UeXBlXS5mb3JFYWNoKChwbHVnaW4pID0+IHtcbiAgICAgICAgcGx1Z2luLmluc3RhbGwoKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgcmV0dXJuXG5cbiAgICAvLyBFYWNoIFBsdWdpbiBjYW4gaGF2ZSBgcnVuYCBhbmQvb3IgYGluc3RhbGxgIG1ldGhvZHMuXG4gICAgLy8gYGluc3RhbGxgIGFkZHMgZXZlbnQgbGlzdGVuZXJzIGFuZCBkb2VzIHNvbWUgbm9uLWJsb2NraW5nIHdvcmssIHVzZWZ1bCBmb3IgYHByb2dyZXNzaW5kaWNhdG9yYCxcbiAgICAvLyBgcnVuYCB3YWl0cyBmb3IgdGhlIHByZXZpb3VzIHN0ZXAgdG8gZmluaXNoICh1c2VyIHNlbGVjdHMgZmlsZXMpIGJlZm9yZSBwcm9jZWVkaW5nXG4gICAgLy8gWydpbnN0YWxsJywgJ3J1biddLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgIC8vICAgLy8gRmlyc3Qgd2Ugc2VsZWN0IG9ubHkgcGx1Z2lucyBvZiBjdXJyZW50IHR5cGUsXG4gICAgLy8gICAvLyB0aGVuIGNyZWF0ZSBhbiBhcnJheSBvZiBydW5UeXBlIG1ldGhvZHMgb2YgdGhpcyBwbHVnaW5zXG4gICAgLy8gICBjb25zdCB0eXBlTWV0aG9kcyA9IHRoaXMudHlwZXMuZmlsdGVyKCh0eXBlKSA9PiB0aGlzLnBsdWdpbnNbdHlwZV0pXG4gICAgLy8gICAgIC5tYXAoKHR5cGUpID0+IHRoaXMucnVuVHlwZS5iaW5kKHRoaXMsIHR5cGUsIG1ldGhvZCkpXG4gICAgLy8gICAvLyBSdW4gd2F0ZXJmYWxsIG9mIHR5cGVNZXRob2RzXG4gICAgLy8gICByZXR1cm4gVXRpbHMucHJvbWlzZVdhdGVyZmFsbCh0eXBlTWV0aG9kcylcbiAgICAvLyAgICAgLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgIC8vICAgICAgIC8vIElmIHJlc3VsdHMgYXJlIGVtcHR5LCBkb24ndCBsb2cgdXBsb2FkIHJlc3VsdHMuIEhhc24ndCBydW4geWV0LlxuICAgIC8vICAgICAgIGlmIChyZXN1bHRbMF0gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vICAgICAgICAgdGhpcy5sb2cocmVzdWx0KVxuICAgIC8vICAgICAgICAgdGhpcy5sb2coJ1VwbG9hZCByZXN1bHQgLT4gc3VjY2VzcyEnKVxuICAgIC8vICAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIC8vICAgICAgIH1cbiAgICAvLyAgICAgfSlcbiAgICAvLyAgICAgLmNhdGNoKChlcnJvcikgPT4gdGhpcy5sb2coJ1VwbG9hZCByZXN1bHQgLT4gZmFpbGVkOicsIGVycm9yKSlcbiAgICAvLyB9KVxuICB9XG5cbiAgaW5pdFNvY2tldCAob3B0cykge1xuICAgIGlmICghdGhpcy5zb2NrZXQpIHtcbiAgICAgIHRoaXMuc29ja2V0ID0gbmV3IFVwcHlTb2NrZXQob3B0cylcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zb2NrZXRcbiAgfVxufVxuIiwiLyoqXG4gKiBUcmFuc2xhdGVzIHN0cmluZ3Mgd2l0aCBpbnRlcnBvbGF0aW9uICYgcGx1cmFsaXphdGlvbiBzdXBwb3J0LkV4dGVuc2libGUgd2l0aCBjdXN0b20gZGljdGlvbmFyaWVzXG4gKiBhbmQgcGx1cmFsaXphdGlvbiBmdW5jdGlvbnMuXG4gKlxuICogQm9ycm93cyBoZWF2aWx5IGZyb20gYW5kIGluc3BpcmVkIGJ5IFBvbHlnbG90IGh0dHBzOi8vZ2l0aHViLmNvbS9haXJibmIvcG9seWdsb3QuanMsXG4gKiBiYXNpY2FsbHkgYSBzdHJpcHBlZC1kb3duIHZlcnNpb24gb2YgaXQuIERpZmZlcmVuY2VzOiBwbHVyYWxpemF0aW9uIGZ1bmN0aW9ucyBhcmUgbm90IGhhcmRjb2RlZFxuICogYW5kIGNhbiBiZSBlYXNpbHkgYWRkZWQgYW1vbmcgd2l0aCBkaWN0aW9uYXJpZXMsIG5lc3RlZCBvYmplY3RzIGFyZSB1c2VkIGZvciBwbHVyYWxpemF0aW9uXG4gKiBhcyBvcHBvc2VkIHRvIGB8fHx8YCBkZWxpbWV0ZXJcbiAqXG4gKiBVc2FnZSBleGFtcGxlOiBgdHJhbnNsYXRvci50cmFuc2xhdGUoJ2ZpbGVzX2Nob3NlbicsIHtzbWFydF9jb3VudDogM30pYFxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRyYW5zbGF0b3Ige1xuICBjb25zdHJ1Y3RvciAob3B0cykge1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge31cbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcbiAgfVxuXG4vKipcbiAqIFRha2VzIGEgc3RyaW5nIHdpdGggcGxhY2Vob2xkZXIgdmFyaWFibGVzIGxpa2UgYCV7c21hcnRfY291bnR9IGZpbGUgc2VsZWN0ZWRgXG4gKiBhbmQgcmVwbGFjZXMgaXQgd2l0aCB2YWx1ZXMgZnJvbSBvcHRpb25zIGB7c21hcnRfY291bnQ6IDV9YFxuICpcbiAqIEBsaWNlbnNlIGh0dHBzOi8vZ2l0aHViLmNvbS9haXJibmIvcG9seWdsb3QuanMvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICogdGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vYWlyYm5iL3BvbHlnbG90LmpzL2Jsb2IvbWFzdGVyL2xpYi9wb2x5Z2xvdC5qcyNMMjk5XG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBocmFzZSB0aGF0IG5lZWRzIGludGVycG9sYXRpb24sIHdpdGggcGxhY2Vob2xkZXJzXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB3aXRoIHZhbHVlcyB0aGF0IHdpbGwgYmUgdXNlZCB0byByZXBsYWNlIHBsYWNlaG9sZGVyc1xuICogQHJldHVybiB7c3RyaW5nfSBpbnRlcnBvbGF0ZWRcbiAqL1xuICBpbnRlcnBvbGF0ZSAocGhyYXNlLCBvcHRpb25zKSB7XG4gICAgY29uc3QgcmVwbGFjZSA9IFN0cmluZy5wcm90b3R5cGUucmVwbGFjZVxuICAgIGNvbnN0IGRvbGxhclJlZ2V4ID0gL1xcJC9nXG4gICAgY29uc3QgZG9sbGFyQmlsbHNZYWxsID0gJyQkJCQnXG5cbiAgICBmb3IgKGxldCBhcmcgaW4gb3B0aW9ucykge1xuICAgICAgaWYgKGFyZyAhPT0gJ18nICYmIG9wdGlvbnMuaGFzT3duUHJvcGVydHkoYXJnKSkge1xuICAgICAgICAvLyBFbnN1cmUgcmVwbGFjZW1lbnQgdmFsdWUgaXMgZXNjYXBlZCB0byBwcmV2ZW50IHNwZWNpYWwgJC1wcmVmaXhlZFxuICAgICAgICAvLyByZWdleCByZXBsYWNlIHRva2Vucy4gdGhlIFwiJCQkJFwiIGlzIG5lZWRlZCBiZWNhdXNlIGVhY2ggXCIkXCIgbmVlZHMgdG9cbiAgICAgICAgLy8gYmUgZXNjYXBlZCB3aXRoIFwiJFwiIGl0c2VsZiwgYW5kIHdlIG5lZWQgdHdvIGluIHRoZSByZXN1bHRpbmcgb3V0cHV0LlxuICAgICAgICB2YXIgcmVwbGFjZW1lbnQgPSBvcHRpb25zW2FyZ11cbiAgICAgICAgaWYgKHR5cGVvZiByZXBsYWNlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXBsYWNlbWVudCA9IHJlcGxhY2UuY2FsbChvcHRpb25zW2FyZ10sIGRvbGxhclJlZ2V4LCBkb2xsYXJCaWxsc1lhbGwpXG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgY3JlYXRlIGEgbmV3IGBSZWdFeHBgIGVhY2ggdGltZSBpbnN0ZWFkIG9mIHVzaW5nIGEgbW9yZS1lZmZpY2llbnRcbiAgICAgICAgLy8gc3RyaW5nIHJlcGxhY2Ugc28gdGhhdCB0aGUgc2FtZSBhcmd1bWVudCBjYW4gYmUgcmVwbGFjZWQgbXVsdGlwbGUgdGltZXNcbiAgICAgICAgLy8gaW4gdGhlIHNhbWUgcGhyYXNlLlxuICAgICAgICBwaHJhc2UgPSByZXBsYWNlLmNhbGwocGhyYXNlLCBuZXcgUmVnRXhwKCclXFxcXHsnICsgYXJnICsgJ1xcXFx9JywgJ2cnKSwgcmVwbGFjZW1lbnQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwaHJhc2VcbiAgfVxuXG4vKipcbiAqIFB1YmxpYyB0cmFuc2xhdGUgbWV0aG9kXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgd2l0aCB2YWx1ZXMgdGhhdCB3aWxsIGJlIHVzZWQgbGF0ZXIgdG8gcmVwbGFjZSBwbGFjZWhvbGRlcnMgaW4gc3RyaW5nXG4gKiBAcmV0dXJuIHtzdHJpbmd9IHRyYW5zbGF0ZWQgKGFuZCBpbnRlcnBvbGF0ZWQpXG4gKi9cbiAgdHJhbnNsYXRlIChrZXksIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnNtYXJ0X2NvdW50KSB7XG4gICAgICB2YXIgcGx1cmFsID0gdGhpcy5vcHRzLmxvY2FsZXMucGx1cmFsaXplKG9wdGlvbnMuc21hcnRfY291bnQpXG4gICAgICByZXR1cm4gdGhpcy5pbnRlcnBvbGF0ZSh0aGlzLm9wdHMubG9jYWxlcy5zdHJpbmdzW2tleV1bcGx1cmFsXSwgb3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5pbnRlcnBvbGF0ZSh0aGlzLm9wdHMubG9jYWxlcy5zdHJpbmdzW2tleV0sIG9wdGlvbnMpXG4gIH1cbn1cbiIsImltcG9ydCBlZSBmcm9tICdldmVudHMnXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFVwcHlTb2NrZXQge1xuICBjb25zdHJ1Y3RvciAob3B0cykge1xuICAgIHRoaXMucXVldWVkID0gW11cbiAgICB0aGlzLmlzT3BlbiA9IGZhbHNlXG4gICAgdGhpcy5zb2NrZXQgPSBuZXcgV2ViU29ja2V0KG9wdHMudGFyZ2V0KVxuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBlZS5FdmVudEVtaXR0ZXIoKVxuXG4gICAgdGhpcy5zb2NrZXQub25vcGVuID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gdHJ1ZVxuXG4gICAgICB3aGlsZSAodGhpcy5xdWV1ZWQubGVuZ3RoID4gMCAmJiB0aGlzLmlzT3Blbikge1xuICAgICAgICBjb25zdCBmaXJzdCA9IHRoaXMucXVldWVkWzBdXG4gICAgICAgIHRoaXMuc2VuZChmaXJzdC5hY3Rpb24sIGZpcnN0LnBheWxvYWQpXG4gICAgICAgIHRoaXMucXVldWVkID0gdGhpcy5xdWV1ZWQuc2xpY2UoMSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNvY2tldC5vbmNsb3NlID0gKGUpID0+IHtcbiAgICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB9XG5cbiAgICB0aGlzLl9oYW5kbGVNZXNzYWdlID0gdGhpcy5faGFuZGxlTWVzc2FnZS5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSB0aGlzLl9oYW5kbGVNZXNzYWdlXG5cbiAgICB0aGlzLmVtaXQgPSB0aGlzLmVtaXQuYmluZCh0aGlzKVxuICAgIHRoaXMub24gPSB0aGlzLm9uLmJpbmQodGhpcylcbiAgICB0aGlzLm9uY2UgPSB0aGlzLm9uY2UuYmluZCh0aGlzKVxuICAgIHRoaXMuc2VuZCA9IHRoaXMuc2VuZC5iaW5kKHRoaXMpXG4gIH1cblxuICBzZW5kIChhY3Rpb24sIHBheWxvYWQpIHtcbiAgICAvLyBhdHRhY2ggdXVpZFxuXG4gICAgaWYgKCF0aGlzLmlzT3Blbikge1xuICAgICAgdGhpcy5xdWV1ZWQucHVzaCh7YWN0aW9uLCBwYXlsb2FkfSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgYWN0aW9uLFxuICAgICAgcGF5bG9hZFxuICAgIH0pKVxuICB9XG5cbiAgb24gKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIHRoaXMuZW1pdHRlci5vbihhY3Rpb24sIGhhbmRsZXIpXG4gIH1cblxuICBlbWl0IChhY3Rpb24sIHBheWxvYWQpIHtcbiAgICB0aGlzLmVtaXR0ZXIuZW1pdChhY3Rpb24sIHBheWxvYWQpXG4gIH1cblxuICBvbmNlIChhY3Rpb24sIGhhbmRsZXIpIHtcbiAgICB0aGlzLmVtaXR0ZXIub25jZShhY3Rpb24sIGhhbmRsZXIpXG4gIH1cblxuICBfaGFuZGxlTWVzc2FnZSAoZSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gSlNPTi5wYXJzZShlLmRhdGEpXG4gICAgICB0aGlzLmVtaXQobWVzc2FnZS5hY3Rpb24sIG1lc3NhZ2UucGF5bG9hZClcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICB9XG4gIH1cbn1cbiIsIi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHNtYWxsIHV0aWxpdHkgZnVuY3Rpb25zIHRoYXQgaGVscCB3aXRoIGRvbSBtYW5pcHVsYXRpb24sIGFkZGluZyBsaXN0ZW5lcnMsXG4gKiBwcm9taXNlcyBhbmQgb3RoZXIgZ29vZCB0aGluZ3MuXG4gKlxuICogQG1vZHVsZSBVdGlsc1xuICovXG5cbi8qKlxuICogUnVucyBhIHdhdGVyZmFsbCBvZiBwcm9taXNlczogY2FsbHMgZWFjaCB0YXNrLCBwYXNzaW5nIHRoZSByZXN1bHRcbiAqIGZyb20gdGhlIHByZXZpb3VzIG9uZSBhcyBhbiBhcmd1bWVudC4gVGhlIGZpcnN0IHRhc2sgaXMgcnVuIHdpdGggYW4gZW1wdHkgYXJyYXkuXG4gKlxuICogQG1lbWJlcm9mIFV0aWxzXG4gKiBAcGFyYW0ge2FycmF5fSBtZXRob2RzIG9mIFByb21pc2VzIHRvIHJ1biB3YXRlcmZhbGwgb25cbiAqIEByZXR1cm4ge1Byb21pc2V9IG9mIHRoZSBmaW5hbCB0YXNrXG4gKi9cbmZ1bmN0aW9uIHByb21pc2VXYXRlcmZhbGwgKG1ldGhvZHMpIHtcbiAgY29uc3QgW3Jlc29sdmVkUHJvbWlzZSwgLi4udGFza3NdID0gbWV0aG9kc1xuICBjb25zdCBmaW5hbFRhc2tQcm9taXNlID0gdGFza3MucmVkdWNlKChwcmV2VGFza1Byb21pc2UsIHRhc2spID0+IHtcbiAgICByZXR1cm4gcHJldlRhc2tQcm9taXNlLnRoZW4odGFzaylcbiAgfSwgcmVzb2x2ZWRQcm9taXNlKFtdKSkgLy8gaW5pdGlhbCB2YWx1ZVxuXG4gIHJldHVybiBmaW5hbFRhc2tQcm9taXNlXG59XG5cbi8qKlxuICogU2hhbGxvdyBmbGF0dGVuIG5lc3RlZCBhcnJheXMuXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW4gKGFycikge1xuICByZXR1cm4gW10uY29uY2F0LmFwcGx5KFtdLCBhcnIpXG59XG5cbi8qKlxuICogYHF1ZXJ5U2VsZWN0b3JBbGxgIHRoYXQgcmV0dXJucyBhIG5vcm1hbCBhcnJheSBpbnN0ZWFkIG9mIGZpbGVMaXN0XG4gKi9cbmZ1bmN0aW9uIHFzYSAoc2VsZWN0b3IsIGNvbnRleHQpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKChjb250ZXh0IHx8IGRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSB8fCBbXSlcbn1cblxuLyoqXG4gKiBQYXJ0aXRpb24gYXJyYXkgYnkgYSBncm91cGluZyBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge1t0eXBlXX0gYXJyYXkgICAgICBJbnB1dCBhcnJheVxuICogQHBhcmFtICB7W3R5cGVdfSBncm91cGluZ0ZuIEdyb3VwaW5nIGZ1bmN0aW9uXG4gKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgICAgQXJyYXkgb2YgYXJyYXlzXG4gKi9cbmZ1bmN0aW9uIGdyb3VwQnkgKGFycmF5LCBncm91cGluZ0ZuKSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKHJlc3VsdCwgaXRlbSkgPT4ge1xuICAgIGxldCBrZXkgPSBncm91cGluZ0ZuKGl0ZW0pXG4gICAgbGV0IHhzID0gcmVzdWx0LmdldChrZXkpIHx8IFtdXG4gICAgeHMucHVzaChpdGVtKVxuICAgIHJlc3VsdC5zZXQoa2V5LCB4cylcbiAgICByZXR1cm4gcmVzdWx0XG4gIH0sIG5ldyBNYXAoKSlcbn1cblxuLyoqXG4gKiBUZXN0cyBpZiBldmVyeSBhcnJheSBlbGVtZW50IHBhc3NlcyBwcmVkaWNhdGVcbiAqIEBwYXJhbSAge0FycmF5fSAgYXJyYXkgICAgICAgSW5wdXQgYXJyYXlcbiAqIEBwYXJhbSAge09iamVjdH0gcHJlZGljYXRlRm4gUHJlZGljYXRlXG4gKiBAcmV0dXJuIHtib29sfSAgICAgICAgICAgICAgIEV2ZXJ5IGVsZW1lbnQgcGFzc1xuICovXG5mdW5jdGlvbiBldmVyeSAoYXJyYXksIHByZWRpY2F0ZUZuKSB7XG4gIHJldHVybiBhcnJheS5yZWR1Y2UoKHJlc3VsdCwgaXRlbSkgPT4ge1xuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICByZXR1cm4gcHJlZGljYXRlRm4oaXRlbSlcbiAgfSwgdHJ1ZSlcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBsaXN0IGludG8gYXJyYXlcbiovXG5mdW5jdGlvbiB0b0FycmF5IChsaXN0KSB7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChsaXN0IHx8IFtdLCAwKVxufVxuXG4vKipcbiAqIFRha2VzIGEgZmlsZU5hbWUgYW5kIHR1cm5zIGl0IGludG8gZmlsZUlELCBieSBjb252ZXJ0aW5nIHRvIGxvd2VyY2FzZSxcbiAqIHJlbW92aW5nIGV4dHJhIGNoYXJhY3RlcnMgYW5kIGFkZGluZyB1bml4IHRpbWVzdGFtcFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlTmFtZVxuICpcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVGaWxlSUQgKGZpbGVOYW1lKSB7XG4gIGxldCBmaWxlSUQgPSBmaWxlTmFtZS50b0xvd2VyQ2FzZSgpXG4gIGZpbGVJRCA9IGZpbGVJRC5yZXBsYWNlKC9bXkEtWjAtOV0vaWcsICcnKVxuICBmaWxlSUQgPSBmaWxlSUQgKyBEYXRlLm5vdygpXG4gIHJldHVybiBmaWxlSURcbn1cblxuZnVuY3Rpb24gZXh0ZW5kICguLi5vYmpzKSB7XG4gIHJldHVybiBPYmplY3QuYXNzaWduLmFwcGx5KHRoaXMsIFt7fV0uY29uY2F0KG9ianMpKVxufVxuXG4vKipcbiAqIFRha2VzIGZ1bmN0aW9uIG9yIGNsYXNzLCByZXR1cm5zIGl0cyBuYW1lLlxuICogQmVjYXVzZSBJRSBkb2VzbuKAmXQgc3VwcG9ydCBgY29uc3RydWN0b3IubmFtZWAuXG4gKiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kZmtheWUvNjM4NDQzOSwgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTU3MTQ0NDVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZm4g4oCUIGZ1bmN0aW9uXG4gKlxuICovXG5mdW5jdGlvbiBnZXRGbk5hbWUgKGZuKSB7XG4gIHZhciBmID0gdHlwZW9mIGZuID09PSAnZnVuY3Rpb24nXG4gIHZhciBzID0gZiAmJiAoKGZuLm5hbWUgJiYgWycnLCBmbi5uYW1lXSkgfHwgZm4udG9TdHJpbmcoKS5tYXRjaCgvZnVuY3Rpb24gKFteXFwoXSspLykpXG4gIHJldHVybiAoIWYgJiYgJ25vdCBhIGZ1bmN0aW9uJykgfHwgKHMgJiYgc1sxXSB8fCAnYW5vbnltb3VzJylcbn1cblxuLyoqXG4gKiBSZWFkcyBpbWFnZSBhcyBkYXRhIFVSSSBmcm9tIGZpbGUgb2JqZWN0LFxuICogdGhlIG9uZSB5b3UgZ2V0IGZyb20gaW5wdXRbdHlwZT1maWxlXSBvciBkcmFnICYgZHJvcC5cbiAqIFRoaXMgd2lsbCBvbmx5IHJlYWQgaW1hZ2UgZmlsZXMsIHNraXBwaW5nIG90aGVyc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBpbWdPYmplY3RcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIGNhbGxiYWNrIHRoYXQgd2lsbCBiZSBjYWxsZWQgb25jZSB0aGUgaW1hZ2UgaXMgcmVhZFxuICpcbiAqL1xuZnVuY3Rpb24gcmVhZEltYWdlIChpbWdPYmplY3QsIGNiKSB7XG4gIC8vIGlmICghaW1nT2JqZWN0LnR5cGUubWF0Y2goL2ltYWdlLiovKSkge1xuICAvLyAgIGNvbnNvbGUubG9nKCdUaGUgZmlsZSBpcyBub3QgYW4gaW1hZ2U6ICcsIGltZ09iamVjdC50eXBlKVxuICAvLyAgIHJldHVyblxuICAvLyB9XG5cbiAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICB2YXIgaW1nU3JjQmFzZTY0ID0gZXYudGFyZ2V0LnJlc3VsdFxuICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKVxuICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gY2IoaW1nKVxuICAgIH1cbiAgICBpbWcuc3JjID0gaW1nU3JjQmFzZTY0XG4gIH0pXG4gIHJlYWRlci5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBjb25zb2xlLmxvZygnRmlsZVJlYWRlciBlcnJvcicgKyBlcnIpXG4gIH0pXG4gIHJlYWRlci5yZWFkQXNEYXRhVVJMKGltZ09iamVjdClcbn1cblxuZnVuY3Rpb24gZ2V0UHJvcG9ydGlvbmFsSW1hZ2VIZWlnaHQgKGltZywgbmV3V2lkdGgpIHtcbiAgdmFyIGFzcGVjdCA9IGltZy53aWR0aCAvIGltZy5oZWlnaHRcbiAgdmFyIG5ld0hlaWdodCA9IE1hdGgucm91bmQobmV3V2lkdGggLyBhc3BlY3QpXG4gIHJldHVybiBuZXdIZWlnaHRcbn1cblxuLyoqXG4gKiBSZXNpemVzIGFuIGltYWdlIHRvIHNwZWNpZmllZCB3aWR0aCBhbmQgaGVpZ2h0LCB1c2luZyBjYW52YXNcbiAqIFNlZSBodHRwczovL2Rhdmlkd2Fsc2gubmFtZS9yZXNpemUtaW1hZ2UtY2FudmFzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGltZyBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gd2lkdGggb2YgdGhlIHJlc3VsdGluZyBpbWFnZVxuICogQHBhcmFtIHtTdHJpbmd9IGhlaWdodCBvZiB0aGUgcmVzdWx0aW5nIGltYWdlXG4gKiBAcmV0dXJuIHtTdHJpbmd9IGRhdGFVUkwgb2YgdGhlIHJlc2l6ZWQgaW1hZ2VcbiAqL1xuZnVuY3Rpb24gcmVzaXplSW1hZ2UgKGltZywgd2lkdGgsIGhlaWdodCkge1xuICAvLyBjcmVhdGUgYW4gb2ZmLXNjcmVlbiBjYW52YXNcbiAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG4gIC8vIHNldCBpdHMgZGltZW5zaW9uIHRvIHRhcmdldCBzaXplXG4gIGNhbnZhcy53aWR0aCA9IHdpZHRoXG4gIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHRcblxuICAvLyBkcmF3IHNvdXJjZSBpbWFnZSBpbnRvIHRoZSBvZmYtc2NyZWVuIGNhbnZhczpcbiAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIHdpZHRoLCBoZWlnaHQpXG5cbiAgLy8gZW5jb2RlIGltYWdlIHRvIGRhdGEtdXJpIHdpdGggYmFzZTY0IHZlcnNpb24gb2YgY29tcHJlc3NlZCBpbWFnZVxuICAvLyBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS9qcGVnJywgcXVhbGl0eSk7ICAvLyBxdWFsaXR5ID0gWzAuMCwgMS4wXVxuICByZXR1cm4gY2FudmFzLnRvRGF0YVVSTCgpXG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgcHJvbWlzZVdhdGVyZmFsbCxcbiAgZ2VuZXJhdGVGaWxlSUQsXG4gIGdldEZuTmFtZSxcbiAgdG9BcnJheSxcbiAgZXZlcnksXG4gIGZsYXR0ZW4sXG4gIGdyb3VwQnksXG4gIHFzYSxcbiAgZXh0ZW5kLFxuICByZWFkSW1hZ2UsXG4gIHJlc2l6ZUltYWdlLFxuICBnZXRQcm9wb3J0aW9uYWxJbWFnZUhlaWdodFxufVxuIiwiY29uc3QgZW5fVVMgPSB7fVxuXG5lbl9VUy5zdHJpbmdzID0ge1xuICBjaG9vc2VGaWxlOiAnQ2hvb3NlIGEgZmlsZScsXG4gIHlvdUhhdmVDaG9zZW46ICdZb3UgaGF2ZSBjaG9zZW46ICV7ZmlsZU5hbWV9JyxcbiAgb3JEcmFnRHJvcDogJ29yIGRyYWcgaXQgaGVyZScsXG4gIGZpbGVzQ2hvc2VuOiB7XG4gICAgMDogJyV7c21hcnRfY291bnR9IGZpbGUgc2VsZWN0ZWQnLFxuICAgIDE6ICcle3NtYXJ0X2NvdW50fSBmaWxlcyBzZWxlY3RlZCdcbiAgfSxcbiAgZmlsZXNVcGxvYWRlZDoge1xuICAgIDA6ICcle3NtYXJ0X2NvdW50fSBmaWxlIHVwbG9hZGVkJyxcbiAgICAxOiAnJXtzbWFydF9jb3VudH0gZmlsZXMgdXBsb2FkZWQnXG4gIH0sXG4gIGZpbGVzOiB7XG4gICAgMDogJyV7c21hcnRfY291bnR9IGZpbGUnLFxuICAgIDE6ICcle3NtYXJ0X2NvdW50fSBmaWxlcydcbiAgfSxcbiAgdXBsb2FkRmlsZXM6IHtcbiAgICAwOiAnVXBsb2FkICV7c21hcnRfY291bnR9IGZpbGUnLFxuICAgIDE6ICdVcGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZXMnXG4gIH0sXG4gIHNlbGVjdFRvVXBsb2FkOiAnU2VsZWN0IGZpbGVzIHRvIHVwbG9hZCcsXG4gIGNsb3NlTW9kYWw6ICdDbG9zZSBNb2RhbCcsXG4gIHVwbG9hZDogJ1VwbG9hZCdcbn1cblxuZW5fVVMucGx1cmFsaXplID0gZnVuY3Rpb24gKG4pIHtcbiAgaWYgKG4gPT09IDEpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIHJldHVybiAxXG59XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93LlVwcHkgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5VcHB5LmxvY2FsZXMuZW5fVVMgPSBlbl9VU1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGVuX1VTXG4iLCJpbXBvcnQgVXRpbHMgZnJvbSAnLi4vY29yZS9VdGlscydcbmltcG9ydCBQbHVnaW4gZnJvbSAnLi9QbHVnaW4nXG5pbXBvcnQgJ3doYXR3Zy1mZXRjaCdcbmltcG9ydCB5byBmcm9tICd5by15bydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR29vZ2xlIGV4dGVuZHMgUGx1Z2luIHtcbiAgY29uc3RydWN0b3IgKGNvcmUsIG9wdHMpIHtcbiAgICBzdXBlcihjb3JlLCBvcHRzKVxuICAgIHRoaXMudHlwZSA9ICdhY3F1aXJlcidcbiAgICB0aGlzLmlkID0gJ0dvb2dsZURyaXZlJ1xuICAgIHRoaXMudGl0bGUgPSAnR29vZ2xlIERyaXZlJ1xuICAgIHRoaXMuaWNvbiA9IHlvYFxuICAgICAgPHN2ZyBjbGFzcz1cIlVwcHlJY29uIFVwcHlNb2RhbFRhYi1pY29uXCIgd2lkdGg9XCIyOFwiIGhlaWdodD1cIjI4XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiPlxuICAgICAgICA8cGF0aCBkPVwiTTIuOTU1IDE0LjkzbDIuNjY3LTQuNjJIMTZsLTIuNjY3IDQuNjJIMi45NTV6bTIuMzc4LTQuNjJsLTIuNjY2IDQuNjJMMCAxMC4zMWw1LjE5LTguOTkgMi42NjYgNC42Mi0yLjUyMyA0LjM3em0xMC41MjMtLjI1aC01LjMzM2wtNS4xOS04Ljk5aDUuMzM0bDUuMTkgOC45OXpcIi8+XG4gICAgICA8L3N2Zz5cbiAgICBgXG5cbiAgICB0aGlzLmZpbGVzID0gW11cblxuICAgIC8vIExvZ2ljXG4gICAgdGhpcy5hZGRGaWxlID0gdGhpcy5hZGRGaWxlLmJpbmQodGhpcylcbiAgICB0aGlzLmdldEZvbGRlciA9IHRoaXMuZ2V0Rm9sZGVyLmJpbmQodGhpcylcbiAgICB0aGlzLmhhbmRsZUNsaWNrID0gdGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMpXG4gICAgdGhpcy5sb2dvdXQgPSB0aGlzLmxvZ291dC5iaW5kKHRoaXMpXG5cbiAgICAvLyBWaXN1YWxcbiAgICB0aGlzLnJlbmRlckJyb3dzZXJJdGVtID0gdGhpcy5yZW5kZXJCcm93c2VySXRlbS5iaW5kKHRoaXMpXG4gICAgdGhpcy5maWx0ZXJJdGVtcyA9IHRoaXMuZmlsdGVySXRlbXMuYmluZCh0aGlzKVxuICAgIHRoaXMuZmlsdGVyUXVlcnkgPSB0aGlzLmZpbHRlclF1ZXJ5LmJpbmQodGhpcylcbiAgICB0aGlzLnJlbmRlckF1dGggPSB0aGlzLnJlbmRlckF1dGguYmluZCh0aGlzKVxuICAgIHRoaXMucmVuZGVyQnJvd3NlciA9IHRoaXMucmVuZGVyQnJvd3Nlci5iaW5kKHRoaXMpXG4gICAgdGhpcy5zb3J0QnlUaXRsZSA9IHRoaXMuc29ydEJ5VGl0bGUuYmluZCh0aGlzKVxuICAgIHRoaXMuc29ydEJ5RGF0ZSA9IHRoaXMuc29ydEJ5RGF0ZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpXG5cbiAgICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7fVxuXG4gICAgLy8gbWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIGNvbnN0IGhvc3QgPSB0aGlzLm9wdHMuaG9zdC5yZXBsYWNlKC9eaHR0cHM/OlxcL1xcLy8sICcnKVxuXG4gICAgdGhpcy5zb2NrZXQgPSB0aGlzLmNvcmUuaW5pdFNvY2tldCh7XG4gICAgICB0YXJnZXQ6ICd3czovLycgKyBob3N0ICsgJy8nXG4gICAgfSlcblxuICAgIHRoaXMuc29ja2V0Lm9uKCdnb29nbGUuYXV0aC5wYXNzJywgKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ2dvb2dsZS5hdXRoLnBhc3MnKVxuICAgICAgdGhpcy5nZXRGb2xkZXIodGhpcy5jb3JlLmdldFN0YXRlKCkuZ29vZ2xlRHJpdmUuZGlyZWN0b3J5LmlkKVxuICAgIH0pXG5cbiAgICB0aGlzLnNvY2tldC5vbigndXBweS5kZWJ1ZycsIChwYXlsb2FkKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnR09PR0xFIERFQlVHOicpXG4gICAgICBjb25zb2xlLmxvZyhwYXlsb2FkKVxuICAgIH0pXG5cbiAgICB0aGlzLnNvY2tldC5vbignZ29vZ2xlLmxpc3Qub2snLCAoZGF0YSkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ2dvb2dsZS5saXN0Lm9rJylcbiAgICAgIGxldCBmb2xkZXJzID0gW11cbiAgICAgIGxldCBmaWxlcyA9IFtdXG4gICAgICBkYXRhLml0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKGl0ZW0ubWltZVR5cGUgPT09ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJykge1xuICAgICAgICAgIGZvbGRlcnMucHVzaChpdGVtKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZpbGVzLnB1c2goaXRlbSlcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgdGhpcy51cGRhdGVTdGF0ZSh7XG4gICAgICAgIGZvbGRlcnMsXG4gICAgICAgIGZpbGVzLFxuICAgICAgICBhdXRoZW50aWNhdGVkOiB0cnVlXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICB0aGlzLnNvY2tldC5vbignZ29vZ2xlLmxpc3QuZmFpbCcsIChkYXRhKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnZ29vZ2xlLmxpc3QuZmFpbCcpXG4gICAgICBjb25zb2xlLmxvZyhkYXRhKVxuICAgIH0pXG5cbiAgICB0aGlzLnNvY2tldC5vbignZ29vZ2xlLmF1dGguZmFpbCcsICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdnb29nbGUuYXV0aC5mYWlsJylcbiAgICAgIHRoaXMudXBkYXRlU3RhdGUoe1xuICAgICAgICBhdXRoZW50aWNhdGVkOiBmYWxzZVxuICAgICAgfSlcbiAgICB9KVxuICB9XG5cbiAgaW5zdGFsbCAoKSB7XG4gICAgLy8gU2V0IGRlZmF1bHQgc3RhdGUgZm9yIEdvb2dsZSBEcml2ZVxuICAgIHRoaXMuY29yZS5zZXRTdGF0ZSh7XG4gICAgICBnb29nbGVEcml2ZToge1xuICAgICAgICBhdXRoZW50aWNhdGVkOiBmYWxzZSxcbiAgICAgICAgZmlsZXM6IFtdLFxuICAgICAgICBmb2xkZXJzOiBbXSxcbiAgICAgICAgZGlyZWN0b3J5OiBbe1xuICAgICAgICAgIHRpdGxlOiAnTXkgRHJpdmUnLFxuICAgICAgICAgIGlkOiAncm9vdCdcbiAgICAgICAgfV0sXG4gICAgICAgIGFjdGl2ZToge30sXG4gICAgICAgIGZpbHRlcklucHV0OiAnJ1xuICAgICAgfVxuICAgIH0pXG5cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm9wdHMudGFyZ2V0XG4gICAgY29uc3QgcGx1Z2luID0gdGhpc1xuICAgIHRoaXMudGFyZ2V0ID0gdGhpcy5tb3VudCh0YXJnZXQsIHBsdWdpbilcblxuICAgIHRoaXMuY2hlY2tBdXRoZW50aWNhdGlvbigpXG4gICAgICAudGhlbigoYXV0aGVudGljYXRlZCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlKHthdXRoZW50aWNhdGVkfSlcblxuICAgICAgICBpZiAoYXV0aGVudGljYXRlZCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldEZvbGRlcih0aGlzLmNvcmUuZ2V0U3RhdGUoKS5nb29nbGVEcml2ZS5kaXJlY3RvcnkuaWQpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXV0aGVudGljYXRlZFxuICAgICAgfSlcbiAgICAgIC50aGVuKChuZXdTdGF0ZSkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlKG5ld1N0YXRlKVxuICAgICAgfSlcblxuICAgIHJldHVyblxuICB9XG5cbiAgZm9jdXMgKCkge1xuICAgIGNvbnN0IGZpcnN0SW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAke3RoaXMudGFyZ2V0fSAuVXBweUdvb2dsZURyaXZlLWZvY3VzSW5wdXRgKVxuXG4gICAgLy8gb25seSB3b3JrcyBmb3IgdGhlIGZpcnN0IHRpbWUgaWYgd3JhcHBlZCBpbiBzZXRUaW1lb3V0IGZvciBzb21lIHJlYXNvblxuICAgIC8vIGZpcnN0SW5wdXQuZm9jdXMoKVxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgZmlyc3RJbnB1dC5mb2N1cygpXG4gICAgfSwgMTApXG4gIH1cblxuICAvKipcbiAgICogTGl0dGxlIHNob3J0aGFuZCB0byB1cGRhdGUgdGhlIHN0YXRlIHdpdGggbXkgbmV3IHN0YXRlXG4gICAqL1xuICB1cGRhdGVTdGF0ZSAobmV3U3RhdGUpIHtcbiAgICBjb25zdCB7c3RhdGV9ID0gdGhpcy5jb3JlXG4gICAgY29uc3QgZ29vZ2xlRHJpdmUgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5nb29nbGVEcml2ZSwgbmV3U3RhdGUpXG5cbiAgICB0aGlzLmNvcmUuc2V0U3RhdGUoe2dvb2dsZURyaXZlfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB0byBzZWUgaWYgdGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICogQHJldHVybiB7UHJvbWlzZX0gYXV0aGVudGljYXRpb24gc3RhdHVzXG4gICAqL1xuICBjaGVja0F1dGhlbnRpY2F0aW9uICgpIHtcbiAgICByZXR1cm4gZmV0Y2goYCR7dGhpcy5vcHRzLmhvc3R9L2dvb2dsZS9hdXRob3JpemVgLCB7XG4gICAgICBtZXRob2Q6ICdnZXQnLFxuICAgICAgY3JlZGVudGlhbHM6ICdpbmNsdWRlJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgaWYgKHJlcy5zdGF0dXMgPj0gMjAwICYmIHJlcy5zdGF0dXMgPD0gMzAwKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICAgICAgICBhdXRoZW50aWNhdGVkOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogdHJ1ZVxuICAgICAgICB9KVxuICAgICAgICBsZXQgZXJyb3IgPSBuZXcgRXJyb3IocmVzLnN0YXR1c1RleHQpXG4gICAgICAgIGVycm9yLnJlc3BvbnNlID0gcmVzXG4gICAgICAgIHRocm93IGVycm9yXG4gICAgICB9XG4gICAgfSlcbiAgICAudGhlbigoZGF0YSkgPT4gZGF0YS5pc0F1dGhlbnRpY2F0ZWQpXG4gICAgLmNhdGNoKChlcnIpID0+IGVycilcbiAgfVxuXG4gIC8qKlxuICAgKiBCYXNlZCBvbiBmb2xkZXIgSUQsIGZldGNoIGEgbmV3IGZvbGRlclxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIEZvbGRlciBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgIEZvbGRlcnMvZmlsZXMgaW4gZm9sZGVyXG4gICAqL1xuICBnZXRGb2xkZXIgKGlkID0gJ3Jvb3QnKSB7XG4gICAgcmV0dXJuIGZldGNoKGAke3RoaXMub3B0cy5ob3N0fS9nb29nbGUvbGlzdD9kaXI9JHtpZH1gLCB7XG4gICAgICBtZXRob2Q6ICdnZXQnLFxuICAgICAgY3JlZGVudGlhbHM6ICdpbmNsdWRlJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgaWYgKHJlcy5zdGF0dXMgPj0gMjAwICYmIHJlcy5zdGF0dXMgPD0gMzAwKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgICAvLyBsZXQgcmVzdWx0ID0gVXRpbHMuZ3JvdXBCeShkYXRhLml0ZW1zLCAoaXRlbSkgPT4gaXRlbS5taW1lVHlwZSlcbiAgICAgICAgICBsZXQgZm9sZGVycyA9IFtdXG4gICAgICAgICAgbGV0IGZpbGVzID0gW11cbiAgICAgICAgICBkYXRhLml0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLm1pbWVUeXBlID09PSAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicpIHtcbiAgICAgICAgICAgICAgZm9sZGVycy5wdXNoKGl0ZW0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmaWxlcy5wdXNoKGl0ZW0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZm9sZGVycyxcbiAgICAgICAgICAgIGZpbGVzXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5oYW5kbGVFcnJvcihyZXMpXG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcihyZXMuc3RhdHVzVGV4dClcbiAgICAgICAgZXJyb3IucmVzcG9uc2UgPSByZXNcbiAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgIH1cbiAgICB9KVxuICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICByZXR1cm4gZXJyXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaGVzIG5ldyBmb2xkZXIgYW5kIGFkZHMgdG8gYnJlYWRjcnVtYiBuYXZcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgICBGb2xkZXIgaWRcbiAgICogQHBhcmFtICB7U3RyaW5nfSB0aXRsZSBGb2xkZXIgdGl0bGVcbiAgICovXG4gIGdldE5leHRGb2xkZXIgKGlkLCB0aXRsZSkge1xuICAgIHRoaXMuZ2V0Rm9sZGVyKGlkKVxuICAgICAgLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvcmUuZ2V0U3RhdGUoKS5nb29nbGVEcml2ZVxuXG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3RhdGUuZGlyZWN0b3J5LmZpbmRJbmRleCgoZGlyKSA9PiBpZCA9PT0gZGlyLmlkKVxuICAgICAgICBsZXQgZGlyZWN0b3J5XG5cbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgIGRpcmVjdG9yeSA9IHN0YXRlLmRpcmVjdG9yeS5zbGljZSgwLCBpbmRleCArIDEpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGlyZWN0b3J5ID0gc3RhdGUuZGlyZWN0b3J5LmNvbmNhdChbe1xuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICB0aXRsZVxuICAgICAgICAgIH1dKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51cGRhdGVTdGF0ZShVdGlscy5leHRlbmQoZGF0YSwge2RpcmVjdG9yeX0pKVxuICAgICAgfSlcbiAgfVxuXG4gIGFkZEZpbGUgKGZpbGUpIHtcbiAgICBjb25zdCB0YWdGaWxlID0ge1xuICAgICAgc291cmNlOiB0aGlzLFxuICAgICAgZGF0YTogZmlsZSxcbiAgICAgIG5hbWU6IGZpbGUudGl0bGUsXG4gICAgICB0eXBlOiB0aGlzLmdldEZpbGVUeXBlKGZpbGUpLFxuICAgICAgcmVtb3RlOiB7XG4gICAgICAgIGFjdGlvbjogJ2dvb2dsZS5nZXQnLFxuICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgaWQ6IGZpbGUuaWRcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29yZS5lbWl0dGVyLmVtaXQoJ2ZpbGUtYWRkJywgdGFnRmlsZSlcbiAgfVxuXG4gIGhhbmRsZUVycm9yIChyZXNwb25zZSkge1xuICAgIHRoaXMuY2hlY2tBdXRoZW50aWNhdGlvbigpXG4gICAgICAudGhlbigoYXV0aGVudGljYXRlZCkgPT4ge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlKHthdXRoZW50aWNhdGVkfSlcbiAgICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBzZXNzaW9uIHRva2VuIG9uIGNsaWVudCBzaWRlLlxuICAgKi9cbiAgbG9nb3V0ICgpIHtcbiAgICBmZXRjaChgJHt0aGlzLm9wdHMuaG9zdH0vZ29vZ2xlL2xvZ291dD9yZWRpcmVjdD0ke2xvY2F0aW9uLmhyZWZ9YCwge1xuICAgICAgbWV0aG9kOiAnZ2V0JyxcbiAgICAgIGNyZWRlbnRpYWxzOiAnaW5jbHVkZScsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgIH1cbiAgICB9KVxuICAgICAgLnRoZW4oKHJlcykgPT4gcmVzLmpzb24oKSlcbiAgICAgIC50aGVuKChyZXMpID0+IHtcbiAgICAgICAgaWYgKHJlcy5vaykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdvaycpXG4gICAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB7XG4gICAgICAgICAgICBhdXRoZW50aWNhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGZpbGVzOiBbXSxcbiAgICAgICAgICAgIGZvbGRlcnM6IFtdLFxuICAgICAgICAgICAgZGlyZWN0b3J5OiBbe1xuICAgICAgICAgICAgICB0aXRsZTogJ015IERyaXZlJyxcbiAgICAgICAgICAgICAgaWQ6ICdyb290J1xuICAgICAgICAgICAgfV1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlKG5ld1N0YXRlKVxuICAgICAgICB9XG4gICAgICB9KVxuICB9XG5cbiAgZ2V0RmlsZVR5cGUgKGZpbGUpIHtcbiAgICBjb25zdCBmaWxlVHlwZXMgPSB7XG4gICAgICAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcic6ICdGb2xkZXInLFxuICAgICAgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5kb2N1bWVudCc6ICdHb29nbGUgRG9jcycsXG4gICAgICAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLnNwcmVhZHNoZWV0JzogJ0dvb2dsZSBTaGVldHMnLFxuICAgICAgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5wcmVzZW50YXRpb24nOiAnR29vZ2xlIFNsaWRlcycsXG4gICAgICAnaW1hZ2UvanBlZyc6ICdKUEVHIEltYWdlJyxcbiAgICAgICdpbWFnZS9wbmcnOiAnUE5HIEltYWdlJ1xuICAgIH1cblxuICAgIHJldHVybiBmaWxlVHlwZXNbZmlsZS5taW1lVHlwZV0gPyBmaWxlVHlwZXNbZmlsZS5taW1lVHlwZV0gOiBmaWxlLmZpbGVFeHRlbnNpb24udG9VcHBlckNhc2UoKVxuICB9XG5cbiAgLyoqXG4gICAqIFVzZWQgdG8gc2V0IGFjdGl2ZSBmaWxlL2ZvbGRlci5cbiAgICogQHBhcmFtICB7T2JqZWN0fSBmaWxlICAgQWN0aXZlIGZpbGUvZm9sZGVyXG4gICAqL1xuICBoYW5kbGVDbGljayAoZmlsZSkge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5jb3JlLmdldFN0YXRlKCkuZ29vZ2xlRHJpdmVcbiAgICBjb25zdCBuZXdTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLCB7XG4gICAgICBhY3RpdmU6IGZpbGVcbiAgICB9KVxuXG4gICAgdGhpcy51cGRhdGVTdGF0ZShuZXdTdGF0ZSlcbiAgfVxuXG4gIGZpbHRlclF1ZXJ5IChlKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvcmUuZ2V0U3RhdGUoKS5nb29nbGVEcml2ZVxuICAgIHRoaXMudXBkYXRlU3RhdGUoT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHtcbiAgICAgIGZpbHRlcklucHV0OiBlLnRhcmdldC52YWx1ZVxuICAgIH0pKVxuICB9XG5cbiAgZmlsdGVySXRlbXMgKGl0ZW1zKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvcmUuZ2V0U3RhdGUoKS5nb29nbGVEcml2ZVxuICAgIHJldHVybiBpdGVtcy5maWx0ZXIoKGZvbGRlcikgPT4ge1xuICAgICAgcmV0dXJuIGZvbGRlci50aXRsZS50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc3RhdGUuZmlsdGVySW5wdXQudG9Mb3dlckNhc2UoKSkgIT09IC0xXG4gICAgfSlcbiAgfVxuXG4gIHNvcnRCeVRpdGxlICgpIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuY29yZS5nZXRTdGF0ZSgpLmdvb2dsZURyaXZlXG4gICAgY29uc3Qge2ZpbGVzLCBmb2xkZXJzLCBzb3J0aW5nfSA9IHN0YXRlXG5cbiAgICBsZXQgc29ydGVkRmlsZXMgPSBmaWxlcy5zb3J0KChmaWxlQSwgZmlsZUIpID0+IHtcbiAgICAgIGlmIChzb3J0aW5nID09PSAndGl0bGVEZXNjZW5kaW5nJykge1xuICAgICAgICByZXR1cm4gZmlsZUIudGl0bGUubG9jYWxlQ29tcGFyZShmaWxlQS50aXRsZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBmaWxlQS50aXRsZS5sb2NhbGVDb21wYXJlKGZpbGVCLnRpdGxlKVxuICAgIH0pXG5cbiAgICBsZXQgc29ydGVkRm9sZGVycyA9IGZvbGRlcnMuc29ydCgoZm9sZGVyQSwgZm9sZGVyQikgPT4ge1xuICAgICAgaWYgKHNvcnRpbmcgPT09ICd0aXRsZURlc2NlbmRpbmcnKSB7XG4gICAgICAgIHJldHVybiBmb2xkZXJCLnRpdGxlLmxvY2FsZUNvbXBhcmUoZm9sZGVyQS50aXRsZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBmb2xkZXJBLnRpdGxlLmxvY2FsZUNvbXBhcmUoZm9sZGVyQi50aXRsZSlcbiAgICB9KVxuXG4gICAgdGhpcy51cGRhdGVTdGF0ZShPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwge1xuICAgICAgZmlsZXM6IHNvcnRlZEZpbGVzLFxuICAgICAgZm9sZGVyczogc29ydGVkRm9sZGVycyxcbiAgICAgIHNvcnRpbmc6IChzb3J0aW5nID09PSAndGl0bGVEZXNjZW5kaW5nJykgPyAndGl0bGVBc2NlbmRpbmcnIDogJ3RpdGxlRGVzY2VuZGluZydcbiAgICB9KSlcbiAgfVxuXG4gIHNvcnRCeURhdGUgKCkge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5jb3JlLmdldFN0YXRlKCkuZ29vZ2xlRHJpdmVcbiAgICBjb25zdCB7ZmlsZXMsIGZvbGRlcnMsIHNvcnRpbmd9ID0gc3RhdGVcblxuICAgIGxldCBzb3J0ZWRGaWxlcyA9IGZpbGVzLnNvcnQoKGZpbGVBLCBmaWxlQikgPT4ge1xuICAgICAgbGV0IGEgPSBuZXcgRGF0ZShmaWxlQS5tb2RpZmllZEJ5TWVEYXRlKVxuICAgICAgbGV0IGIgPSBuZXcgRGF0ZShmaWxlQi5tb2RpZmllZEJ5TWVEYXRlKVxuXG4gICAgICBpZiAoc29ydGluZyA9PT0gJ2RhdGVEZXNjZW5kaW5nJykge1xuICAgICAgICByZXR1cm4gYSA+IGIgPyAtMSA6IGEgPCBiID8gMSA6IDBcbiAgICAgIH1cbiAgICAgIHJldHVybiBhID4gYiA/IDEgOiBhIDwgYiA/IC0xIDogMFxuICAgIH0pXG5cbiAgICBsZXQgc29ydGVkRm9sZGVycyA9IGZvbGRlcnMuc29ydCgoZm9sZGVyQSwgZm9sZGVyQikgPT4ge1xuICAgICAgbGV0IGEgPSBuZXcgRGF0ZShmb2xkZXJBLm1vZGlmaWVkQnlNZURhdGUpXG4gICAgICBsZXQgYiA9IG5ldyBEYXRlKGZvbGRlckIubW9kaWZpZWRCeU1lRGF0ZSlcblxuICAgICAgaWYgKHNvcnRpbmcgPT09ICdkYXRlRGVzY2VuZGluZycpIHtcbiAgICAgICAgcmV0dXJuIGEgPiBiID8gLTEgOiBhIDwgYiA/IDEgOiAwXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhID4gYiA/IDEgOiBhIDwgYiA/IC0xIDogMFxuICAgIH0pXG5cbiAgICB0aGlzLnVwZGF0ZVN0YXRlKE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLCB7XG4gICAgICBmaWxlczogc29ydGVkRmlsZXMsXG4gICAgICBmb2xkZXJzOiBzb3J0ZWRGb2xkZXJzLFxuICAgICAgc29ydGluZzogKHNvcnRpbmcgPT09ICdkYXRlRGVzY2VuZGluZycpID8gJ2RhdGVBc2NlbmRpbmcnIDogJ2RhdGVEZXNjZW5kaW5nJ1xuICAgIH0pKVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB1c2VyIGF1dGhlbnRpY2F0aW9uIHZpZXdcbiAgICovXG4gIHJlbmRlckF1dGggKCkge1xuICAgIGNvbnN0IHN0YXRlID0gYnRvYShKU09OLnN0cmluZ2lmeSh7XG4gICAgICByZWRpcmVjdDogbG9jYXRpb24uaHJlZi5zcGxpdCgnIycpWzBdXG4gICAgfSkpXG5cbiAgICBjb25zdCBsaW5rID0gYCR7dGhpcy5vcHRzLmhvc3R9L2Nvbm5lY3QvZ29vZ2xlP3N0YXRlPSR7c3RhdGV9YFxuICAgIHJldHVybiB5b2BcbiAgICAgIDxkaXYgY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtYXV0aGVudGljYXRlXCI+XG4gICAgICAgIDxoMT5Zb3UgbmVlZCB0byBhdXRoZW50aWNhdGUgd2l0aCBHb29nbGUgYmVmb3JlIHNlbGVjdGluZyBmaWxlcy48L2gxPlxuICAgICAgICA8YSBocmVmPSR7bGlua30+QXV0aGVudGljYXRlPC9hPlxuICAgICAgPC9kaXY+XG4gICAgYFxuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBmaWxlIGJyb3dzZXJcbiAgICogQHBhcmFtICB7T2JqZWN0fSBzdGF0ZSBHb29nbGUgRHJpdmUgc3RhdGVcbiAgICovXG4gIHJlbmRlckJyb3dzZXIgKHN0YXRlKSB7XG4gICAgbGV0IGZvbGRlcnMgPSBzdGF0ZS5mb2xkZXJzXG4gICAgbGV0IGZpbGVzID0gc3RhdGUuZmlsZXNcbiAgICBsZXQgcHJldmlld0VsZW0gPSAnJ1xuICAgIGNvbnN0IGlzRmlsZVNlbGVjdGVkID0gT2JqZWN0LmtleXMoc3RhdGUuYWN0aXZlKS5sZW5ndGggIT09IDAgJiYgSlNPTi5zdHJpbmdpZnkoc3RhdGUuYWN0aXZlKSAhPT0gSlNPTi5zdHJpbmdpZnkoe30pXG5cbiAgICBpZiAoc3RhdGUuZmlsdGVySW5wdXQgIT09ICcnKSB7XG4gICAgICBmb2xkZXJzID0gdGhpcy5maWx0ZXJJdGVtcyhzdGF0ZS5mb2xkZXJzKVxuICAgICAgZmlsZXMgPSB0aGlzLmZpbHRlckl0ZW1zKHN0YXRlLmZpbGVzKVxuICAgIH1cblxuICAgIGZvbGRlcnMgPSBmb2xkZXJzLm1hcCgoZm9sZGVyKSA9PiB0aGlzLnJlbmRlckJyb3dzZXJJdGVtKGZvbGRlcikpXG4gICAgZmlsZXMgPSBmaWxlcy5tYXAoKGZpbGUpID0+IHRoaXMucmVuZGVyQnJvd3Nlckl0ZW0oZmlsZSkpXG5cbiAgICBjb25zdCBicmVhZGNydW1icyA9IHN0YXRlLmRpcmVjdG9yeS5tYXAoKGRpcikgPT4geW9gPGxpPjxidXR0b24gb25jbGljaz0ke3RoaXMuZ2V0TmV4dEZvbGRlci5iaW5kKHRoaXMsIGRpci5pZCwgZGlyLnRpdGxlKX0+JHtkaXIudGl0bGV9PC9idXR0b24+PC9saT4gYClcbiAgICBpZiAoaXNGaWxlU2VsZWN0ZWQpIHtcbiAgICAgIHByZXZpZXdFbGVtID0geW9gXG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgPGgxPjxzcGFuIGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWZpbGVJY29uXCI+PGltZyBzcmM9JHtzdGF0ZS5hY3RpdmUuaWNvbkxpbmt9Lz48L3NwYW4+JHtzdGF0ZS5hY3RpdmUudGl0bGV9PC9oMT5cbiAgICAgICAgICA8dWw+XG4gICAgICAgICAgICA8bGk+VHlwZTogJHt0aGlzLmdldEZpbGVUeXBlKHN0YXRlLmFjdGl2ZSl9PC9saT5cbiAgICAgICAgICAgIDxsaT5Nb2RpZmllZCBCeSBNZTogJHtzdGF0ZS5hY3RpdmUubW9kaWZpZWRCeU1lRGF0ZX08L2xpPlxuICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgJHtzdGF0ZS5hY3RpdmUudGh1bWJuYWlsTGluayA/IHlvYDxpbWcgc3JjPSR7c3RhdGUuYWN0aXZlLnRodW1ibmFpbExpbmt9IGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWZpbGVUaHVtYm5haWxcIiAvPmAgOiB5b2BgfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIGBcbiAgICB9XG5cbiAgICByZXR1cm4geW9gXG4gICAgICA8ZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWhlYWRlclwiPlxuICAgICAgICAgIDx1bCBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1icmVhZGNydW1ic1wiPlxuICAgICAgICAgICAgJHticmVhZGNydW1ic31cbiAgICAgICAgICA8L3VsPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lci1mbHVpZFwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJyb3dcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoaWRkZW4tbWQtZG93biBjb2wtbGctMyBjb2wteGwtM1wiPlxuICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtc2lkZWJhclwiPlxuICAgICAgICAgICAgICAgIDxsaSBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1maWx0ZXJcIj48aW5wdXQgY2xhc3M9XCJVcHB5R29vZ2xlRHJpdmUtZm9jdXNJbnB1dFwiIHR5cGU9J3RleHQnIG9ua2V5dXA9JHt0aGlzLmZpbHRlclF1ZXJ5fSBwbGFjZWhvbGRlcj1cIlNlYXJjaC4uXCIgdmFsdWU9JHtzdGF0ZS5maWx0ZXJJbnB1dH0vPjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxidXR0b24gb25jbGljaz0ke3RoaXMuZ2V0TmV4dEZvbGRlci5iaW5kKHRoaXMsICdyb290JywgJ015IERyaXZlJyl9PjxpbWcgc3JjPVwiaHR0cHM6Ly9zc2wuZ3N0YXRpYy5jb20vZG9jcy9kb2NsaXN0L2ltYWdlcy9pY29uXzExX2NvbGxlY3Rpb25fbGlzdF8zLnBuZ1wiLz4gTXkgRHJpdmU8L2J1dHRvbj48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48YnV0dG9uPjxpbWcgc3JjPVwiaHR0cHM6Ly9zc2wuZ3N0YXRpYy5jb20vZG9jcy9kb2NsaXN0L2ltYWdlcy9pY29uXzExX3NoYXJlZF9jb2xsZWN0aW9uX2xpc3RfMS5wbmdcIi8+IFNoYXJlZCB3aXRoIG1lPC9idXR0b24+PC9saT5cbiAgICAgICAgICAgICAgICA8bGk+PGJ1dHRvbiBvbmNsaWNrPSR7dGhpcy5sb2dvdXR9PkxvZ291dDwvYnV0dG9uPjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2wtbWQtMTIgY29sLWxnLTkgY29sLXhsLTZcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1icm93c2VyQ29udGFpbmVyXCI+XG4gICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWJyb3dzZXJcIj5cbiAgICAgICAgICAgICAgICAgIDx0aGVhZD5cbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1zb3J0YWJsZUhlYWRlclwiIG9uY2xpY2s9JHt0aGlzLnNvcnRCeVRpdGxlfT5OYW1lPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICA8dGQ+T3duZXI8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1zb3J0YWJsZUhlYWRlclwiIG9uY2xpY2s9JHt0aGlzLnNvcnRCeURhdGV9Pkxhc3QgTW9kaWZpZWQ8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgIDx0ZD5GaWxlc2l6ZTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICAgICAgICAgICAgICAke2ZvbGRlcnN9XG4gICAgICAgICAgICAgICAgICAgICR7ZmlsZXN9XG4gICAgICAgICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGlkZGVuLWxnLWRvd24gY29sLXhsLTJcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIlVwcHlHb29nbGVEcml2ZS1maWxlSW5mb1wiPlxuICAgICAgICAgICAgICAgICR7cHJldmlld0VsZW19XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYFxuICB9XG5cbiAgcmVuZGVyQnJvd3Nlckl0ZW0gKGl0ZW0pIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuY29yZS5nZXRTdGF0ZSgpLmdvb2dsZURyaXZlXG4gICAgY29uc3QgaXNBRmlsZVNlbGVjdGVkID0gT2JqZWN0LmtleXMoc3RhdGUuYWN0aXZlKS5sZW5ndGggIT09IDAgJiYgSlNPTi5zdHJpbmdpZnkoc3RhdGUuYWN0aXZlKSAhPT0gSlNPTi5zdHJpbmdpZnkoe30pXG4gICAgY29uc3QgaXNGb2xkZXIgPSBpdGVtLm1pbWVUeXBlID09PSAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcidcbiAgICByZXR1cm4geW9gXG4gICAgICA8dHIgY2xhc3M9JHsoaXNBRmlsZVNlbGVjdGVkICYmIHN0YXRlLmFjdGl2ZS5pZCA9PT0gaXRlbS5pZCkgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbmNsaWNrPSR7dGhpcy5oYW5kbGVDbGljay5iaW5kKHRoaXMsIGl0ZW0pfVxuICAgICAgICBvbmRibGNsaWNrPSR7aXNGb2xkZXIgPyB0aGlzLmdldE5leHRGb2xkZXIuYmluZCh0aGlzLCBpdGVtLmlkLCBpdGVtLnRpdGxlKSA6IHRoaXMuYWRkRmlsZS5iaW5kKHRoaXMsIGl0ZW0pfT5cbiAgICAgICAgPHRkPjxzcGFuIGNsYXNzPVwiVXBweUdvb2dsZURyaXZlLWZvbGRlckljb25cIj48aW1nIHNyYz0ke2l0ZW0uaWNvbkxpbmt9Lz48L3NwYW4+ICR7aXRlbS50aXRsZX08L3RkPlxuICAgICAgICA8dGQ+TWU8L3RkPlxuICAgICAgICA8dGQ+JHtpdGVtLm1vZGlmaWVkQnlNZURhdGV9PC90ZD5cbiAgICAgICAgPHRkPi08L3RkPlxuICAgICAgPC90cj5cbiAgICBgXG4gIH1cblxuICByZW5kZXJFcnJvciAoZXJyKSB7XG4gICAgcmV0dXJuIHlvYFxuICAgICAgPGRpdj5cbiAgICAgICAgPHNwYW4+XG4gICAgICAgICAgU29tZXRoaW5nIHdlbnQgd3JvbmcuICBQcm9iYWJseSBvdXIgZmF1bHQuICR7ZXJyfVxuICAgICAgICA8L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICBgXG4gIH1cblxuICByZW5kZXIgKHN0YXRlKSB7XG4gICAgaWYgKHN0YXRlLmdvb2dsZURyaXZlLmVycm9yKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXJFcnJvcigpXG4gICAgfVxuXG4gICAgaWYgKCFzdGF0ZS5nb29nbGVEcml2ZS5hdXRoZW50aWNhdGVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW5kZXJBdXRoKClcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZW5kZXJCcm93c2VyKHN0YXRlLmdvb2dsZURyaXZlKVxuICB9XG59XG4iLCJpbXBvcnQgeW8gZnJvbSAneW8teW8nXG5cbi8qKlxuICogQm9pbGVycGxhdGUgdGhhdCBhbGwgUGx1Z2lucyBzaGFyZSAtIGFuZCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGRpcmVjdGx5LiBJdCBhbHNvIHNob3dzIHdoaWNoIG1ldGhvZHMgZmluYWwgcGx1Z2lucyBzaG91bGQgaW1wbGVtZW50L292ZXJyaWRlLFxuICogdGhpcyBkZWNpZGluZyBvbiBzdHJ1Y3R1cmUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1haW4gVXBweSBjb3JlIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB3aXRoIHBsdWdpbiBvcHRpb25zXG4gKiBAcmV0dXJuIHthcnJheSB8IHN0cmluZ30gZmlsZXMgb3Igc3VjY2Vzcy9mYWlsIG1lc3NhZ2VcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGx1Z2luIHtcblxuICBjb25zdHJ1Y3RvciAoY29yZSwgb3B0cykge1xuICAgIHRoaXMuY29yZSA9IGNvcmVcbiAgICB0aGlzLm9wdHMgPSBvcHRzXG4gICAgdGhpcy50eXBlID0gJ25vbmUnXG5cbiAgICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcylcbiAgICB0aGlzLm1vdW50ID0gdGhpcy5tb3VudC5iaW5kKHRoaXMpXG4gICAgdGhpcy5mb2N1cyA9IHRoaXMuZm9jdXMuYmluZCh0aGlzKVxuICAgIHRoaXMuaW5zdGFsbCA9IHRoaXMuaW5zdGFsbC5iaW5kKHRoaXMpXG4gIH1cblxuICB1cGRhdGUgKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5lbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IG5ld0VsID0gdGhpcy5yZW5kZXIodGhpcy5jb3JlLnN0YXRlKVxuICAgIHlvLnVwZGF0ZSh0aGlzLmVsLCBuZXdFbClcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBzdXBwbGllZCBgdGFyZ2V0YCBpcyBhIGBzdHJpbmdgIG9yIGFuIGBvYmplY3RgLlxuICAgKiBJZiBpdOKAmXMgYW4gb2JqZWN0IOKAlCB0YXJnZXQgaXMgYSBwbHVnaW4sIGFuZCB3ZSBzZWFyY2ggYHBsdWdpbnNgXG4gICAqIGZvciBhIHBsdWdpbiB3aXRoIHNhbWUgbmFtZSBhbmQgcmV0dXJuIGl0cyB0YXJnZXQuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gdGFyZ2V0XG4gICAqXG4gICAqL1xuICBtb3VudCAodGFyZ2V0LCBwbHVnaW4pIHtcbiAgICBjb25zdCBjYWxsZXJQbHVnaW5OYW1lID0gcGx1Z2luLmlkXG5cbiAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuY29yZS5sb2coYEluc3RhbGxpbmcgJHtjYWxsZXJQbHVnaW5OYW1lfSB0byAke3RhcmdldH1gKVxuXG4gICAgICAvLyBjbGVhciBldmVyeXRoaW5nIGluc2lkZSB0aGUgdGFyZ2V0IHNlbGVjdG9yXG4gICAgICAvLyBpZiAocmVwbGFjZVRhcmdldENvbnRlbnQpIHtcbiAgICAgIC8vICAgZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXQpLmlubmVySFRNTCA9ICcnXG4gICAgICAvLyB9XG4gICAgICB0aGlzLmVsID0gcGx1Z2luLnJlbmRlcih0aGlzLmNvcmUuc3RhdGUpXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCkuYXBwZW5kQ2hpbGQodGhpcy5lbClcblxuICAgICAgcmV0dXJuIHRhcmdldFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPOiBpcyBpbnN0YW50aWF0aW5nIHRoZSBwbHVnaW4gcmVhbGx5IHRoZSB3YXkgdG8gcm9sbFxuICAgICAgLy8ganVzdCB0byBnZXQgdGhlIHBsdWdpbiBuYW1lP1xuICAgICAgY29uc3QgVGFyZ2V0ID0gdGFyZ2V0XG4gICAgICBjb25zdCB0YXJnZXRQbHVnaW5OYW1lID0gbmV3IFRhcmdldCgpLmlkXG5cbiAgICAgIHRoaXMuY29yZS5sb2coYEluc3RhbGxpbmcgJHtjYWxsZXJQbHVnaW5OYW1lfSB0byAke3RhcmdldFBsdWdpbk5hbWV9YClcblxuICAgICAgY29uc3QgdGFyZ2V0UGx1Z2luID0gdGhpcy5jb3JlLmdldFBsdWdpbih0YXJnZXRQbHVnaW5OYW1lKVxuICAgICAgY29uc3Qgc2VsZWN0b3JUYXJnZXQgPSB0YXJnZXRQbHVnaW4uYWRkVGFyZ2V0KHBsdWdpbilcblxuICAgICAgcmV0dXJuIHNlbGVjdG9yVGFyZ2V0XG4gICAgfVxuICB9XG5cbiAgZm9jdXMgKCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgaW5zdGFsbCAoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBydW4gKCkge1xuICAgIHJldHVyblxuICB9XG59XG4iLCIiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2UgaWYgKGxpc3RlbmVycykge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKHRoaXMuX2V2ZW50cykge1xuICAgIHZhciBldmxpc3RlbmVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oZXZsaXN0ZW5lcikpXG4gICAgICByZXR1cm4gMTtcbiAgICBlbHNlIGlmIChldmxpc3RlbmVyKVxuICAgICAgcmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RoO1xuICB9XG4gIHJldHVybiAwO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHJldHVybiBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSk7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpbXBvcnQgVXBweSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvY29yZS9Db3JlLmpzJ1xuaW1wb3J0IERyb3Bib3ggZnJvbSAnLi4vLi4vLi4vLi4vc3JjL3BsdWdpbnMvR29vZ2xlRHJpdmUuanMnXG5cbmNvbnN0IHVwcHkgPSBuZXcgVXBweSh7d2FpdDogZmFsc2V9KVxudXBweVxuICAudXNlKERyb3Bib3gsIHtzZWxlY3RvcjogJyN0YXJnZXQnfSlcbiAgLnJ1bigpXG5cbmNvbnN0IGRyb3AgPSBuZXcgRHJvcGJveCgpXG5cbmNvbnNvbGUubG9nKHVwcHkudHlwZSlcbmNvbnNvbGUuZGlyKGRyb3ApXG4iXX0=
