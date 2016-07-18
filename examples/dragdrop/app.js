(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = dragDrop

var flatten = require('flatten')
var parallel = require('run-parallel')

function dragDrop (elem, listeners) {
  if (typeof elem === 'string') {
    elem = window.document.querySelector(elem)
  }

  if (typeof listeners === 'function') {
    listeners = { onDrop: listeners }
  }

  var timeout

  elem.addEventListener('dragenter', stopEvent, false)
  elem.addEventListener('dragover', onDragOver, false)
  elem.addEventListener('dragleave', onDragLeave, false)
  elem.addEventListener('drop', onDrop, false)

  // Function to remove drag-drop listeners
  return function remove () {
    removeDragClass()
    elem.removeEventListener('dragenter', stopEvent, false)
    elem.removeEventListener('dragover', onDragOver, false)
    elem.removeEventListener('dragleave', onDragLeave, false)
    elem.removeEventListener('drop', onDrop, false)
  }

  function onDragOver (e) {
    e.stopPropagation()
    e.preventDefault()
    if (e.dataTransfer.items) {
      // Only add "drag" class when `items` contains a file
      var items = toArray(e.dataTransfer.items).filter(function (item) {
        return item.kind === 'file'
      })
      if (items.length === 0) return
    }

    elem.classList.add('drag')
    clearTimeout(timeout)

    if (listeners.onDragOver) {
      listeners.onDragOver(e)
    }

    e.dataTransfer.dropEffect = 'copy'
    return false
  }

  function onDragLeave (e) {
    e.stopPropagation()
    e.preventDefault()

    if (listeners.onDragLeave) {
      listeners.onDragLeave(e)
    }

    clearTimeout(timeout)
    timeout = setTimeout(removeDragClass, 50)

    return false
  }

  function onDrop (e) {
    e.stopPropagation()
    e.preventDefault()

    if (listeners.onDragLeave) {
      listeners.onDragLeave(e)
    }

    clearTimeout(timeout)
    removeDragClass()

    var pos = {
      x: e.clientX,
      y: e.clientY
    }

    if (e.dataTransfer.items) {
      // Handle directories in Chrome using the proprietary FileSystem API
      var items = toArray(e.dataTransfer.items).filter(function (item) {
        return item.kind === 'file'
      })

      if (items.length === 0) return

      parallel(items.map(function (item) {
        return function (cb) {
          processEntry(item.webkitGetAsEntry(), cb)
        }
      }), function (err, results) {
        // This catches permission errors with file:// in Chrome. This should never
        // throw in production code, so the user does not need to use try-catch.
        if (err) throw err
        if (listeners.onDrop) {
          listeners.onDrop(flatten(results), pos)
        }
      })
    } else {
      var files = toArray(e.dataTransfer.files)

      if (files.length === 0) return

      files.forEach(function (file) {
        file.fullPath = '/' + file.name
      })

      if (listeners.onDrop) {
        listeners.onDrop(files, pos)
      }
    }

    return false
  }

  function removeDragClass () {
    elem.classList.remove('drag')
  }
}

function stopEvent (e) {
  e.stopPropagation()
  e.preventDefault()
  return false
}

function processEntry (entry, cb) {
  var entries = []

  if (entry.isFile) {
    entry.file(function (file) {
      file.fullPath = entry.fullPath  // preserve pathing for consumer
      cb(null, file)
    }, function (err) {
      cb(err)
    })
  } else if (entry.isDirectory) {
    var reader = entry.createReader()
    readEntries()
  }

  function readEntries () {
    reader.readEntries(function (entries_) {
      if (entries_.length > 0) {
        entries = entries.concat(toArray(entries_))
        readEntries() // continue reading entries until `readEntries` returns no more
      } else {
        doneEntries()
      }
    })
  }

  function doneEntries () {
    parallel(entries.map(function (entry) {
      return function (cb) {
        processEntry(entry, cb)
      }
    }), cb)
  }
}

function toArray (list) {
  return Array.prototype.slice.call(list || [], 0)
}

},{"flatten":2,"run-parallel":3}],2:[function(require,module,exports){
module.exports = function flatten(list, depth) {
  depth = (typeof depth == 'number') ? depth : Infinity;

  if (!depth) {
    if (Array.isArray(list)) {
      return list.map(function(i) { return i; });
    }
    return list;
  }

  return _flatten(list, 1);

  function _flatten(list, d) {
    return list.reduce(function (acc, item) {
      if (Array.isArray(item) && d < depth) {
        return acc.concat(_flatten(item, d + 1));
      }
      else {
        return acc.concat(item);
      }
    }, []);
  }
};

},{}],3:[function(require,module,exports){
(function (process){
module.exports = function (tasks, cb) {
  var results, pending, keys
  var isSync = true

  if (Array.isArray(tasks)) {
    results = []
    pending = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) process.nextTick(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (--pending === 0 || err) {
      done(err)
    }
  }

  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.forEach(function (key) {
      tasks[key](function (err, result) { each(key, err, result) })
    })
  } else {
    // array
    tasks.forEach(function (task, i) {
      task(function (err, result) { each(i, err, result) })
    })
  }

  isSync = false
}

}).call(this,require('_process'))

},{"_process":31}],4:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   3.2.1
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (lib$es6$promise$asap$$customSchedulerFn) {
          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
        } else {
          lib$es6$promise$asap$$scheduleFlush();
        }
      }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
      lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // see https://github.com/cujojs/when/issues/410 for details
      return function() {
        process.nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertx() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }
    function lib$es6$promise$then$$then(onFulfillment, onRejection) {
      var parent = this;

      var child = new this.constructor(lib$es6$promise$$internal$$noop);

      if (child[lib$es6$promise$$internal$$PROMISE_ID] === undefined) {
        lib$es6$promise$$internal$$makePromise(child);
      }

      var state = parent._state;

      if (state) {
        var callback = arguments[state - 1];
        lib$es6$promise$asap$$asap(function(){
          lib$es6$promise$$internal$$invokeCallback(state, child, callback, parent._result);
        });
      } else {
        lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
      }

      return child;
    }
    var lib$es6$promise$then$$default = lib$es6$promise$then$$then;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    var lib$es6$promise$$internal$$PROMISE_ID = Math.random().toString(36).substring(16);

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFulfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$asap(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable, then) {
      if (maybeThenable.constructor === promise.constructor &&
          then === lib$es6$promise$then$$default &&
          constructor.resolve === lib$es6$promise$promise$resolve$$default) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value, lib$es6$promise$$internal$$getThen(value));
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    var lib$es6$promise$$internal$$id = 0;
    function lib$es6$promise$$internal$$nextId() {
      return lib$es6$promise$$internal$$id++;
    }

    function lib$es6$promise$$internal$$makePromise(promise) {
      promise[lib$es6$promise$$internal$$PROMISE_ID] = lib$es6$promise$$internal$$id++;
      promise._state = undefined;
      promise._result = undefined;
      promise._subscribers = [];
    }

    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      if (!lib$es6$promise$utils$$isArray(entries)) {
        return new Constructor(function(resolve, reject) {
          reject(new TypeError('You must pass an array to race.'));
        });
      } else {
        return new Constructor(function(resolve, reject) {
          var length = entries.length;
          for (var i = 0; i < length; i++) {
            Constructor.resolve(entries[i]).then(resolve, reject);
          }
        });
      }
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;


    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this[lib$es6$promise$$internal$$PROMISE_ID] = lib$es6$promise$$internal$$nextId();
      this._result = this._state = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        typeof resolver !== 'function' && lib$es6$promise$promise$$needsResolver();
        this instanceof lib$es6$promise$promise$$Promise ? lib$es6$promise$$internal$$initializePromise(this, resolver) : lib$es6$promise$promise$$needsNew();
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: lib$es6$promise$then$$default,

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!this.promise[lib$es6$promise$$internal$$PROMISE_ID]) {
        lib$es6$promise$$internal$$makePromise(this.promise);
      }

      if (lib$es6$promise$utils$$isArray(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._result = new Array(this.length);

        if (this.length === 0) {
          lib$es6$promise$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(this.promise, lib$es6$promise$enumerator$$validationError());
      }
    }

    function lib$es6$promise$enumerator$$validationError() {
      return new Error('Array Methods must be provided an Array');
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var input   = this._input;

      for (var i = 0; this._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      var resolve = c.resolve;

      if (resolve === lib$es6$promise$promise$resolve$$default) {
        var then = lib$es6$promise$$internal$$getThen(entry);

        if (then === lib$es6$promise$then$$default &&
            entry._state !== lib$es6$promise$$internal$$PENDING) {
          this._settledAt(entry._state, i, entry._result);
        } else if (typeof then !== 'function') {
          this._remaining--;
          this._result[i] = entry;
        } else if (c === lib$es6$promise$promise$$default) {
          var promise = new c(lib$es6$promise$$internal$$noop);
          lib$es6$promise$$internal$$handleMaybeThenable(promise, entry, then);
          this._willSettleAt(promise, i);
        } else {
          this._willSettleAt(new c(function(resolve) { resolve(entry); }), i);
        }
      } else {
        this._willSettleAt(resolve(entry), i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        this._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          this._result[i] = value;
        }
      }

      if (this._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, this._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":31}],5:[function(require,module,exports){
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

},{"number-is-nan":6}],6:[function(require,module,exports){
'use strict';
module.exports = Number.isNaN || function (x) {
	return x !== x;
};

},{}],7:[function(require,module,exports){
/**
 * Generate a fingerprint for a file which will be used the store the endpoint
 *
 * @param {File} file
 * @return {String}
 */
"use strict";

module.exports = fingerprint;

function fingerprint(file) {
  return ["tus", file.name, file.type, file.size, file.lastModified].join("-");
}
},{}],8:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

/* global window */

var Upload = _interopRequire(require("./upload"));

var defaultOptions = Upload.defaultOptions;
var XMLHttpRequest = window.XMLHttpRequest;
var localStorage = window.localStorage;
var Blob = window.Blob;

var isSupported = XMLHttpRequest && localStorage && Blob && typeof Blob.prototype.slice === "function";

// The usage of the commonjs exporting syntax instead of the new ECMAScript
// one is actually inteded and prevents weird behaviour if we are trying to
// import this module in another module using Babel.
module.exports = {
  Upload: Upload,
  isSupported: isSupported,
  defaultOptions: defaultOptions
};
},{"./upload":9}],9:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/* global window, XMLHttpRequest */

var fingerprint = _interopRequire(require("./fingerprint"));

var extend = _interopRequire(require("extend"));

var localStorage = window.localStorage;
var btoa = window.btoa;

var defaultOptions = {
  endpoint: "",
  fingerprint: fingerprint,
  resume: true,
  onProgress: null,
  onChunkComplete: null,
  onSuccess: null,
  onError: null,
  headers: {},
  chunkSize: Infinity,
  withCredentials: false
};

var Upload = (function () {
  function Upload(file, options) {
    _classCallCheck(this, Upload);

    this.options = extend(true, {}, defaultOptions, options);

    // The underlying File/Blob object
    this.file = file;

    // The URL against which the file will be uploaded
    this.url = null;

    // The underlying XHR object for the current PATCH request
    this._xhr = null;

    // The fingerpinrt for the current file (set after start())
    this._fingerprint = null;

    // The offset used in the current PATCH request
    this._offset = null;

    // True if the current PATCH request has been aborted
    this._aborted = false;
  }

  _createClass(Upload, {
    start: {
      value: function start() {
        var file = this.file;

        if (!file) {
          this._emitError(new Error("tus: no file to upload provided"));
          return;
        }

        if (!this.options.endpoint) {
          this._emitError(new Error("tus: no endpoint provided"));
          return;
        }

        // A URL has manually been specified, so we try to resume
        if (this.url !== null) {
          this._resumeUpload();
          return;
        }

        // Try to find the endpoint for the file in the localStorage
        if (this.options.resume) {
          this._fingerprint = this.options.fingerprint(file);
          var resumedUrl = localStorage.getItem(this._fingerprint);

          if (resumedUrl != null) {
            this.url = resumedUrl;
            this._resumeUpload();
            return;
          }
        }

        // An upload has not started for the file yet, so we start a new one
        this._createUpload();
      }
    },
    abort: {
      value: function abort() {
        if (this._xhr !== null) {
          this._xhr.abort();
          this._aborted = true;
        }
      }
    },
    _emitXhrError: {
      value: function _emitXhrError(xhr, err) {
        err.originalRequest = xhr;
        this._emitError(err);
      }
    },
    _emitError: {
      value: function _emitError(err) {
        if (typeof this.options.onError === "function") {
          this.options.onError(err);
        } else {
          throw err;
        }
      }
    },
    _emitSuccess: {
      value: function _emitSuccess() {
        if (typeof this.options.onSuccess === "function") {
          this.options.onSuccess();
        }
      }
    },
    _emitProgress: {

      /**
       * Publishes notification when data has been sent to the server. This
       * data may not have been accepted by the server yet.
       * @param  {number} bytesSent  Number of bytes sent to the server.
       * @param  {number} bytesTotal Total number of bytes to be sent to the server.
       */

      value: function _emitProgress(bytesSent, bytesTotal) {
        if (typeof this.options.onProgress === "function") {
          this.options.onProgress(bytesSent, bytesTotal);
        }
      }
    },
    _emitChunkComplete: {

      /**
       * Publishes notification when a chunk of data has been sent to the server
       * and accepted by the server.
       * @param  {number} chunkSize  Size of the chunk that was accepted by the
       *                             server.
       * @param  {number} bytesAccepted Total number of bytes that have been
       *                                accepted by the server.
       * @param  {number} bytesTotal Total number of bytes to be sent to the server.
       */

      value: function _emitChunkComplete(chunkSize, bytesAccepted, bytesTotal) {
        if (typeof this.options.onChunkComplete === "function") {
          this.options.onChunkComplete(chunkSize, bytesAccepted, bytesTotal);
        }
      }
    },
    _setupXHR: {

      /**
       * Set the headers used in the request and the withCredentials property
       * as defined in the options
       *
       * @param {XMLHttpRequest} xhr
       */

      value: function _setupXHR(xhr) {
        xhr.setRequestHeader("Tus-Resumable", "1.0.0");
        var headers = this.options.headers;

        for (var _name in headers) {
          xhr.setRequestHeader(_name, headers[_name]);
        }

        xhr.withCredentials = this.options.withCredentials;
      }
    },
    _createUpload: {

      /**
       * Create a new upload using the creation extension by sending a POST
       * request to the endpoint. After successful creation the file will be
       * uploaded
       *
       * @api private
       */

      value: function _createUpload() {
        var _this = this;

        var xhr = new XMLHttpRequest();
        xhr.open("POST", this.options.endpoint, true);

        xhr.onload = function () {
          if (!(xhr.status >= 200 && xhr.status < 300)) {
            _this._emitXhrError(xhr, new Error("tus: unexpected response while creating upload"));
            return;
          }

          _this.url = xhr.getResponseHeader("Location");

          if (_this.options.resume) {
            localStorage.setItem(_this._fingerprint, _this.url);
          }

          _this._offset = 0;
          _this._startUpload();
        };

        xhr.onerror = function () {
          _this._emitXhrError(xhr, new Error("tus: failed to create upload"));
        };

        this._setupXHR(xhr);
        xhr.setRequestHeader("Upload-Length", this.file.size);

        // Add metadata if values have been added
        var metadata = encodeMetadata(this.options.metadata);
        if (metadata !== "") {
          xhr.setRequestHeader("Upload-Metadata", metadata);
        }

        xhr.send(null);
      }
    },
    _resumeUpload: {

      /*
       * Try to resume an existing upload. First a HEAD request will be sent
       * to retrieve the offset. If the request fails a new upload will be
       * created. In the case of a successful response the file will be uploaded.
       *
       * @api private
       */

      value: function _resumeUpload() {
        var _this = this;

        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", this.url, true);

        xhr.onload = function () {
          if (!(xhr.status >= 200 && xhr.status < 300)) {
            if (_this.options.resume) {
              // Remove stored fingerprint and corresponding endpoint,
              // since the file can not be found
              localStorage.removeItem(_this._fingerprint);
            }

            // Try to create a new upload
            _this.url = null;
            _this._createUpload();
            return;
          }

          var offset = parseInt(xhr.getResponseHeader("Upload-Offset"), 10);
          if (isNaN(offset)) {
            _this._emitXhrError(xhr, new Error("tus: invalid or missing offset value"));
            return;
          }

          _this._offset = offset;
          _this._startUpload();
        };

        xhr.onerror = function () {
          _this._emitXhrError(xhr, new Error("tus: failed to resume upload"));
        };

        this._setupXHR(xhr);
        xhr.send(null);
      }
    },
    _startUpload: {

      /**
       * Start uploading the file using PATCH requests. The file will be divided
       * into chunks as specified in the chunkSize option. During the upload
       * the onProgress event handler may be invoked multiple times.
       *
       * @api private
       */

      value: function _startUpload() {
        var _this = this;

        var xhr = this._xhr = new XMLHttpRequest();
        xhr.open("PATCH", this.url, true);

        xhr.onload = function () {
          if (!(xhr.status >= 200 && xhr.status < 300)) {
            _this._emitXhrError(xhr, new Error("tus: unexpected response while creating upload"));
            return;
          }

          var offset = parseInt(xhr.getResponseHeader("Upload-Offset"), 10);
          if (isNaN(offset)) {
            _this._emitXhrError(xhr, new Error("tus: invalid or missing offset value"));
            return;
          }

          _this._emitChunkComplete(offset - _this._offset, offset, _this.file.size);

          _this._offset = offset;

          if (offset == _this.file.size) {
            // Yay, finally done :)
            // Emit a last progress event
            _this._emitProgress(offset, offset);
            _this._emitSuccess();
            return;
          }

          _this._startUpload();
        };

        xhr.onerror = function () {
          // Don't emit an error if the upload was aborted manually
          if (_this._aborted) {
            return;
          }

          _this._emitXhrError(xhr, new Error("tus: failed to upload chunk at offset " + _this._offset));
        };

        // Test support for progress events before attaching an event listener
        if ("upload" in xhr) {
          xhr.upload.onprogress = function (e) {
            if (!e.lengthComputable) {
              return;
            }

            _this._emitProgress(start + e.loaded, _this.file.size);
          };
        }

        this._setupXHR(xhr);

        xhr.setRequestHeader("Upload-Offset", this._offset);
        xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");

        var start = this._offset;
        var end = this._offset + this.options.chunkSize;

        if (end === Infinity) {
          end = this.file.size;
        }

        xhr.send(this.file.slice(start, end));
      }
    }
  });

  return Upload;
})();

function encodeMetadata(metadata) {
  if (!("btoa" in window)) {
    return "";
  }

  var encoded = [];

  for (var key in metadata) {
    encoded.push(key + " " + btoa(unescape(encodeURIComponent(metadata[key]))));
  }

  return encoded.join(",");
}

Upload.defaultOptions = defaultOptions;

module.exports = Upload;
},{"./fingerprint":7,"extend":10}],10:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {/**/}

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						target[name] = copy;
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],11:[function(require,module,exports){
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

},{"./update-events.js":19,"bel":12,"morphdom":18}],12:[function(require,module,exports){
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

},{"global/document":13,"hyperx":15,"on-load":17}],13:[function(require,module,exports){
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

},{"min-document":29}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"hyperscript-attribute-to-property":16}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"global/document":13,"global/window":14}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"../core/Translator":21,"../core/Utils":23,"../locales/en_US.js":24,"./UppySocket":22,"events":30,"pretty-bytes":5,"yo-yo":11}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{"events":30}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _templateObject = _taggedTemplateLiteralLoose(['\n      <svg class="UppyIcon UppyModalTab-icon" width="28" height="28" viewBox="0 0 16 16">\n        <path d="M15.982 2.97c0-.02 0-.02-.018-.037 0-.017-.017-.035-.035-.053 0 0 0-.018-.02-.018-.017-.018-.034-.053-.052-.07L13.19.123c-.017-.017-.034-.035-.07-.053h-.018c-.018-.017-.035-.017-.053-.034h-.02c-.017 0-.034-.018-.052-.018h-6.31a.415.415 0 0 0-.446.426V11.11c0 .25.196.446.445.446h8.89A.44.44 0 0 0 16 11.11V3.023c-.018-.018-.018-.035-.018-.053zm-2.65-1.46l1.157 1.157h-1.157V1.51zm1.78 9.157h-8V.89h5.332v2.22c0 .25.196.446.445.446h2.22v7.11z"/>\n        <path d="M9.778 12.89H4V2.666a.44.44 0 0 0-.444-.445.44.44 0 0 0-.445.445v10.666c0 .25.197.445.446.445h6.222a.44.44 0 0 0 .444-.445.44.44 0 0 0-.444-.444z"/>\n        <path d="M.444 16h6.223a.44.44 0 0 0 .444-.444.44.44 0 0 0-.443-.445H.89V4.89a.44.44 0 0 0-.446-.446A.44.44 0 0 0 0 4.89v10.666c0 .248.196.444.444.444z"/>\n      </svg>\n    '], ['\n      <svg class="UppyIcon UppyModalTab-icon" width="28" height="28" viewBox="0 0 16 16">\n        <path d="M15.982 2.97c0-.02 0-.02-.018-.037 0-.017-.017-.035-.035-.053 0 0 0-.018-.02-.018-.017-.018-.034-.053-.052-.07L13.19.123c-.017-.017-.034-.035-.07-.053h-.018c-.018-.017-.035-.017-.053-.034h-.02c-.017 0-.034-.018-.052-.018h-6.31a.415.415 0 0 0-.446.426V11.11c0 .25.196.446.445.446h8.89A.44.44 0 0 0 16 11.11V3.023c-.018-.018-.018-.035-.018-.053zm-2.65-1.46l1.157 1.157h-1.157V1.51zm1.78 9.157h-8V.89h5.332v2.22c0 .25.196.446.445.446h2.22v7.11z"/>\n        <path d="M9.778 12.89H4V2.666a.44.44 0 0 0-.444-.445.44.44 0 0 0-.445.445v10.666c0 .25.197.445.446.445h6.222a.44.44 0 0 0 .444-.445.44.44 0 0 0-.444-.444z"/>\n        <path d="M.444 16h6.223a.44.44 0 0 0 .444-.444.44.44 0 0 0-.443-.445H.89V4.89a.44.44 0 0 0-.446-.446A.44.44 0 0 0 0 4.89v10.666c0 .248.196.444.444.444z"/>\n      </svg>\n    ']),
    _templateObject2 = _taggedTemplateLiteralLoose(['\n      <div class="UppyDragDrop-container ', '">\n        <form class="UppyDragDrop-inner"\n              onsubmit=', '>\n          <input class="UppyDragDrop-input UppyDragDrop-focus"\n                 type="file"\n                 name="files[]"\n                 multiple="true"\n                 value=""\n                 onchange=', ' />\n          <label class="UppyDragDrop-label" onclick=', '>\n            <strong>', '</strong>\n            <span class="UppyDragDrop-dragText">', '</span>\n          </label>\n          ', '\n        </form>\n      </div>\n    '], ['\n      <div class="UppyDragDrop-container ', '">\n        <form class="UppyDragDrop-inner"\n              onsubmit=', '>\n          <input class="UppyDragDrop-input UppyDragDrop-focus"\n                 type="file"\n                 name="files[]"\n                 multiple="true"\n                 value=""\n                 onchange=', ' />\n          <label class="UppyDragDrop-label" onclick=', '>\n            <strong>', '</strong>\n            <span class="UppyDragDrop-dragText">', '</span>\n          </label>\n          ', '\n        </form>\n      </div>\n    ']),
    _templateObject3 = _taggedTemplateLiteralLoose(['<button class="UppyDragDrop-uploadBtn UppyNextBtn"\n                         type="submit"\n                         onclick=', '>\n                    ', '\n              </button>'], ['<button class="UppyDragDrop-uploadBtn UppyNextBtn"\n                         type="submit"\n                         onclick=', '>\n                    ', '\n              </button>']);

var _Plugin2 = require('./Plugin');

var _Plugin3 = _interopRequireDefault(_Plugin2);

var _Utils = require('../core/Utils');

var _Utils2 = _interopRequireDefault(_Utils);

var _dragDrop = require('drag-drop');

var _dragDrop2 = _interopRequireDefault(_dragDrop);

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteralLoose(strings, raw) { strings.raw = raw; return strings; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Drag & Drop plugin
 *
 */

var DragDrop = function (_Plugin) {
  _inherits(DragDrop, _Plugin);

  function DragDrop(core, opts) {
    _classCallCheck(this, DragDrop);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, core, opts));

    _this.type = 'acquirer';
    _this.id = 'DragDrop';
    _this.title = 'Drag & Drop';
    _this.icon = (0, _yoYo2.default)(_templateObject);

    // Default options
    var defaultOptions = {
      target: '.UppyDragDrop'
    };

    // Merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);

    // Check for browser dragDrop support
    _this.isDragDropSupported = _this.checkDragDropSupport();

    // Bind `this` to class methods
    _this.handleDrop = _this.handleDrop.bind(_this);
    _this.checkDragDropSupport = _this.checkDragDropSupport.bind(_this);
    _this.handleInputChange = _this.handleInputChange.bind(_this);
    _this.render = _this.render.bind(_this);
    return _this;
  }

  /**
   * Checks if the browser supports Drag & Drop (not supported on mobile devices, for example).
   * @return {Boolean} true if supported, false otherwise
   */


  DragDrop.prototype.checkDragDropSupport = function checkDragDropSupport() {
    var div = document.createElement('div');

    if (!('draggable' in div) || !('ondragstart' in div && 'ondrop' in div)) {
      return false;
    }

    if (!('FormData' in window)) {
      return false;
    }

    if (!('FileReader' in window)) {
      return false;
    }

    return true;
  };

  DragDrop.prototype.handleDrop = function handleDrop(files) {
    var _this2 = this;

    this.core.log('All right, someone dropped something...');

    // this.core.emitter.emit('file-add', {
    //   plugin: this,
    //   acquiredFiles: files
    // })

    files.forEach(function (file) {
      _this2.core.emitter.emit('file-add', {
        source: _this2.id,
        name: file.name,
        type: file.type,
        data: file
      });
    });

    this.core.addMeta({ bla: 'bla' });
  };

  DragDrop.prototype.handleInputChange = function handleInputChange(ev) {
    var _this3 = this;

    this.core.log('All right, something selected through input...');

    var files = _Utils2.default.toArray(ev.target.files);

    files.forEach(function (file) {
      console.log(file);
      _this3.core.emitter.emit('file-add', {
        source: _this3.id,
        name: file.name,
        type: file.type,
        data: file
      });
    });
  };

  DragDrop.prototype.focus = function focus() {
    var firstInput = document.querySelector(this.target + ' .UppyDragDrop-focus');

    // only works for the first time if wrapped in setTimeout for some reason
    // firstInput.focus()
    setTimeout(function () {
      firstInput.focus();
    }, 10);
  };

  DragDrop.prototype.render = function render(state) {
    var _this4 = this;

    // Another way not to render next/upload button — if Modal is used as a target
    var target = this.opts.target.name;

    var onSelect = function onSelect(ev) {
      var input = document.querySelector(_this4.target + ' .UppyDragDrop-input');
      input.click();
    };

    var next = function next(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      _this4.core.emitter.emit('next');
    };

    var onSubmit = function onSubmit(ev) {
      ev.preventDefault();
    };

    return (0, _yoYo2.default)(_templateObject2, this.isDragDropSupported ? 'is-dragdrop-supported' : '', onSubmit, this.handleInputChange.bind(this), onSelect, this.core.i18n('chooseFile'), this.core.i18n('orDragDrop'), !this.core.opts.autoProceed && target !== 'Modal' ? (0, _yoYo2.default)(_templateObject3, next, this.core.i18n('upload')) : '');
  };

  DragDrop.prototype.install = function install() {
    var _this5 = this;

    var target = this.opts.target;
    var plugin = this;
    this.target = this.mount(target, plugin);

    (0, _dragDrop2.default)(this.target + ' .UppyDragDrop-container', function (files) {
      _this5.handleDrop(files);
      _this5.core.log(files);
    });
  };

  return DragDrop;
}(_Plugin3.default);

exports.default = DragDrop;

},{"../core/Utils":23,"./Plugin":26,"drag-drop":1,"yo-yo":11}],26:[function(require,module,exports){
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

},{"yo-yo":11}],27:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _templateObject = _taggedTemplateLiteralLoose(['<div class="UppyProgressBar">\n      <div class="UppyProgressBar-inner" style="width: ', '%"></div>\n      <div class="UppyProgressBar-percentage">', '</div>\n    </div>'], ['<div class="UppyProgressBar">\n      <div class="UppyProgressBar-inner" style="width: ', '%"></div>\n      <div class="UppyProgressBar-percentage">', '</div>\n    </div>']);

var _Plugin2 = require('./Plugin');

var _Plugin3 = _interopRequireDefault(_Plugin2);

var _yoYo = require('yo-yo');

var _yoYo2 = _interopRequireDefault(_yoYo);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteralLoose(strings, raw) { strings.raw = raw; return strings; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Progress bar
 *
 */

var ProgressBar = function (_Plugin) {
  _inherits(ProgressBar, _Plugin);

  function ProgressBar(core, opts) {
    _classCallCheck(this, ProgressBar);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, core, opts));

    _this.id = 'ProgressBar';
    _this.title = 'Progress Bar';
    _this.type = 'progressindicator';

    // set default options
    var defaultOptions = {
      replaceTargetContent: false
    };

    // merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);

    _this.render = _this.render.bind(_this);
    return _this;
  }

  ProgressBar.prototype.render = function render(state) {
    var progress = state.totalProgress || 0;

    return (0, _yoYo2.default)(_templateObject, progress, progress);
  };

  ProgressBar.prototype.install = function install() {
    var target = this.opts.target;
    var plugin = this;
    this.target = this.mount(target, plugin);
  };

  return ProgressBar;
}(_Plugin3.default);

exports.default = ProgressBar;

},{"./Plugin":26,"yo-yo":11}],28:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _Plugin2 = require('./Plugin');

var _Plugin3 = _interopRequireDefault(_Plugin2);

var _tusJsClient = require('tus-js-client');

var _tusJsClient2 = _interopRequireDefault(_tusJsClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _Promise = typeof Promise === 'undefined' ? require('es6-promise').Promise : Promise;

/**
 * Tus resumable file uploader
 *
 */

var Tus10 = function (_Plugin) {
  _inherits(Tus10, _Plugin);

  function Tus10(core, opts) {
    _classCallCheck(this, Tus10);

    var _this = _possibleConstructorReturn(this, _Plugin.call(this, core, opts));

    _this.type = 'uploader';
    _this.id = 'Tus';
    _this.title = 'Tus';

    // set default options
    var defaultOptions = {};

    // merge default options with the ones set by user
    _this.opts = _extends({}, defaultOptions, opts);
    return _this;
  }

  /**
   * Create a new Tus upload
   *
   * @param {object} file for use with upload
   * @param {integer} current file in a queue
   * @param {integer} total number of files in a queue
   * @returns {Promise}
   */


  Tus10.prototype.upload = function upload(file, current, total) {
    var _this2 = this;

    this.core.log('uploading ' + current + ' of ' + total);

    // Create a new tus upload
    return new _Promise(function (resolve, reject) {
      var upload = new _tusJsClient2.default.Upload(file.data, {

        // TODO merge this.opts or this.opts.tus here
        resume: false,
        endpoint: _this2.opts.endpoint,
        onError: function onError(error) {
          reject('Failed because: ' + error);
        },
        onProgress: function onProgress(bytesUploaded, bytesTotal) {
          // Dispatch progress event
          _this2.core.emitter.emit('upload-progress', {
            uploader: _this2,
            id: file.id,
            bytesUploaded: bytesUploaded,
            bytesTotal: bytesTotal
          });
        },
        onSuccess: function onSuccess() {
          file.uploadURL = upload.url;
          _this2.core.emitter.emit('upload-success', file);

          _this2.core.log('Download ' + upload.file.name + ' from ' + upload.url);
          resolve(upload);
        }
      });
      _this2.core.emitter.on('file-remove', function (fileID) {
        if (fileID === file.id) {
          upload.abort();
        }
      });
      upload.start();
    });
  };

  Tus10.prototype.uploadFiles = function uploadFiles(files) {
    var _this3 = this;

    var uploaders = [];
    files.forEach(function (file, index) {
      var current = parseInt(index, 10) + 1;
      var total = files.length;

      if (!file.isRemote) {
        uploaders.push(_this3.upload(file, current, total));
      } else {
        uploaders.push(_this3.upload(file, current, total));
      }
    });

    return Promise.all(uploaders).then(function () {
      return {
        uploadedCount: files.length
      };
    });
  };

  Tus10.prototype.uploadRemote = function uploadRemote(file, current, total) {
    var _this4 = this;

    return new _Promise(function (resolve, reject) {
      var payload = _extends({}, file.remote.payload, {
        target: _this4.opts.endpoint,
        protocol: 'tus'
      });
      _this4.core.socket.send(file.remote.action, payload);
      _this4.core.socket.once('upload-success', function () {
        console.log('success');
        _this4.core.emitter.emit('upload-success', file);

        _this4.core.emitter.emit('upload-progress', {
          id: file.id,
          percentage: 100
        });

        resolve();
      });
    });
  };

  Tus10.prototype.selectForUpload = function selectForUpload(files) {
    // TODO: replace files[file].isRemote with some logic
    //
    // filter files that are now yet being uploaded / haven’t been uploaded
    // and remote too
    var filesForUpload = Object.keys(files).filter(function (file) {
      if (files[file].progress === 0 || files[file].isRemote) {
        return true;
      }
      return false;
    }).map(function (file) {
      return files[file];
    });

    this.uploadFiles(filesForUpload);
  };

  Tus10.prototype.install = function install() {
    var _this5 = this;

    this.core.emitter.on('next', function () {
      _this5.core.log('Tus is uploading...');
      var files = _this5.core.state.files;
      _this5.selectForUpload(files);
    });
  };

  return Tus10;
}(_Plugin3.default);

exports.default = Tus10;

},{"./Plugin":26,"es6-promise":4,"tus-js-client":8}],29:[function(require,module,exports){

},{}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],32:[function(require,module,exports){
'use strict';

var _Core = require('../../../../src/core/Core.js');

var _Core2 = _interopRequireDefault(_Core);

var _DragDrop = require('../../../../src/plugins/DragDrop.js');

var _DragDrop2 = _interopRequireDefault(_DragDrop);

var _ProgressBar = require('../../../../src/plugins/ProgressBar.js');

var _ProgressBar2 = _interopRequireDefault(_ProgressBar);

var _Tus = require('../../../../src/plugins/Tus10.js');

var _Tus2 = _interopRequireDefault(_Tus);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uppyOne = new _Core2.default({ debug: true });
uppyOne.use(_DragDrop2.default, { target: '.UppyDragDrop-One' }).use(_Tus2.default, { endpoint: 'http://master.tus.io:8080/files/' }).use(_ProgressBar2.default, { target: '.UppyDragDrop-One-Progress' }).run();

var uppyTwo = new _Core2.default({ debug: true, autoProceed: false });
uppyTwo.use(_DragDrop2.default, { target: '#UppyDragDrop-Two' }).use(_Tus2.default, { endpoint: 'http://master.tus.io:8080/files/' }).use(_ProgressBar2.default, { target: '.UppyDragDrop-Two-Progress' }).run();

},{"../../../../src/core/Core.js":20,"../../../../src/plugins/DragDrop.js":25,"../../../../src/plugins/ProgressBar.js":27,"../../../../src/plugins/Tus10.js":28}]},{},[32])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvZHJhZy1kcm9wL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvZmxhdHRlbi9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL3J1bi1wYXJhbGxlbC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2VzNi1wcm9taXNlLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3ByZXR0eS1ieXRlcy9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9wcmV0dHktYnl0ZXMvbm9kZV9tb2R1bGVzL251bWJlci1pcy1uYW4vaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMvdHVzLWpzLWNsaWVudC9saWIuZXM1L2ZpbmdlcnByaW50LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3R1cy1qcy1jbGllbnQvbGliLmVzNS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy90dXMtanMtY2xpZW50L2xpYi5lczUvdXBsb2FkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3R1cy1qcy1jbGllbnQvbm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3lvLXlvL25vZGVfbW9kdWxlcy9iZWwvbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9nbG9iYWwvd2luZG93LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3lvLXlvL25vZGVfbW9kdWxlcy9iZWwvbm9kZV9tb2R1bGVzL2h5cGVyeC9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9oeXBlcngvbm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy95by15by9ub2RlX21vZHVsZXMvYmVsL25vZGVfbW9kdWxlcy9vbi1sb2FkL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3lvLXlvL25vZGVfbW9kdWxlcy9tb3JwaGRvbS9saWIvaW5kZXguanMiLCIuLi9ub2RlX21vZHVsZXMveW8teW8vdXBkYXRlLWV2ZW50cy5qcyIsIi4uL3NyYy9jb3JlL0NvcmUuanMiLCIuLi9zcmMvY29yZS9UcmFuc2xhdG9yLmpzIiwiLi4vc3JjL2NvcmUvVXBweVNvY2tldC5qcyIsIi4uL3NyYy9jb3JlL1V0aWxzLmpzIiwiLi4vc3JjL2xvY2FsZXMvZW5fVVMuanMiLCIuLi9zcmMvcGx1Z2lucy9EcmFnRHJvcC5qcyIsIi4uL3NyYy9wbHVnaW5zL1BsdWdpbi5qcyIsIi4uL3NyYy9wbHVnaW5zL1Byb2dyZXNzQmFyLmpzIiwiLi4vc3JjL3BsdWdpbnMvVHVzMTAuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwic3JjL2V4YW1wbGVzL2RyYWdkcm9wL2FwcC5lczYiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDLzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzRkE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQU0sVUFBVSxtQkFBUyxFQUFDLE9BQU8sSUFBUixFQUFULENBQWhCO0FBQ0EsUUFDRyxHQURILHFCQUNpQixFQUFDLFFBQVEsbUJBQVQsRUFEakIsRUFFRyxHQUZILGdCQUVjLEVBQUMsVUFBVSxrQ0FBWCxFQUZkLEVBR0csR0FISCx3QkFHb0IsRUFBQyxRQUFRLDRCQUFULEVBSHBCLEVBSUcsR0FKSDs7QUFNQSxJQUFNLFVBQVUsbUJBQVMsRUFBQyxPQUFPLElBQVIsRUFBYyxhQUFhLEtBQTNCLEVBQVQsQ0FBaEI7QUFDQSxRQUNHLEdBREgscUJBQ2lCLEVBQUMsUUFBUSxtQkFBVCxFQURqQixFQUVHLEdBRkgsZ0JBRWMsRUFBQyxVQUFVLGtDQUFYLEVBRmQsRUFHRyxHQUhILHdCQUdvQixFQUFDLFFBQVEsNEJBQVQsRUFIcEIsRUFJRyxHQUpIIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZHJhZ0Ryb3BcblxudmFyIGZsYXR0ZW4gPSByZXF1aXJlKCdmbGF0dGVuJylcbnZhciBwYXJhbGxlbCA9IHJlcXVpcmUoJ3J1bi1wYXJhbGxlbCcpXG5cbmZ1bmN0aW9uIGRyYWdEcm9wIChlbGVtLCBsaXN0ZW5lcnMpIHtcbiAgaWYgKHR5cGVvZiBlbGVtID09PSAnc3RyaW5nJykge1xuICAgIGVsZW0gPSB3aW5kb3cuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBsaXN0ZW5lcnMgPSB7IG9uRHJvcDogbGlzdGVuZXJzIH1cbiAgfVxuXG4gIHZhciB0aW1lb3V0XG5cbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBzdG9wRXZlbnQsIGZhbHNlKVxuICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgb25EcmFnT3ZlciwgZmFsc2UpXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2xlYXZlJywgb25EcmFnTGVhdmUsIGZhbHNlKVxuICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBvbkRyb3AsIGZhbHNlKVxuXG4gIC8vIEZ1bmN0aW9uIHRvIHJlbW92ZSBkcmFnLWRyb3AgbGlzdGVuZXJzXG4gIHJldHVybiBmdW5jdGlvbiByZW1vdmUgKCkge1xuICAgIHJlbW92ZURyYWdDbGFzcygpXG4gICAgZWxlbS5yZW1vdmVFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBzdG9wRXZlbnQsIGZhbHNlKVxuICAgIGVsZW0ucmVtb3ZlRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBvbkRyYWdPdmVyLCBmYWxzZSlcbiAgICBlbGVtLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2RyYWdsZWF2ZScsIG9uRHJhZ0xlYXZlLCBmYWxzZSlcbiAgICBlbGVtLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBvbkRyb3AsIGZhbHNlKVxuICB9XG5cbiAgZnVuY3Rpb24gb25EcmFnT3ZlciAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBpZiAoZS5kYXRhVHJhbnNmZXIuaXRlbXMpIHtcbiAgICAgIC8vIE9ubHkgYWRkIFwiZHJhZ1wiIGNsYXNzIHdoZW4gYGl0ZW1zYCBjb250YWlucyBhIGZpbGVcbiAgICAgIHZhciBpdGVtcyA9IHRvQXJyYXkoZS5kYXRhVHJhbnNmZXIuaXRlbXMpLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5raW5kID09PSAnZmlsZSdcbiAgICAgIH0pXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgICB9XG5cbiAgICBlbGVtLmNsYXNzTGlzdC5hZGQoJ2RyYWcnKVxuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KVxuXG4gICAgaWYgKGxpc3RlbmVycy5vbkRyYWdPdmVyKSB7XG4gICAgICBsaXN0ZW5lcnMub25EcmFnT3ZlcihlKVxuICAgIH1cblxuICAgIGUuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnY29weSdcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uRHJhZ0xlYXZlIChlKSB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgKGxpc3RlbmVycy5vbkRyYWdMZWF2ZSkge1xuICAgICAgbGlzdGVuZXJzLm9uRHJhZ0xlYXZlKGUpXG4gICAgfVxuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQocmVtb3ZlRHJhZ0NsYXNzLCA1MClcblxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgZnVuY3Rpb24gb25Ecm9wIChlKSB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgKGxpc3RlbmVycy5vbkRyYWdMZWF2ZSkge1xuICAgICAgbGlzdGVuZXJzLm9uRHJhZ0xlYXZlKGUpXG4gICAgfVxuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpXG4gICAgcmVtb3ZlRHJhZ0NsYXNzKClcblxuICAgIHZhciBwb3MgPSB7XG4gICAgICB4OiBlLmNsaWVudFgsXG4gICAgICB5OiBlLmNsaWVudFlcbiAgICB9XG5cbiAgICBpZiAoZS5kYXRhVHJhbnNmZXIuaXRlbXMpIHtcbiAgICAgIC8vIEhhbmRsZSBkaXJlY3RvcmllcyBpbiBDaHJvbWUgdXNpbmcgdGhlIHByb3ByaWV0YXJ5IEZpbGVTeXN0ZW0gQVBJXG4gICAgICB2YXIgaXRlbXMgPSB0b0FycmF5KGUuZGF0YVRyYW5zZmVyLml0ZW1zKS5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0ua2luZCA9PT0gJ2ZpbGUnXG4gICAgICB9KVxuXG4gICAgICBpZiAoaXRlbXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAgICAgcGFyYWxsZWwoaXRlbXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICBwcm9jZXNzRW50cnkoaXRlbS53ZWJraXRHZXRBc0VudHJ5KCksIGNiKVxuICAgICAgICB9XG4gICAgICB9KSwgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAvLyBUaGlzIGNhdGNoZXMgcGVybWlzc2lvbiBlcnJvcnMgd2l0aCBmaWxlOi8vIGluIENocm9tZS4gVGhpcyBzaG91bGQgbmV2ZXJcbiAgICAgICAgLy8gdGhyb3cgaW4gcHJvZHVjdGlvbiBjb2RlLCBzbyB0aGUgdXNlciBkb2VzIG5vdCBuZWVkIHRvIHVzZSB0cnktY2F0Y2guXG4gICAgICAgIGlmIChlcnIpIHRocm93IGVyclxuICAgICAgICBpZiAobGlzdGVuZXJzLm9uRHJvcCkge1xuICAgICAgICAgIGxpc3RlbmVycy5vbkRyb3AoZmxhdHRlbihyZXN1bHRzKSwgcG9zKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZmlsZXMgPSB0b0FycmF5KGUuZGF0YVRyYW5zZmVyLmZpbGVzKVxuXG4gICAgICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAgICAgZmlsZXMuZm9yRWFjaChmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICBmaWxlLmZ1bGxQYXRoID0gJy8nICsgZmlsZS5uYW1lXG4gICAgICB9KVxuXG4gICAgICBpZiAobGlzdGVuZXJzLm9uRHJvcCkge1xuICAgICAgICBsaXN0ZW5lcnMub25Ecm9wKGZpbGVzLCBwb3MpXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVEcmFnQ2xhc3MgKCkge1xuICAgIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpXG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcEV2ZW50IChlKSB7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHJldHVybiBmYWxzZVxufVxuXG5mdW5jdGlvbiBwcm9jZXNzRW50cnkgKGVudHJ5LCBjYikge1xuICB2YXIgZW50cmllcyA9IFtdXG5cbiAgaWYgKGVudHJ5LmlzRmlsZSkge1xuICAgIGVudHJ5LmZpbGUoZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgIGZpbGUuZnVsbFBhdGggPSBlbnRyeS5mdWxsUGF0aCAgLy8gcHJlc2VydmUgcGF0aGluZyBmb3IgY29uc3VtZXJcbiAgICAgIGNiKG51bGwsIGZpbGUpXG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgY2IoZXJyKVxuICAgIH0pXG4gIH0gZWxzZSBpZiAoZW50cnkuaXNEaXJlY3RvcnkpIHtcbiAgICB2YXIgcmVhZGVyID0gZW50cnkuY3JlYXRlUmVhZGVyKClcbiAgICByZWFkRW50cmllcygpXG4gIH1cblxuICBmdW5jdGlvbiByZWFkRW50cmllcyAoKSB7XG4gICAgcmVhZGVyLnJlYWRFbnRyaWVzKGZ1bmN0aW9uIChlbnRyaWVzXykge1xuICAgICAgaWYgKGVudHJpZXNfLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZW50cmllcyA9IGVudHJpZXMuY29uY2F0KHRvQXJyYXkoZW50cmllc18pKVxuICAgICAgICByZWFkRW50cmllcygpIC8vIGNvbnRpbnVlIHJlYWRpbmcgZW50cmllcyB1bnRpbCBgcmVhZEVudHJpZXNgIHJldHVybnMgbm8gbW9yZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9uZUVudHJpZXMoKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiBkb25lRW50cmllcyAoKSB7XG4gICAgcGFyYWxsZWwoZW50cmllcy5tYXAoZnVuY3Rpb24gKGVudHJ5KSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIHByb2Nlc3NFbnRyeShlbnRyeSwgY2IpXG4gICAgICB9XG4gICAgfSksIGNiKVxuICB9XG59XG5cbmZ1bmN0aW9uIHRvQXJyYXkgKGxpc3QpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGxpc3QgfHwgW10sIDApXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZsYXR0ZW4obGlzdCwgZGVwdGgpIHtcbiAgZGVwdGggPSAodHlwZW9mIGRlcHRoID09ICdudW1iZXInKSA/IGRlcHRoIDogSW5maW5pdHk7XG5cbiAgaWYgKCFkZXB0aCkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgICByZXR1cm4gbGlzdC5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gaTsgfSk7XG4gICAgfVxuICAgIHJldHVybiBsaXN0O1xuICB9XG5cbiAgcmV0dXJuIF9mbGF0dGVuKGxpc3QsIDEpO1xuXG4gIGZ1bmN0aW9uIF9mbGF0dGVuKGxpc3QsIGQpIHtcbiAgICByZXR1cm4gbGlzdC5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgaXRlbSkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkgJiYgZCA8IGRlcHRoKSB7XG4gICAgICAgIHJldHVybiBhY2MuY29uY2F0KF9mbGF0dGVuKGl0ZW0sIGQgKyAxKSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGFjYy5jb25jYXQoaXRlbSk7XG4gICAgICB9XG4gICAgfSwgW10pO1xuICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodGFza3MsIGNiKSB7XG4gIHZhciByZXN1bHRzLCBwZW5kaW5nLCBrZXlzXG4gIHZhciBpc1N5bmMgPSB0cnVlXG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodGFza3MpKSB7XG4gICAgcmVzdWx0cyA9IFtdXG4gICAgcGVuZGluZyA9IHRhc2tzLmxlbmd0aFxuICB9IGVsc2Uge1xuICAgIGtleXMgPSBPYmplY3Qua2V5cyh0YXNrcylcbiAgICByZXN1bHRzID0ge31cbiAgICBwZW5kaW5nID0ga2V5cy5sZW5ndGhcbiAgfVxuXG4gIGZ1bmN0aW9uIGRvbmUgKGVycikge1xuICAgIGZ1bmN0aW9uIGVuZCAoKSB7XG4gICAgICBpZiAoY2IpIGNiKGVyciwgcmVzdWx0cylcbiAgICAgIGNiID0gbnVsbFxuICAgIH1cbiAgICBpZiAoaXNTeW5jKSBwcm9jZXNzLm5leHRUaWNrKGVuZClcbiAgICBlbHNlIGVuZCgpXG4gIH1cblxuICBmdW5jdGlvbiBlYWNoIChpLCBlcnIsIHJlc3VsdCkge1xuICAgIHJlc3VsdHNbaV0gPSByZXN1bHRcbiAgICBpZiAoLS1wZW5kaW5nID09PSAwIHx8IGVycikge1xuICAgICAgZG9uZShlcnIpXG4gICAgfVxuICB9XG5cbiAgaWYgKCFwZW5kaW5nKSB7XG4gICAgLy8gZW1wdHlcbiAgICBkb25lKG51bGwpXG4gIH0gZWxzZSBpZiAoa2V5cykge1xuICAgIC8vIG9iamVjdFxuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICB0YXNrc1trZXldKGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkgeyBlYWNoKGtleSwgZXJyLCByZXN1bHQpIH0pXG4gICAgfSlcbiAgfSBlbHNlIHtcbiAgICAvLyBhcnJheVxuICAgIHRhc2tzLmZvckVhY2goZnVuY3Rpb24gKHRhc2ssIGkpIHtcbiAgICAgIHRhc2soZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7IGVhY2goaSwgZXJyLCByZXN1bHQpIH0pXG4gICAgfSlcbiAgfVxuXG4gIGlzU3luYyA9IGZhbHNlXG59XG4iLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAzLjIuMVxuICovXG5cbihmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJG9iamVjdE9yRnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nIHx8ICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeCAhPT0gbnVsbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0Z1bmN0aW9uKHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzTWF5YmVUaGVuYWJsZSh4KSB7XG4gICAgICByZXR1cm4gdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHggIT09IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5ID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSR1dGlscyQkX2lzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIH1cblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkdXRpbHMkJGlzQXJyYXkgPSBsaWIkZXM2JHByb21pc2UkdXRpbHMkJF9pc0FycmF5O1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuID0gMDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHZlcnR4TmV4dDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGN1c3RvbVNjaGVkdWxlckZuO1xuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhc2FwID0gZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbl0gPSBjYWxsYmFjaztcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuICsgMV0gPSBhcmc7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkbGVuICs9IDI7XG4gICAgICBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbiA9PT0gMikge1xuICAgICAgICAvLyBJZiBsZW4gaXMgMiwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgICAgIC8vIElmIGFkZGl0aW9uYWwgY2FsbGJhY2tzIGFyZSBxdWV1ZWQgYmVmb3JlIHRoZSBxdWV1ZSBpcyBmbHVzaGVkLCB0aGV5XG4gICAgICAgIC8vIHdpbGwgYmUgcHJvY2Vzc2VkIGJ5IHRoaXMgZmx1c2ggdGhhdCB3ZSBhcmUgc2NoZWR1bGluZy5cbiAgICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRjdXN0b21TY2hlZHVsZXJGbikge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRjdXN0b21TY2hlZHVsZXJGbihsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2V0U2NoZWR1bGVyKHNjaGVkdWxlRm4pIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRjdXN0b21TY2hlZHVsZXJGbiA9IHNjaGVkdWxlRm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHNldEFzYXAoYXNhcEZuKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXNhcCA9IGFzYXBGbjtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJXaW5kb3cgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDogdW5kZWZpbmVkO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3Nlckdsb2JhbCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyV2luZG93IHx8IHt9O1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkYXNhcCQkQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGxpYiRlczYkcHJvbWlzZSRhc2FwJCRicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc05vZGUgPSB0eXBlb2Ygc2VsZiA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJztcblxuICAgIC8vIHRlc3QgZm9yIHdlYiB3b3JrZXIgYnV0IG5vdCBpbiBJRTEwXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcblxuICAgIC8vIG5vZGVcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTmV4dFRpY2soKSB7XG4gICAgICAvLyBub2RlIHZlcnNpb24gMC4xMC54IGRpc3BsYXlzIGEgZGVwcmVjYXRpb24gd2FybmluZyB3aGVuIG5leHRUaWNrIGlzIHVzZWQgcmVjdXJzaXZlbHlcbiAgICAgIC8vIHNlZSBodHRwczovL2dpdGh1Yi5jb20vY3Vqb2pzL3doZW4vaXNzdWVzLzQxMCBmb3IgZGV0YWlsc1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHZlcnR4XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVZlcnR4VGltZXIoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR2ZXJ0eE5leHQobGliJGVzNiRwcm9taXNlJGFzYXAkJGZsdXNoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgbGliJGVzNiRwcm9taXNlJGFzYXAkJEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCk7XG4gICAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIHdlYiB3b3JrZXJcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2g7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlU2V0VGltZW91dCgpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChsaWIkZXM2JHByb21pc2UkYXNhcCQkZmx1c2gsIDEpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRmbHVzaCgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGliJGVzNiRwcm9taXNlJGFzYXAkJGxlbjsgaSs9Mikge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaV07XG4gICAgICAgIHZhciBhcmcgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkcXVldWVbaSsxXTtcblxuICAgICAgICBjYWxsYmFjayhhcmcpO1xuXG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHF1ZXVlW2krMV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRsZW4gPSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhdHRlbXB0VmVydHgoKSB7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgciA9IHJlcXVpcmU7XG4gICAgICAgIHZhciB2ZXJ0eCA9IHIoJ3ZlcnR4Jyk7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCR2ZXJ0eE5leHQgPSB2ZXJ0eC5ydW5Pbkxvb3AgfHwgdmVydHgucnVuT25Db250ZXh0O1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVZlcnR4VGltZXIoKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2g7XG4gICAgLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbiAgICBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGlzTm9kZSkge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTmV4dFRpY2soKTtcbiAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSRhc2FwJCRCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGlzV29ya2VyKSB7XG4gICAgICBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2NoZWR1bGVGbHVzaCA9IGxpYiRlczYkcHJvbWlzZSRhc2FwJCR1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIH0gZWxzZSBpZiAobGliJGVzNiRwcm9taXNlJGFzYXAkJGJyb3dzZXJXaW5kb3cgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJHNjaGVkdWxlRmx1c2ggPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXR0ZW1wdFZlcnR4KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRzY2hlZHVsZUZsdXNoID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHVzZVNldFRpbWVvdXQoKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHRoZW4kJHRoZW4ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuXG4gICAgICB2YXIgY2hpbGQgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcblxuICAgICAgaWYgKGNoaWxkW2xpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBST01JU0VfSURdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbWFrZVByb21pc2UoY2hpbGQpO1xuICAgICAgfVxuXG4gICAgICB2YXIgc3RhdGUgPSBwYXJlbnQuX3N0YXRlO1xuXG4gICAgICBpZiAoc3RhdGUpIHtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzW3N0YXRlIC0gMV07XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhc2FwKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaW52b2tlQ2FsbGJhY2soc3RhdGUsIGNoaWxkLCBjYWxsYmFjaywgcGFyZW50Ll9yZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjaGlsZDtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSR0aGVuJCRkZWZhdWx0ID0gbGliJGVzNiRwcm9taXNlJHRoZW4kJHRoZW47XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVzb2x2ZSQkcmVzb2x2ZShvYmplY3QpIHtcbiAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICB2YXIgQ29uc3RydWN0b3IgPSB0aGlzO1xuXG4gICAgICBpZiAob2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmIG9iamVjdC5jb25zdHJ1Y3RvciA9PT0gQ29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIHByb21pc2UgPSBuZXcgQ29uc3RydWN0b3IobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZXNvbHZlKHByb21pc2UsIG9iamVjdCk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRyZXNvbHZlO1xuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQUk9NSVNFX0lEID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDE2KTtcblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3AoKSB7fVxuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcgICA9IHZvaWQgMDtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEID0gMTtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQgID0gMjtcblxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUiA9IG5ldyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRFcnJvck9iamVjdCgpO1xuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc2VsZkZ1bGZpbGxtZW50KCkge1xuICAgICAgcmV0dXJuIG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGNhbm5vdFJldHVybk93bigpIHtcbiAgICAgIHJldHVybiBuZXcgVHlwZUVycm9yKCdBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZ2V0VGhlbihwcm9taXNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuO1xuICAgICAgfSBjYXRjaChlcnJvcikge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRHRVRfVEhFTl9FUlJPUi5lcnJvciA9IGVycm9yO1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkR0VUX1RIRU5fRVJST1I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkdHJ5VGhlbih0aGVuLCB2YWx1ZSwgZnVsZmlsbG1lbnRIYW5kbGVyLCByZWplY3Rpb25IYW5kbGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuLmNhbGwodmFsdWUsIGZ1bGZpbGxtZW50SGFuZGxlciwgcmVqZWN0aW9uSGFuZGxlcik7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlRm9yZWlnblRoZW5hYmxlKHByb21pc2UsIHRoZW5hYmxlLCB0aGVuKSB7XG4gICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXAoZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgICAgICB2YXIgc2VhbGVkID0gZmFsc2U7XG4gICAgICAgIHZhciBlcnJvciA9IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHRyeVRoZW4odGhlbiwgdGhlbmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgaWYgKHNlYWxlZCkgeyByZXR1cm47IH1cbiAgICAgICAgICBzZWFsZWQgPSB0cnVlO1xuICAgICAgICAgIGlmICh0aGVuYWJsZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgIGlmIChzZWFsZWQpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcblxuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9LCAnU2V0dGxlOiAnICsgKHByb21pc2UuX2xhYmVsIHx8ICcgdW5rbm93biBwcm9taXNlJykpO1xuXG4gICAgICAgIGlmICghc2VhbGVkICYmIGVycm9yKSB7XG4gICAgICAgICAgc2VhbGVkID0gdHJ1ZTtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9LCBwcm9taXNlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVPd25UaGVuYWJsZShwcm9taXNlLCB0aGVuYWJsZSkge1xuICAgICAgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdGhlbmFibGUuX3Jlc3VsdCk7XG4gICAgICB9IGVsc2UgaWYgKHRoZW5hYmxlLl9zdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHRoZW5hYmxlLl9yZXN1bHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHRoZW5hYmxlLCB1bmRlZmluZWQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRoYW5kbGVNYXliZVRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUsIHRoZW4pIHtcbiAgICAgIGlmIChtYXliZVRoZW5hYmxlLmNvbnN0cnVjdG9yID09PSBwcm9taXNlLmNvbnN0cnVjdG9yICYmXG4gICAgICAgICAgdGhlbiA9PT0gbGliJGVzNiRwcm9taXNlJHRoZW4kJGRlZmF1bHQgJiZcbiAgICAgICAgICBjb25zdHJ1Y3Rvci5yZXNvbHZlID09PSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZXNvbHZlJCRkZWZhdWx0KSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZU93blRoZW5hYmxlKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoZW4gPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEdFVF9USEVOX0VSUk9SLmVycm9yKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGVuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNGdW5jdGlvbih0aGVuKSkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGhhbmRsZUZvcmVpZ25UaGVuYWJsZShwcm9taXNlLCBtYXliZVRoZW5hYmxlLCB0aGVuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRmdWxmaWxsKHByb21pc2UsIG1heWJlVGhlbmFibGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRzZWxmRnVsZmlsbG1lbnQoKSk7XG4gICAgICB9IGVsc2UgaWYgKGxpYiRlczYkcHJvbWlzZSR1dGlscyQkb2JqZWN0T3JGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSwgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZ2V0VGhlbih2YWx1ZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaFJlamVjdGlvbihwcm9taXNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5fb25lcnJvcikge1xuICAgICAgICBwcm9taXNlLl9vbmVycm9yKHByb21pc2UuX3Jlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2gocHJvbWlzZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB2YWx1ZSkge1xuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7IHJldHVybjsgfVxuXG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSB2YWx1ZTtcbiAgICAgIHByb21pc2UuX3N0YXRlID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEO1xuXG4gICAgICBpZiAocHJvbWlzZS5fc3Vic2NyaWJlcnMubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhc2FwKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2gsIHByb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUEVORElORykgeyByZXR1cm47IH1cbiAgICAgIHByb21pc2UuX3N0YXRlID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSByZWFzb247XG5cbiAgICAgIGxpYiRlczYkcHJvbWlzZSRhc2FwJCRhc2FwKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHB1Ymxpc2hSZWplY3Rpb24sIHByb21pc2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHN1YnNjcmliZShwYXJlbnQsIGNoaWxkLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbikge1xuICAgICAgdmFyIHN1YnNjcmliZXJzID0gcGFyZW50Ll9zdWJzY3JpYmVycztcbiAgICAgIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgICAgIHBhcmVudC5fb25lcnJvciA9IG51bGw7XG5cbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aF0gPSBjaGlsZDtcbiAgICAgIHN1YnNjcmliZXJzW2xlbmd0aCArIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRF0gPSBvbkZ1bGZpbGxtZW50O1xuICAgICAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURURdICA9IG9uUmVqZWN0aW9uO1xuXG4gICAgICBpZiAobGVuZ3RoID09PSAwICYmIHBhcmVudC5fc3RhdGUpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJGFzYXAkJGFzYXAobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcHVibGlzaCwgcGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRwdWJsaXNoKHByb21pc2UpIHtcbiAgICAgIHZhciBzdWJzY3JpYmVycyA9IHByb21pc2UuX3N1YnNjcmliZXJzO1xuICAgICAgdmFyIHNldHRsZWQgPSBwcm9taXNlLl9zdGF0ZTtcblxuICAgICAgaWYgKHN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgICAgdmFyIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsID0gcHJvbWlzZS5fcmVzdWx0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YnNjcmliZXJzLmxlbmd0aDsgaSArPSAzKSB7XG4gICAgICAgIGNoaWxkID0gc3Vic2NyaWJlcnNbaV07XG4gICAgICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgICAgIGlmIChjaGlsZCkge1xuICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIGNoaWxkLCBjYWxsYmFjaywgZGV0YWlsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhkZXRhaWwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuX3N1YnNjcmliZXJzLmxlbmd0aCA9IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRXJyb3JPYmplY3QoKSB7XG4gICAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SID0gbmV3IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEVycm9yT2JqZWN0KCk7XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCR0cnlDYXRjaChjYWxsYmFjaywgZGV0YWlsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZGV0YWlsKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IuZXJyb3IgPSBlO1xuICAgICAgICByZXR1cm4gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkVFJZX0NBVENIX0VSUk9SO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgICAgIHZhciBoYXNDYWxsYmFjayA9IGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICAgICAgdmFsdWUsIGVycm9yLCBzdWNjZWVkZWQsIGZhaWxlZDtcblxuICAgICAgaWYgKGhhc0NhbGxiYWNrKSB7XG4gICAgICAgIHZhbHVlID0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkdHJ5Q2F0Y2goY2FsbGJhY2ssIGRldGFpbCk7XG5cbiAgICAgICAgaWYgKHZhbHVlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRUUllfQ0FUQ0hfRVJST1IpIHtcbiAgICAgICAgICBmYWlsZWQgPSB0cnVlO1xuICAgICAgICAgIGVycm9yID0gdmFsdWUuZXJyb3I7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN1Y2NlZWRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvbWlzZSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkY2Fubm90UmV0dXJuT3duKCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGRldGFpbDtcbiAgICAgICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIC8vIG5vb3BcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChmYWlsZWQpIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAoc2V0dGxlZCA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkRlVMRklMTEVEKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCkge1xuICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGluaXRpYWxpemVQcm9taXNlKHByb21pc2UsIHJlc29sdmVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlcihmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSl7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIHJlamVjdFByb21pc2UocmVhc29uKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHByb21pc2UsIHJlYXNvbik7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaWQgPSAwO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5leHRJZCgpIHtcbiAgICAgIHJldHVybiBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpZCsrO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG1ha2VQcm9taXNlKHByb21pc2UpIHtcbiAgICAgIHByb21pc2VbbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUFJPTUlTRV9JRF0gPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpZCsrO1xuICAgICAgcHJvbWlzZS5fc3RhdGUgPSB1bmRlZmluZWQ7XG4gICAgICBwcm9taXNlLl9yZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICBwcm9taXNlLl9zdWJzY3JpYmVycyA9IFtdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJGFsbCQkYWxsKGVudHJpZXMpIHtcbiAgICAgIHJldHVybiBuZXcgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJGRlZmF1bHQodGhpcywgZW50cmllcykucHJvbWlzZTtcbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJGFsbCQkZGVmYXVsdCA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJGFsbCQkYWxsO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJHJhY2UoZW50cmllcykge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG5cbiAgICAgIGlmICghbGliJGVzNiRwcm9taXNlJHV0aWxzJCRpc0FycmF5KGVudHJpZXMpKSB7XG4gICAgICAgIHJldHVybiBuZXcgQ29uc3RydWN0b3IoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS4nKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBDb25zdHJ1Y3RvcihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICB2YXIgbGVuZ3RoID0gZW50cmllcy5sZW5ndGg7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgQ29uc3RydWN0b3IucmVzb2x2ZShlbnRyaWVzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyYWNlJCRyYWNlO1xuICAgIGZ1bmN0aW9uIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlamVjdCQkcmVqZWN0KHJlYXNvbikge1xuICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgIHZhciBDb25zdHJ1Y3RvciA9IHRoaXM7XG4gICAgICB2YXIgcHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcbiAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJHJlamVjdChwcm9taXNlLCByZWFzb24pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZWplY3QkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRyZWplY3QkJHJlamVjdDtcblxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzUmVzb2x2ZXIoKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJG5lZWRzTmV3KCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZTtcbiAgICAvKipcbiAgICAgIFByb21pc2Ugb2JqZWN0cyByZXByZXNlbnQgdGhlIGV2ZW50dWFsIHJlc3VsdCBvZiBhbiBhc3luY2hyb25vdXMgb3BlcmF0aW9uLiBUaGVcbiAgICAgIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsIHdoaWNoXG4gICAgICByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZSByZWFzb25cbiAgICAgIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBUZXJtaW5vbG9neVxuICAgICAgLS0tLS0tLS0tLS1cblxuICAgICAgLSBgcHJvbWlzZWAgaXMgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHdpdGggYSBgdGhlbmAgbWV0aG9kIHdob3NlIGJlaGF2aW9yIGNvbmZvcm1zIHRvIHRoaXMgc3BlY2lmaWNhdGlvbi5cbiAgICAgIC0gYHRoZW5hYmxlYCBpcyBhbiBvYmplY3Qgb3IgZnVuY3Rpb24gdGhhdCBkZWZpbmVzIGEgYHRoZW5gIG1ldGhvZC5cbiAgICAgIC0gYHZhbHVlYCBpcyBhbnkgbGVnYWwgSmF2YVNjcmlwdCB2YWx1ZSAoaW5jbHVkaW5nIHVuZGVmaW5lZCwgYSB0aGVuYWJsZSwgb3IgYSBwcm9taXNlKS5cbiAgICAgIC0gYGV4Y2VwdGlvbmAgaXMgYSB2YWx1ZSB0aGF0IGlzIHRocm93biB1c2luZyB0aGUgdGhyb3cgc3RhdGVtZW50LlxuICAgICAgLSBgcmVhc29uYCBpcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoeSBhIHByb21pc2Ugd2FzIHJlamVjdGVkLlxuICAgICAgLSBgc2V0dGxlZGAgdGhlIGZpbmFsIHJlc3Rpbmcgc3RhdGUgb2YgYSBwcm9taXNlLCBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXG5cbiAgICAgIEEgcHJvbWlzZSBjYW4gYmUgaW4gb25lIG9mIHRocmVlIHN0YXRlczogcGVuZGluZywgZnVsZmlsbGVkLCBvciByZWplY3RlZC5cblxuICAgICAgUHJvbWlzZXMgdGhhdCBhcmUgZnVsZmlsbGVkIGhhdmUgYSBmdWxmaWxsbWVudCB2YWx1ZSBhbmQgYXJlIGluIHRoZSBmdWxmaWxsZWRcbiAgICAgIHN0YXRlLiAgUHJvbWlzZXMgdGhhdCBhcmUgcmVqZWN0ZWQgaGF2ZSBhIHJlamVjdGlvbiByZWFzb24gYW5kIGFyZSBpbiB0aGVcbiAgICAgIHJlamVjdGVkIHN0YXRlLiAgQSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZXZlciBhIHRoZW5hYmxlLlxuXG4gICAgICBQcm9taXNlcyBjYW4gYWxzbyBiZSBzYWlkIHRvICpyZXNvbHZlKiBhIHZhbHVlLiAgSWYgdGhpcyB2YWx1ZSBpcyBhbHNvIGFcbiAgICAgIHByb21pc2UsIHRoZW4gdGhlIG9yaWdpbmFsIHByb21pc2UncyBzZXR0bGVkIHN0YXRlIHdpbGwgbWF0Y2ggdGhlIHZhbHVlJ3NcbiAgICAgIHNldHRsZWQgc3RhdGUuICBTbyBhIHByb21pc2UgdGhhdCAqcmVzb2x2ZXMqIGEgcHJvbWlzZSB0aGF0IHJlamVjdHMgd2lsbFxuICAgICAgaXRzZWxmIHJlamVjdCwgYW5kIGEgcHJvbWlzZSB0aGF0ICpyZXNvbHZlcyogYSBwcm9taXNlIHRoYXQgZnVsZmlsbHMgd2lsbFxuICAgICAgaXRzZWxmIGZ1bGZpbGwuXG5cblxuICAgICAgQmFzaWMgVXNhZ2U6XG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgYGBganNcbiAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIC8vIG9uIHN1Y2Nlc3NcbiAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gb24gZmFpbHVyZVxuICAgICAgICByZWplY3QocmVhc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gb24gZnVsZmlsbG1lbnRcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbikge1xuICAgICAgICAvLyBvbiByZWplY3Rpb25cbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIFVzYWdlOlxuICAgICAgLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFByb21pc2VzIHNoaW5lIHdoZW4gYWJzdHJhY3RpbmcgYXdheSBhc3luY2hyb25vdXMgaW50ZXJhY3Rpb25zIHN1Y2ggYXNcbiAgICAgIGBYTUxIdHRwUmVxdWVzdGBzLlxuXG4gICAgICBgYGBqc1xuICAgICAgZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZXI7XG4gICAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdqc29uJztcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICB4aHIuc2VuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gaGFuZGxlcigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuRE9ORSkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignZ2V0SlNPTjogYCcgKyB1cmwgKyAnYCBmYWlsZWQgd2l0aCBzdGF0dXM6IFsnICsgdGhpcy5zdGF0dXMgKyAnXScpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBnZXRKU09OKCcvcG9zdHMuanNvbicpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgICAvLyBvbiBmdWxmaWxsbWVudFxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIC8vIG9uIHJlamVjdGlvblxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgVW5saWtlIGNhbGxiYWNrcywgcHJvbWlzZXMgYXJlIGdyZWF0IGNvbXBvc2FibGUgcHJpbWl0aXZlcy5cblxuICAgICAgYGBganNcbiAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgZ2V0SlNPTignL3Bvc3RzJyksXG4gICAgICAgIGdldEpTT04oJy9jb21tZW50cycpXG4gICAgICBdKS50aGVuKGZ1bmN0aW9uKHZhbHVlcyl7XG4gICAgICAgIHZhbHVlc1swXSAvLyA9PiBwb3N0c0pTT05cbiAgICAgICAgdmFsdWVzWzFdIC8vID0+IGNvbW1lbnRzSlNPTlxuXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAY2xhc3MgUHJvbWlzZVxuICAgICAgQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZXJcbiAgICAgIFVzZWZ1bCBmb3IgdG9vbGluZy5cbiAgICAgIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICAgIHRoaXNbbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUFJPTUlTRV9JRF0gPSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRuZXh0SWQoKTtcbiAgICAgIHRoaXMuX3Jlc3VsdCA9IHRoaXMuX3N0YXRlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fc3Vic2NyaWJlcnMgPSBbXTtcblxuICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJG5vb3AgIT09IHJlc29sdmVyKSB7XG4gICAgICAgIHR5cGVvZiByZXNvbHZlciAhPT0gJ2Z1bmN0aW9uJyAmJiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNSZXNvbHZlcigpO1xuICAgICAgICB0aGlzIGluc3RhbmNlb2YgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UgPyBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRpbml0aWFsaXplUHJvbWlzZSh0aGlzLCByZXNvbHZlcikgOiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkbmVlZHNOZXcoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZS5hbGwgPSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSRhbGwkJGRlZmF1bHQ7XG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmFjZSA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJhY2UkJGRlZmF1bHQ7XG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVzb2x2ZSA9IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJHJlc29sdmUkJGRlZmF1bHQ7XG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UucmVqZWN0ID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVqZWN0JCRkZWZhdWx0O1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLl9zZXRTY2hlZHVsZXIgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkc2V0U2NoZWR1bGVyO1xuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLl9zZXRBc2FwID0gbGliJGVzNiRwcm9taXNlJGFzYXAkJHNldEFzYXA7XG4gICAgbGliJGVzNiRwcm9taXNlJHByb21pc2UkJFByb21pc2UuX2FzYXAgPSBsaWIkZXM2JHByb21pc2UkYXNhcCQkYXNhcDtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRQcm9taXNlLnByb3RvdHlwZSA9IHtcbiAgICAgIGNvbnN0cnVjdG9yOiBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkUHJvbWlzZSxcblxuICAgIC8qKlxuICAgICAgVGhlIHByaW1hcnkgd2F5IG9mIGludGVyYWN0aW5nIHdpdGggYSBwcm9taXNlIGlzIHRocm91Z2ggaXRzIGB0aGVuYCBtZXRob2QsXG4gICAgICB3aGljaCByZWdpc3RlcnMgY2FsbGJhY2tzIHRvIHJlY2VpdmUgZWl0aGVyIGEgcHJvbWlzZSdzIGV2ZW50dWFsIHZhbHVlIG9yIHRoZVxuICAgICAgcmVhc29uIHdoeSB0aGUgcHJvbWlzZSBjYW5ub3QgYmUgZnVsZmlsbGVkLlxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAvLyB1c2VyIGlzIGF2YWlsYWJsZVxuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgLy8gdXNlciBpcyB1bmF2YWlsYWJsZSwgYW5kIHlvdSBhcmUgZ2l2ZW4gdGhlIHJlYXNvbiB3aHlcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIENoYWluaW5nXG4gICAgICAtLS0tLS0tLVxuXG4gICAgICBUaGUgcmV0dXJuIHZhbHVlIG9mIGB0aGVuYCBpcyBpdHNlbGYgYSBwcm9taXNlLiAgVGhpcyBzZWNvbmQsICdkb3duc3RyZWFtJ1xuICAgICAgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZpcnN0IHByb21pc2UncyBmdWxmaWxsbWVudFxuICAgICAgb3IgcmVqZWN0aW9uIGhhbmRsZXIsIG9yIHJlamVjdGVkIGlmIHRoZSBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb24uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgcmV0dXJuIHVzZXIubmFtZTtcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgcmV0dXJuICdkZWZhdWx0IG5hbWUnO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodXNlck5hbWUpIHtcbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGB1c2VyTmFtZWAgd2lsbCBiZSB0aGUgdXNlcidzIG5hbWUsIG90aGVyd2lzZSBpdFxuICAgICAgICAvLyB3aWxsIGJlIGAnZGVmYXVsdCBuYW1lJ2BcbiAgICAgIH0pO1xuXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCB1c2VyLCBidXQgc3RpbGwgdW5oYXBweScpO1xuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BmaW5kVXNlcmAgcmVqZWN0ZWQgYW5kIHdlJ3JlIHVuaGFwcHknKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIC8vIG5ldmVyIHJlYWNoZWRcbiAgICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgLy8gaWYgYGZpbmRVc2VyYCBmdWxmaWxsZWQsIGByZWFzb25gIHdpbGwgYmUgJ0ZvdW5kIHVzZXIsIGJ1dCBzdGlsbCB1bmhhcHB5Jy5cbiAgICAgICAgLy8gSWYgYGZpbmRVc2VyYCByZWplY3RlZCwgYHJlYXNvbmAgd2lsbCBiZSAnYGZpbmRVc2VyYCByZWplY3RlZCBhbmQgd2UncmUgdW5oYXBweScuXG4gICAgICB9KTtcbiAgICAgIGBgYFxuICAgICAgSWYgdGhlIGRvd25zdHJlYW0gcHJvbWlzZSBkb2VzIG5vdCBzcGVjaWZ5IGEgcmVqZWN0aW9uIGhhbmRsZXIsIHJlamVjdGlvbiByZWFzb25zIHdpbGwgYmUgcHJvcGFnYXRlZCBmdXJ0aGVyIGRvd25zdHJlYW0uXG5cbiAgICAgIGBgYGpzXG4gICAgICBmaW5kVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlZGFnb2dpY2FsRXhjZXB0aW9uKCdVcHN0cmVhbSBlcnJvcicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSkudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICAvLyBUaGUgYFBlZGdhZ29jaWFsRXhjZXB0aW9uYCBpcyBwcm9wYWdhdGVkIGFsbCB0aGUgd2F5IGRvd24gdG8gaGVyZVxuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQXNzaW1pbGF0aW9uXG4gICAgICAtLS0tLS0tLS0tLS1cblxuICAgICAgU29tZXRpbWVzIHRoZSB2YWx1ZSB5b3Ugd2FudCB0byBwcm9wYWdhdGUgdG8gYSBkb3duc3RyZWFtIHByb21pc2UgY2FuIG9ubHkgYmVcbiAgICAgIHJldHJpZXZlZCBhc3luY2hyb25vdXNseS4gVGhpcyBjYW4gYmUgYWNoaWV2ZWQgYnkgcmV0dXJuaW5nIGEgcHJvbWlzZSBpbiB0aGVcbiAgICAgIGZ1bGZpbGxtZW50IG9yIHJlamVjdGlvbiBoYW5kbGVyLiBUaGUgZG93bnN0cmVhbSBwcm9taXNlIHdpbGwgdGhlbiBiZSBwZW5kaW5nXG4gICAgICB1bnRpbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBzZXR0bGVkLiBUaGlzIGlzIGNhbGxlZCAqYXNzaW1pbGF0aW9uKi5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBUaGUgdXNlcidzIGNvbW1lbnRzIGFyZSBub3cgYXZhaWxhYmxlXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBJZiB0aGUgYXNzaW1saWF0ZWQgcHJvbWlzZSByZWplY3RzLCB0aGVuIHRoZSBkb3duc3RyZWFtIHByb21pc2Ugd2lsbCBhbHNvIHJlamVjdC5cblxuICAgICAgYGBganNcbiAgICAgIGZpbmRVc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICByZXR1cm4gZmluZENvbW1lbnRzQnlBdXRob3IodXNlcik7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb21tZW50cykge1xuICAgICAgICAvLyBJZiBgZmluZENvbW1lbnRzQnlBdXRob3JgIGZ1bGZpbGxzLCB3ZSdsbCBoYXZlIHRoZSB2YWx1ZSBoZXJlXG4gICAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgICAgIC8vIElmIGBmaW5kQ29tbWVudHNCeUF1dGhvcmAgcmVqZWN0cywgd2UnbGwgaGF2ZSB0aGUgcmVhc29uIGhlcmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIFNpbXBsZSBFeGFtcGxlXG4gICAgICAtLS0tLS0tLS0tLS0tLVxuXG4gICAgICBTeW5jaHJvbm91cyBFeGFtcGxlXG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGZpbmRSZXN1bHQoKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuICAgICAgZmluZFJlc3VsdChmdW5jdGlvbihyZXN1bHQsIGVycil7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRSZXN1bHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgICAgIC8vIHN1Y2Nlc3NcbiAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgICAgYGBgXG5cbiAgICAgIEFkdmFuY2VkIEV4YW1wbGVcbiAgICAgIC0tLS0tLS0tLS0tLS0tXG5cbiAgICAgIFN5bmNocm9ub3VzIEV4YW1wbGVcblxuICAgICAgYGBgamF2YXNjcmlwdFxuICAgICAgdmFyIGF1dGhvciwgYm9va3M7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF1dGhvciA9IGZpbmRBdXRob3IoKTtcbiAgICAgICAgYm9va3MgID0gZmluZEJvb2tzQnlBdXRob3IoYXV0aG9yKTtcbiAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gZmFpbHVyZVxuICAgICAgfVxuICAgICAgYGBgXG5cbiAgICAgIEVycmJhY2sgRXhhbXBsZVxuXG4gICAgICBgYGBqc1xuXG4gICAgICBmdW5jdGlvbiBmb3VuZEJvb2tzKGJvb2tzKSB7XG5cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZmFpbHVyZShyZWFzb24pIHtcblxuICAgICAgfVxuXG4gICAgICBmaW5kQXV0aG9yKGZ1bmN0aW9uKGF1dGhvciwgZXJyKXtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAvLyBmYWlsdXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZpbmRCb29va3NCeUF1dGhvcihhdXRob3IsIGZ1bmN0aW9uKGJvb2tzLCBlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgZm91bmRCb29rcyhib29rcyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgICAgICAgICAgIGZhaWx1cmUocmVhc29uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gY2F0Y2goZXJyb3IpIHtcbiAgICAgICAgICAgIGZhaWx1cmUoZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gc3VjY2Vzc1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBQcm9taXNlIEV4YW1wbGU7XG5cbiAgICAgIGBgYGphdmFzY3JpcHRcbiAgICAgIGZpbmRBdXRob3IoKS5cbiAgICAgICAgdGhlbihmaW5kQm9va3NCeUF1dGhvcikuXG4gICAgICAgIHRoZW4oZnVuY3Rpb24oYm9va3Mpe1xuICAgICAgICAgIC8vIGZvdW5kIGJvb2tzXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICAvLyBzb21ldGhpbmcgd2VudCB3cm9uZ1xuICAgICAgfSk7XG4gICAgICBgYGBcblxuICAgICAgQG1ldGhvZCB0aGVuXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvbkZ1bGZpbGxlZFxuICAgICAgQHBhcmFtIHtGdW5jdGlvbn0gb25SZWplY3RlZFxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgdGhlbjogbGliJGVzNiRwcm9taXNlJHRoZW4kJGRlZmF1bHQsXG5cbiAgICAvKipcbiAgICAgIGBjYXRjaGAgaXMgc2ltcGx5IHN1Z2FyIGZvciBgdGhlbih1bmRlZmluZWQsIG9uUmVqZWN0aW9uKWAgd2hpY2ggbWFrZXMgaXQgdGhlIHNhbWVcbiAgICAgIGFzIHRoZSBjYXRjaCBibG9jayBvZiBhIHRyeS9jYXRjaCBzdGF0ZW1lbnQuXG5cbiAgICAgIGBgYGpzXG4gICAgICBmdW5jdGlvbiBmaW5kQXV0aG9yKCl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGRuJ3QgZmluZCB0aGF0IGF1dGhvcicpO1xuICAgICAgfVxuXG4gICAgICAvLyBzeW5jaHJvbm91c1xuICAgICAgdHJ5IHtcbiAgICAgICAgZmluZEF1dGhvcigpO1xuICAgICAgfSBjYXRjaChyZWFzb24pIHtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdlbnQgd3JvbmdcbiAgICAgIH1cblxuICAgICAgLy8gYXN5bmMgd2l0aCBwcm9taXNlc1xuICAgICAgZmluZEF1dGhvcigpLmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3ZW50IHdyb25nXG4gICAgICB9KTtcbiAgICAgIGBgYFxuXG4gICAgICBAbWV0aG9kIGNhdGNoXG4gICAgICBAcGFyYW0ge0Z1bmN0aW9ufSBvblJlamVjdGlvblxuICAgICAgVXNlZnVsIGZvciB0b29saW5nLlxuICAgICAgQHJldHVybiB7UHJvbWlzZX1cbiAgICAqL1xuICAgICAgJ2NhdGNoJzogZnVuY3Rpb24ob25SZWplY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gICAgICB9XG4gICAgfTtcbiAgICB2YXIgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvcjtcbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvcihDb25zdHJ1Y3RvciwgaW5wdXQpIHtcbiAgICAgIHRoaXMuX2luc3RhbmNlQ29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcbiAgICAgIHRoaXMucHJvbWlzZSA9IG5ldyBDb25zdHJ1Y3RvcihsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRub29wKTtcblxuICAgICAgaWYgKCF0aGlzLnByb21pc2VbbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUFJPTUlTRV9JRF0pIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbWFrZVByb21pc2UodGhpcy5wcm9taXNlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGxpYiRlczYkcHJvbWlzZSR1dGlscyQkaXNBcnJheShpbnB1dCkpIHtcbiAgICAgICAgdGhpcy5faW5wdXQgICAgID0gaW5wdXQ7XG4gICAgICAgIHRoaXMubGVuZ3RoICAgICA9IGlucHV0Lmxlbmd0aDtcbiAgICAgICAgdGhpcy5fcmVtYWluaW5nID0gaW5wdXQubGVuZ3RoO1xuXG4gICAgICAgIHRoaXMuX3Jlc3VsdCA9IG5ldyBBcnJheSh0aGlzLmxlbmd0aCk7XG5cbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbCh0aGlzLnByb21pc2UsIHRoaXMuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sZW5ndGggPSB0aGlzLmxlbmd0aCB8fCAwO1xuICAgICAgICAgIHRoaXMuX2VudW1lcmF0ZSgpO1xuICAgICAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICAgIGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGZ1bGZpbGwodGhpcy5wcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkcmVqZWN0KHRoaXMucHJvbWlzZSwgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJHZhbGlkYXRpb25FcnJvcigpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkdmFsaWRhdGlvbkVycm9yKCkge1xuICAgICAgcmV0dXJuIG5ldyBFcnJvcignQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5Jyk7XG4gICAgfVxuXG4gICAgbGliJGVzNiRwcm9taXNlJGVudW1lcmF0b3IkJEVudW1lcmF0b3IucHJvdG90eXBlLl9lbnVtZXJhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsZW5ndGggID0gdGhpcy5sZW5ndGg7XG4gICAgICB2YXIgaW5wdXQgICA9IHRoaXMuX2lucHV0O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgdGhpcy5fc3RhdGUgPT09IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJFBFTkRJTkcgJiYgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2VhY2hFbnRyeShpbnB1dFtpXSwgaSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fZWFjaEVudHJ5ID0gZnVuY3Rpb24oZW50cnksIGkpIHtcbiAgICAgIHZhciBjID0gdGhpcy5faW5zdGFuY2VDb25zdHJ1Y3RvcjtcbiAgICAgIHZhciByZXNvbHZlID0gYy5yZXNvbHZlO1xuXG4gICAgICBpZiAocmVzb2x2ZSA9PT0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkcmVzb2x2ZSQkZGVmYXVsdCkge1xuICAgICAgICB2YXIgdGhlbiA9IGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJGdldFRoZW4oZW50cnkpO1xuXG4gICAgICAgIGlmICh0aGVuID09PSBsaWIkZXM2JHByb21pc2UkdGhlbiQkZGVmYXVsdCAmJlxuICAgICAgICAgICAgZW50cnkuX3N0YXRlICE9PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgICAgdGhpcy5fc2V0dGxlZEF0KGVudHJ5Ll9zdGF0ZSwgaSwgZW50cnkuX3Jlc3VsdCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoZW4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aGlzLl9yZW1haW5pbmctLTtcbiAgICAgICAgICB0aGlzLl9yZXN1bHRbaV0gPSBlbnRyeTtcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSBsaWIkZXM2JHByb21pc2UkcHJvbWlzZSQkZGVmYXVsdCkge1xuICAgICAgICAgIHZhciBwcm9taXNlID0gbmV3IGMobGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkbm9vcCk7XG4gICAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkaGFuZGxlTWF5YmVUaGVuYWJsZShwcm9taXNlLCBlbnRyeSwgdGhlbik7XG4gICAgICAgICAgdGhpcy5fd2lsbFNldHRsZUF0KHByb21pc2UsIGkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChuZXcgYyhmdW5jdGlvbihyZXNvbHZlKSB7IHJlc29sdmUoZW50cnkpOyB9KSwgaSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3dpbGxTZXR0bGVBdChyZXNvbHZlKGVudHJ5KSwgaSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxpYiRlczYkcHJvbWlzZSRlbnVtZXJhdG9yJCRFbnVtZXJhdG9yLnByb3RvdHlwZS5fc2V0dGxlZEF0ID0gZnVuY3Rpb24oc3RhdGUsIGksIHZhbHVlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHRoaXMucHJvbWlzZTtcblxuICAgICAgaWYgKHByb21pc2UuX3N0YXRlID09PSBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRQRU5ESU5HKSB7XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZy0tO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkUkVKRUNURUQpIHtcbiAgICAgICAgICBsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRyZWplY3QocHJvbWlzZSwgdmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3Jlc3VsdFtpXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkZnVsZmlsbChwcm9taXNlLCB0aGlzLl9yZXN1bHQpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsaWIkZXM2JHByb21pc2UkZW51bWVyYXRvciQkRW51bWVyYXRvci5wcm90b3R5cGUuX3dpbGxTZXR0bGVBdCA9IGZ1bmN0aW9uKHByb21pc2UsIGkpIHtcbiAgICAgIHZhciBlbnVtZXJhdG9yID0gdGhpcztcblxuICAgICAgbGliJGVzNiRwcm9taXNlJCRpbnRlcm5hbCQkc3Vic2NyaWJlKHByb21pc2UsIHVuZGVmaW5lZCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgZW51bWVyYXRvci5fc2V0dGxlZEF0KGxpYiRlczYkcHJvbWlzZSQkaW50ZXJuYWwkJEZVTEZJTExFRCwgaSwgdmFsdWUpO1xuICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKSB7XG4gICAgICAgIGVudW1lcmF0b3IuX3NldHRsZWRBdChsaWIkZXM2JHByb21pc2UkJGludGVybmFsJCRSRUpFQ1RFRCwgaSwgcmVhc29uKTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgZnVuY3Rpb24gbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRwb2x5ZmlsbCgpIHtcbiAgICAgIHZhciBsb2NhbDtcblxuICAgICAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbG9jYWwgPSBnbG9iYWw7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIGxvY2FsID0gc2VsZjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgbG9jYWwgPSBGdW5jdGlvbigncmV0dXJuIHRoaXMnKSgpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb2x5ZmlsbCBmYWlsZWQgYmVjYXVzZSBnbG9iYWwgb2JqZWN0IGlzIHVuYXZhaWxhYmxlIGluIHRoaXMgZW52aXJvbm1lbnQnKTtcbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBQID0gbG9jYWwuUHJvbWlzZTtcblxuICAgICAgaWYgKFAgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKFAucmVzb2x2ZSgpKSA9PT0gJ1tvYmplY3QgUHJvbWlzZV0nICYmICFQLmNhc3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2NhbC5Qcm9taXNlID0gbGliJGVzNiRwcm9taXNlJHByb21pc2UkJGRlZmF1bHQ7XG4gICAgfVxuICAgIHZhciBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJGRlZmF1bHQgPSBsaWIkZXM2JHByb21pc2UkcG9seWZpbGwkJHBvbHlmaWxsO1xuXG4gICAgdmFyIGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2UgPSB7XG4gICAgICAnUHJvbWlzZSc6IGxpYiRlczYkcHJvbWlzZSRwcm9taXNlJCRkZWZhdWx0LFxuICAgICAgJ3BvbHlmaWxsJzogbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0XG4gICAgfTtcblxuICAgIC8qIGdsb2JhbCBkZWZpbmU6dHJ1ZSBtb2R1bGU6dHJ1ZSB3aW5kb3c6IHRydWUgKi9cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmVbJ2FtZCddKSB7XG4gICAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBsaWIkZXM2JHByb21pc2UkdW1kJCRFUzZQcm9taXNlOyB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZVsnZXhwb3J0cyddKSB7XG4gICAgICBtb2R1bGVbJ2V4cG9ydHMnXSA9IGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXNbJ0VTNlByb21pc2UnXSA9IGxpYiRlczYkcHJvbWlzZSR1bWQkJEVTNlByb21pc2U7XG4gICAgfVxuXG4gICAgbGliJGVzNiRwcm9taXNlJHBvbHlmaWxsJCRkZWZhdWx0KCk7XG59KS5jYWxsKHRoaXMpO1xuXG4iLCIndXNlIHN0cmljdCc7XG52YXIgbnVtYmVySXNOYW4gPSByZXF1aXJlKCdudW1iZXItaXMtbmFuJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG51bSkge1xuXHRpZiAodHlwZW9mIG51bSAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYW4obnVtKSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgbnVtYmVyLCBnb3QgJyArIHR5cGVvZiBudW0pO1xuXHR9XG5cblx0dmFyIGV4cG9uZW50O1xuXHR2YXIgdW5pdDtcblx0dmFyIG5lZyA9IG51bSA8IDA7XG5cdHZhciB1bml0cyA9IFsnQicsICdrQicsICdNQicsICdHQicsICdUQicsICdQQicsICdFQicsICdaQicsICdZQiddO1xuXG5cdGlmIChuZWcpIHtcblx0XHRudW0gPSAtbnVtO1xuXHR9XG5cblx0aWYgKG51bSA8IDEpIHtcblx0XHRyZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bSArICcgQic7XG5cdH1cblxuXHRleHBvbmVudCA9IE1hdGgubWluKE1hdGguZmxvb3IoTWF0aC5sb2cobnVtKSAvIE1hdGgubG9nKDEwMDApKSwgdW5pdHMubGVuZ3RoIC0gMSk7XG5cdG51bSA9IE51bWJlcigobnVtIC8gTWF0aC5wb3coMTAwMCwgZXhwb25lbnQpKS50b0ZpeGVkKDIpKTtcblx0dW5pdCA9IHVuaXRzW2V4cG9uZW50XTtcblxuXHRyZXR1cm4gKG5lZyA/ICctJyA6ICcnKSArIG51bSArICcgJyArIHVuaXQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBOdW1iZXIuaXNOYU4gfHwgZnVuY3Rpb24gKHgpIHtcblx0cmV0dXJuIHggIT09IHg7XG59O1xuIiwiLyoqXG4gKiBHZW5lcmF0ZSBhIGZpbmdlcnByaW50IGZvciBhIGZpbGUgd2hpY2ggd2lsbCBiZSB1c2VkIHRoZSBzdG9yZSB0aGUgZW5kcG9pbnRcbiAqXG4gKiBAcGFyYW0ge0ZpbGV9IGZpbGVcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZmluZ2VycHJpbnQ7XG5cbmZ1bmN0aW9uIGZpbmdlcnByaW50KGZpbGUpIHtcbiAgcmV0dXJuIFtcInR1c1wiLCBmaWxlLm5hbWUsIGZpbGUudHlwZSwgZmlsZS5zaXplLCBmaWxlLmxhc3RNb2RpZmllZF0uam9pbihcIi1cIik7XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmUgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmpbXCJkZWZhdWx0XCJdIDogb2JqOyB9O1xuXG4vKiBnbG9iYWwgd2luZG93ICovXG5cbnZhciBVcGxvYWQgPSBfaW50ZXJvcFJlcXVpcmUocmVxdWlyZShcIi4vdXBsb2FkXCIpKTtcblxudmFyIGRlZmF1bHRPcHRpb25zID0gVXBsb2FkLmRlZmF1bHRPcHRpb25zO1xudmFyIFhNTEh0dHBSZXF1ZXN0ID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xudmFyIGxvY2FsU3RvcmFnZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG52YXIgQmxvYiA9IHdpbmRvdy5CbG9iO1xuXG52YXIgaXNTdXBwb3J0ZWQgPSBYTUxIdHRwUmVxdWVzdCAmJiBsb2NhbFN0b3JhZ2UgJiYgQmxvYiAmJiB0eXBlb2YgQmxvYi5wcm90b3R5cGUuc2xpY2UgPT09IFwiZnVuY3Rpb25cIjtcblxuLy8gVGhlIHVzYWdlIG9mIHRoZSBjb21tb25qcyBleHBvcnRpbmcgc3ludGF4IGluc3RlYWQgb2YgdGhlIG5ldyBFQ01BU2NyaXB0XG4vLyBvbmUgaXMgYWN0dWFsbHkgaW50ZWRlZCBhbmQgcHJldmVudHMgd2VpcmQgYmVoYXZpb3VyIGlmIHdlIGFyZSB0cnlpbmcgdG9cbi8vIGltcG9ydCB0aGlzIG1vZHVsZSBpbiBhbm90aGVyIG1vZHVsZSB1c2luZyBCYWJlbC5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBVcGxvYWQ6IFVwbG9hZCxcbiAgaXNTdXBwb3J0ZWQ6IGlzU3VwcG9ydGVkLFxuICBkZWZhdWx0T3B0aW9uczogZGVmYXVsdE9wdGlvbnNcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmUgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmpbXCJkZWZhdWx0XCJdIDogb2JqOyB9O1xuXG52YXIgX2NyZWF0ZUNsYXNzID0gKGZ1bmN0aW9uICgpIHsgZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyh0YXJnZXQsIHByb3BzKSB7IGZvciAodmFyIGtleSBpbiBwcm9wcykgeyB2YXIgcHJvcCA9IHByb3BzW2tleV07IHByb3AuY29uZmlndXJhYmxlID0gdHJ1ZTsgaWYgKHByb3AudmFsdWUpIHByb3Aud3JpdGFibGUgPSB0cnVlOyB9IE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRhcmdldCwgcHJvcHMpOyB9IHJldHVybiBmdW5jdGlvbiAoQ29uc3RydWN0b3IsIHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7IGlmIChwcm90b1Byb3BzKSBkZWZpbmVQcm9wZXJ0aWVzKENvbnN0cnVjdG9yLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7IGlmIChzdGF0aWNQcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvciwgc3RhdGljUHJvcHMpOyByZXR1cm4gQ29uc3RydWN0b3I7IH07IH0pKCk7XG5cbnZhciBfY2xhc3NDYWxsQ2hlY2sgPSBmdW5jdGlvbiAoaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfTtcblxuLyogZ2xvYmFsIHdpbmRvdywgWE1MSHR0cFJlcXVlc3QgKi9cblxudmFyIGZpbmdlcnByaW50ID0gX2ludGVyb3BSZXF1aXJlKHJlcXVpcmUoXCIuL2ZpbmdlcnByaW50XCIpKTtcblxudmFyIGV4dGVuZCA9IF9pbnRlcm9wUmVxdWlyZShyZXF1aXJlKFwiZXh0ZW5kXCIpKTtcblxudmFyIGxvY2FsU3RvcmFnZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG52YXIgYnRvYSA9IHdpbmRvdy5idG9hO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIGVuZHBvaW50OiBcIlwiLFxuICBmaW5nZXJwcmludDogZmluZ2VycHJpbnQsXG4gIHJlc3VtZTogdHJ1ZSxcbiAgb25Qcm9ncmVzczogbnVsbCxcbiAgb25DaHVua0NvbXBsZXRlOiBudWxsLFxuICBvblN1Y2Nlc3M6IG51bGwsXG4gIG9uRXJyb3I6IG51bGwsXG4gIGhlYWRlcnM6IHt9LFxuICBjaHVua1NpemU6IEluZmluaXR5LFxuICB3aXRoQ3JlZGVudGlhbHM6IGZhbHNlXG59O1xuXG52YXIgVXBsb2FkID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gVXBsb2FkKGZpbGUsIG9wdGlvbnMpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgVXBsb2FkKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IGV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgLy8gVGhlIHVuZGVybHlpbmcgRmlsZS9CbG9iIG9iamVjdFxuICAgIHRoaXMuZmlsZSA9IGZpbGU7XG5cbiAgICAvLyBUaGUgVVJMIGFnYWluc3Qgd2hpY2ggdGhlIGZpbGUgd2lsbCBiZSB1cGxvYWRlZFxuICAgIHRoaXMudXJsID0gbnVsbDtcblxuICAgIC8vIFRoZSB1bmRlcmx5aW5nIFhIUiBvYmplY3QgZm9yIHRoZSBjdXJyZW50IFBBVENIIHJlcXVlc3RcbiAgICB0aGlzLl94aHIgPSBudWxsO1xuXG4gICAgLy8gVGhlIGZpbmdlcnBpbnJ0IGZvciB0aGUgY3VycmVudCBmaWxlIChzZXQgYWZ0ZXIgc3RhcnQoKSlcbiAgICB0aGlzLl9maW5nZXJwcmludCA9IG51bGw7XG5cbiAgICAvLyBUaGUgb2Zmc2V0IHVzZWQgaW4gdGhlIGN1cnJlbnQgUEFUQ0ggcmVxdWVzdFxuICAgIHRoaXMuX29mZnNldCA9IG51bGw7XG5cbiAgICAvLyBUcnVlIGlmIHRoZSBjdXJyZW50IFBBVENIIHJlcXVlc3QgaGFzIGJlZW4gYWJvcnRlZFxuICAgIHRoaXMuX2Fib3J0ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIF9jcmVhdGVDbGFzcyhVcGxvYWQsIHtcbiAgICBzdGFydDoge1xuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgICAgICB2YXIgZmlsZSA9IHRoaXMuZmlsZTtcblxuICAgICAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgICB0aGlzLl9lbWl0RXJyb3IobmV3IEVycm9yKFwidHVzOiBubyBmaWxlIHRvIHVwbG9hZCBwcm92aWRlZFwiKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuZW5kcG9pbnQpIHtcbiAgICAgICAgICB0aGlzLl9lbWl0RXJyb3IobmV3IEVycm9yKFwidHVzOiBubyBlbmRwb2ludCBwcm92aWRlZFwiKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQSBVUkwgaGFzIG1hbnVhbGx5IGJlZW4gc3BlY2lmaWVkLCBzbyB3ZSB0cnkgdG8gcmVzdW1lXG4gICAgICAgIGlmICh0aGlzLnVybCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuX3Jlc3VtZVVwbG9hZCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyeSB0byBmaW5kIHRoZSBlbmRwb2ludCBmb3IgdGhlIGZpbGUgaW4gdGhlIGxvY2FsU3RvcmFnZVxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJlc3VtZSkge1xuICAgICAgICAgIHRoaXMuX2ZpbmdlcnByaW50ID0gdGhpcy5vcHRpb25zLmZpbmdlcnByaW50KGZpbGUpO1xuICAgICAgICAgIHZhciByZXN1bWVkVXJsID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0odGhpcy5fZmluZ2VycHJpbnQpO1xuXG4gICAgICAgICAgaWYgKHJlc3VtZWRVcmwgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy51cmwgPSByZXN1bWVkVXJsO1xuICAgICAgICAgICAgdGhpcy5fcmVzdW1lVXBsb2FkKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQW4gdXBsb2FkIGhhcyBub3Qgc3RhcnRlZCBmb3IgdGhlIGZpbGUgeWV0LCBzbyB3ZSBzdGFydCBhIG5ldyBvbmVcbiAgICAgICAgdGhpcy5fY3JlYXRlVXBsb2FkKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhYm9ydDoge1xuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGFib3J0KCkge1xuICAgICAgICBpZiAodGhpcy5feGhyICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5feGhyLmFib3J0KCk7XG4gICAgICAgICAgdGhpcy5fYWJvcnRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIF9lbWl0WGhyRXJyb3I6IHtcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBfZW1pdFhockVycm9yKHhociwgZXJyKSB7XG4gICAgICAgIGVyci5vcmlnaW5hbFJlcXVlc3QgPSB4aHI7XG4gICAgICAgIHRoaXMuX2VtaXRFcnJvcihlcnIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgX2VtaXRFcnJvcjoge1xuICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9lbWl0RXJyb3IoZXJyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5vcHRpb25zLm9uRXJyb3IgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHRoaXMub3B0aW9ucy5vbkVycm9yKGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBfZW1pdFN1Y2Nlc3M6IHtcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBfZW1pdFN1Y2Nlc3MoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5vcHRpb25zLm9uU3VjY2VzcyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgdGhpcy5vcHRpb25zLm9uU3VjY2VzcygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBfZW1pdFByb2dyZXNzOiB7XG5cbiAgICAgIC8qKlxuICAgICAgICogUHVibGlzaGVzIG5vdGlmaWNhdGlvbiB3aGVuIGRhdGEgaGFzIGJlZW4gc2VudCB0byB0aGUgc2VydmVyLiBUaGlzXG4gICAgICAgKiBkYXRhIG1heSBub3QgaGF2ZSBiZWVuIGFjY2VwdGVkIGJ5IHRoZSBzZXJ2ZXIgeWV0LlxuICAgICAgICogQHBhcmFtICB7bnVtYmVyfSBieXRlc1NlbnQgIE51bWJlciBvZiBieXRlcyBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gICAgICAgKiBAcGFyYW0gIHtudW1iZXJ9IGJ5dGVzVG90YWwgVG90YWwgbnVtYmVyIG9mIGJ5dGVzIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAgICAgICAqL1xuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gX2VtaXRQcm9ncmVzcyhieXRlc1NlbnQsIGJ5dGVzVG90YWwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMub25Qcm9ncmVzcyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgdGhpcy5vcHRpb25zLm9uUHJvZ3Jlc3MoYnl0ZXNTZW50LCBieXRlc1RvdGFsKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgX2VtaXRDaHVua0NvbXBsZXRlOiB7XG5cbiAgICAgIC8qKlxuICAgICAgICogUHVibGlzaGVzIG5vdGlmaWNhdGlvbiB3aGVuIGEgY2h1bmsgb2YgZGF0YSBoYXMgYmVlbiBzZW50IHRvIHRoZSBzZXJ2ZXJcbiAgICAgICAqIGFuZCBhY2NlcHRlZCBieSB0aGUgc2VydmVyLlxuICAgICAgICogQHBhcmFtICB7bnVtYmVyfSBjaHVua1NpemUgIFNpemUgb2YgdGhlIGNodW5rIHRoYXQgd2FzIGFjY2VwdGVkIGJ5IHRoZVxuICAgICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlci5cbiAgICAgICAqIEBwYXJhbSAge251bWJlcn0gYnl0ZXNBY2NlcHRlZCBUb3RhbCBudW1iZXIgb2YgYnl0ZXMgdGhhdCBoYXZlIGJlZW5cbiAgICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY2NlcHRlZCBieSB0aGUgc2VydmVyLlxuICAgICAgICogQHBhcmFtICB7bnVtYmVyfSBieXRlc1RvdGFsIFRvdGFsIG51bWJlciBvZiBieXRlcyB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gICAgICAgKi9cblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9lbWl0Q2h1bmtDb21wbGV0ZShjaHVua1NpemUsIGJ5dGVzQWNjZXB0ZWQsIGJ5dGVzVG90YWwpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMub25DaHVua0NvbXBsZXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICB0aGlzLm9wdGlvbnMub25DaHVua0NvbXBsZXRlKGNodW5rU2l6ZSwgYnl0ZXNBY2NlcHRlZCwgYnl0ZXNUb3RhbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIF9zZXR1cFhIUjoge1xuXG4gICAgICAvKipcbiAgICAgICAqIFNldCB0aGUgaGVhZGVycyB1c2VkIGluIHRoZSByZXF1ZXN0IGFuZCB0aGUgd2l0aENyZWRlbnRpYWxzIHByb3BlcnR5XG4gICAgICAgKiBhcyBkZWZpbmVkIGluIHRoZSBvcHRpb25zXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtYTUxIdHRwUmVxdWVzdH0geGhyXG4gICAgICAgKi9cblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9zZXR1cFhIUih4aHIpIHtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJUdXMtUmVzdW1hYmxlXCIsIFwiMS4wLjBcIik7XG4gICAgICAgIHZhciBoZWFkZXJzID0gdGhpcy5vcHRpb25zLmhlYWRlcnM7XG5cbiAgICAgICAgZm9yICh2YXIgX25hbWUgaW4gaGVhZGVycykge1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKF9uYW1lLCBoZWFkZXJzW19uYW1lXSk7XG4gICAgICAgIH1cblxuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdGhpcy5vcHRpb25zLndpdGhDcmVkZW50aWFscztcbiAgICAgIH1cbiAgICB9LFxuICAgIF9jcmVhdGVVcGxvYWQ6IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBDcmVhdGUgYSBuZXcgdXBsb2FkIHVzaW5nIHRoZSBjcmVhdGlvbiBleHRlbnNpb24gYnkgc2VuZGluZyBhIFBPU1RcbiAgICAgICAqIHJlcXVlc3QgdG8gdGhlIGVuZHBvaW50LiBBZnRlciBzdWNjZXNzZnVsIGNyZWF0aW9uIHRoZSBmaWxlIHdpbGwgYmVcbiAgICAgICAqIHVwbG9hZGVkXG4gICAgICAgKlxuICAgICAgICogQGFwaSBwcml2YXRlXG4gICAgICAgKi9cblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIF9jcmVhdGVVcGxvYWQoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub3BlbihcIlBPU1RcIiwgdGhpcy5vcHRpb25zLmVuZHBvaW50LCB0cnVlKTtcblxuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmICghKHhoci5zdGF0dXMgPj0gMjAwICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgICAgICBfdGhpcy5fZW1pdFhockVycm9yKHhociwgbmV3IEVycm9yKFwidHVzOiB1bmV4cGVjdGVkIHJlc3BvbnNlIHdoaWxlIGNyZWF0aW5nIHVwbG9hZFwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX3RoaXMudXJsID0geGhyLmdldFJlc3BvbnNlSGVhZGVyKFwiTG9jYXRpb25cIik7XG5cbiAgICAgICAgICBpZiAoX3RoaXMub3B0aW9ucy5yZXN1bWUpIHtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKF90aGlzLl9maW5nZXJwcmludCwgX3RoaXMudXJsKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBfdGhpcy5fb2Zmc2V0ID0gMDtcbiAgICAgICAgICBfdGhpcy5fc3RhcnRVcGxvYWQoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBfdGhpcy5fZW1pdFhockVycm9yKHhociwgbmV3IEVycm9yKFwidHVzOiBmYWlsZWQgdG8gY3JlYXRlIHVwbG9hZFwiKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fc2V0dXBYSFIoeGhyKTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJVcGxvYWQtTGVuZ3RoXCIsIHRoaXMuZmlsZS5zaXplKTtcblxuICAgICAgICAvLyBBZGQgbWV0YWRhdGEgaWYgdmFsdWVzIGhhdmUgYmVlbiBhZGRlZFxuICAgICAgICB2YXIgbWV0YWRhdGEgPSBlbmNvZGVNZXRhZGF0YSh0aGlzLm9wdGlvbnMubWV0YWRhdGEpO1xuICAgICAgICBpZiAobWV0YWRhdGEgIT09IFwiXCIpIHtcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIlVwbG9hZC1NZXRhZGF0YVwiLCBtZXRhZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICB4aHIuc2VuZChudWxsKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9yZXN1bWVVcGxvYWQ6IHtcblxuICAgICAgLypcbiAgICAgICAqIFRyeSB0byByZXN1bWUgYW4gZXhpc3RpbmcgdXBsb2FkLiBGaXJzdCBhIEhFQUQgcmVxdWVzdCB3aWxsIGJlIHNlbnRcbiAgICAgICAqIHRvIHJldHJpZXZlIHRoZSBvZmZzZXQuIElmIHRoZSByZXF1ZXN0IGZhaWxzIGEgbmV3IHVwbG9hZCB3aWxsIGJlXG4gICAgICAgKiBjcmVhdGVkLiBJbiB0aGUgY2FzZSBvZiBhIHN1Y2Nlc3NmdWwgcmVzcG9uc2UgdGhlIGZpbGUgd2lsbCBiZSB1cGxvYWRlZC5cbiAgICAgICAqXG4gICAgICAgKiBAYXBpIHByaXZhdGVcbiAgICAgICAqL1xuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gX3Jlc3VtZVVwbG9hZCgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhoci5vcGVuKFwiSEVBRFwiLCB0aGlzLnVybCwgdHJ1ZSk7XG5cbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoISh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSkge1xuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMucmVzdW1lKSB7XG4gICAgICAgICAgICAgIC8vIFJlbW92ZSBzdG9yZWQgZmluZ2VycHJpbnQgYW5kIGNvcnJlc3BvbmRpbmcgZW5kcG9pbnQsXG4gICAgICAgICAgICAgIC8vIHNpbmNlIHRoZSBmaWxlIGNhbiBub3QgYmUgZm91bmRcbiAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oX3RoaXMuX2ZpbmdlcnByaW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVHJ5IHRvIGNyZWF0ZSBhIG5ldyB1cGxvYWRcbiAgICAgICAgICAgIF90aGlzLnVybCA9IG51bGw7XG4gICAgICAgICAgICBfdGhpcy5fY3JlYXRlVXBsb2FkKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIG9mZnNldCA9IHBhcnNlSW50KHhoci5nZXRSZXNwb25zZUhlYWRlcihcIlVwbG9hZC1PZmZzZXRcIiksIDEwKTtcbiAgICAgICAgICBpZiAoaXNOYU4ob2Zmc2V0KSkge1xuICAgICAgICAgICAgX3RoaXMuX2VtaXRYaHJFcnJvcih4aHIsIG5ldyBFcnJvcihcInR1czogaW52YWxpZCBvciBtaXNzaW5nIG9mZnNldCB2YWx1ZVwiKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgX3RoaXMuX29mZnNldCA9IG9mZnNldDtcbiAgICAgICAgICBfdGhpcy5fc3RhcnRVcGxvYWQoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBfdGhpcy5fZW1pdFhockVycm9yKHhociwgbmV3IEVycm9yKFwidHVzOiBmYWlsZWQgdG8gcmVzdW1lIHVwbG9hZFwiKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fc2V0dXBYSFIoeGhyKTtcbiAgICAgICAgeGhyLnNlbmQobnVsbCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBfc3RhcnRVcGxvYWQ6IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBTdGFydCB1cGxvYWRpbmcgdGhlIGZpbGUgdXNpbmcgUEFUQ0ggcmVxdWVzdHMuIFRoZSBmaWxlIHdpbGwgYmUgZGl2aWRlZFxuICAgICAgICogaW50byBjaHVua3MgYXMgc3BlY2lmaWVkIGluIHRoZSBjaHVua1NpemUgb3B0aW9uLiBEdXJpbmcgdGhlIHVwbG9hZFxuICAgICAgICogdGhlIG9uUHJvZ3Jlc3MgZXZlbnQgaGFuZGxlciBtYXkgYmUgaW52b2tlZCBtdWx0aXBsZSB0aW1lcy5cbiAgICAgICAqXG4gICAgICAgKiBAYXBpIHByaXZhdGVcbiAgICAgICAqL1xuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gX3N0YXJ0VXBsb2FkKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIHZhciB4aHIgPSB0aGlzLl94aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeGhyLm9wZW4oXCJQQVRDSFwiLCB0aGlzLnVybCwgdHJ1ZSk7XG5cbiAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoISh4aHIuc3RhdHVzID49IDIwMCAmJiB4aHIuc3RhdHVzIDwgMzAwKSkge1xuICAgICAgICAgICAgX3RoaXMuX2VtaXRYaHJFcnJvcih4aHIsIG5ldyBFcnJvcihcInR1czogdW5leHBlY3RlZCByZXNwb25zZSB3aGlsZSBjcmVhdGluZyB1cGxvYWRcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBvZmZzZXQgPSBwYXJzZUludCh4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoXCJVcGxvYWQtT2Zmc2V0XCIpLCAxMCk7XG4gICAgICAgICAgaWYgKGlzTmFOKG9mZnNldCkpIHtcbiAgICAgICAgICAgIF90aGlzLl9lbWl0WGhyRXJyb3IoeGhyLCBuZXcgRXJyb3IoXCJ0dXM6IGludmFsaWQgb3IgbWlzc2luZyBvZmZzZXQgdmFsdWVcIikpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIF90aGlzLl9lbWl0Q2h1bmtDb21wbGV0ZShvZmZzZXQgLSBfdGhpcy5fb2Zmc2V0LCBvZmZzZXQsIF90aGlzLmZpbGUuc2l6ZSk7XG5cbiAgICAgICAgICBfdGhpcy5fb2Zmc2V0ID0gb2Zmc2V0O1xuXG4gICAgICAgICAgaWYgKG9mZnNldCA9PSBfdGhpcy5maWxlLnNpemUpIHtcbiAgICAgICAgICAgIC8vIFlheSwgZmluYWxseSBkb25lIDopXG4gICAgICAgICAgICAvLyBFbWl0IGEgbGFzdCBwcm9ncmVzcyBldmVudFxuICAgICAgICAgICAgX3RoaXMuX2VtaXRQcm9ncmVzcyhvZmZzZXQsIG9mZnNldCk7XG4gICAgICAgICAgICBfdGhpcy5fZW1pdFN1Y2Nlc3MoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBfdGhpcy5fc3RhcnRVcGxvYWQoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvLyBEb24ndCBlbWl0IGFuIGVycm9yIGlmIHRoZSB1cGxvYWQgd2FzIGFib3J0ZWQgbWFudWFsbHlcbiAgICAgICAgICBpZiAoX3RoaXMuX2Fib3J0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBfdGhpcy5fZW1pdFhockVycm9yKHhociwgbmV3IEVycm9yKFwidHVzOiBmYWlsZWQgdG8gdXBsb2FkIGNodW5rIGF0IG9mZnNldCBcIiArIF90aGlzLl9vZmZzZXQpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUZXN0IHN1cHBvcnQgZm9yIHByb2dyZXNzIGV2ZW50cyBiZWZvcmUgYXR0YWNoaW5nIGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIGlmIChcInVwbG9hZFwiIGluIHhocikge1xuICAgICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAoIWUubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF90aGlzLl9lbWl0UHJvZ3Jlc3Moc3RhcnQgKyBlLmxvYWRlZCwgX3RoaXMuZmlsZS5zaXplKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2V0dXBYSFIoeGhyKTtcblxuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihcIlVwbG9hZC1PZmZzZXRcIiwgdGhpcy5fb2Zmc2V0KTtcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9vZmZzZXQrb2N0ZXQtc3RyZWFtXCIpO1xuXG4gICAgICAgIHZhciBzdGFydCA9IHRoaXMuX29mZnNldDtcbiAgICAgICAgdmFyIGVuZCA9IHRoaXMuX29mZnNldCArIHRoaXMub3B0aW9ucy5jaHVua1NpemU7XG5cbiAgICAgICAgaWYgKGVuZCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgICBlbmQgPSB0aGlzLmZpbGUuc2l6ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhoci5zZW5kKHRoaXMuZmlsZS5zbGljZShzdGFydCwgZW5kKSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gVXBsb2FkO1xufSkoKTtcblxuZnVuY3Rpb24gZW5jb2RlTWV0YWRhdGEobWV0YWRhdGEpIHtcbiAgaWYgKCEoXCJidG9hXCIgaW4gd2luZG93KSkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgdmFyIGVuY29kZWQgPSBbXTtcblxuICBmb3IgKHZhciBrZXkgaW4gbWV0YWRhdGEpIHtcbiAgICBlbmNvZGVkLnB1c2goa2V5ICsgXCIgXCIgKyBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChtZXRhZGF0YVtrZXldKSkpKTtcbiAgfVxuXG4gIHJldHVybiBlbmNvZGVkLmpvaW4oXCIsXCIpO1xufVxuXG5VcGxvYWQuZGVmYXVsdE9wdGlvbnMgPSBkZWZhdWx0T3B0aW9ucztcblxubW9kdWxlLmV4cG9ydHMgPSBVcGxvYWQ7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBpc0FycmF5ID0gZnVuY3Rpb24gaXNBcnJheShhcnIpIHtcblx0aWYgKHR5cGVvZiBBcnJheS5pc0FycmF5ID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIEFycmF5LmlzQXJyYXkoYXJyKTtcblx0fVxuXG5cdHJldHVybiB0b1N0ci5jYWxsKGFycikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG52YXIgaXNQbGFpbk9iamVjdCA9IGZ1bmN0aW9uIGlzUGxhaW5PYmplY3Qob2JqKSB7XG5cdGlmICghb2JqIHx8IHRvU3RyLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XScpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHR2YXIgaGFzT3duQ29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzSXNQcm90b3R5cGVPZiA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzT3duQ29uc3RydWN0b3IgJiYgIWhhc0lzUHJvdG90eXBlT2YpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvLyBPd24gcHJvcGVydGllcyBhcmUgZW51bWVyYXRlZCBmaXJzdGx5LCBzbyB0byBzcGVlZCB1cCxcblx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cdHZhciBrZXk7XG5cdGZvciAoa2V5IGluIG9iaikgey8qKi99XG5cblx0cmV0dXJuIHR5cGVvZiBrZXkgPT09ICd1bmRlZmluZWQnIHx8IGhhc093bi5jYWxsKG9iaiwga2V5KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0ZW5kKCkge1xuXHR2YXIgb3B0aW9ucywgbmFtZSwgc3JjLCBjb3B5LCBjb3B5SXNBcnJheSwgY2xvbmUsXG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzBdLFxuXHRcdGkgPSAxLFxuXHRcdGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGgsXG5cdFx0ZGVlcCA9IGZhbHNlO1xuXG5cdC8vIEhhbmRsZSBhIGRlZXAgY29weSBzaXR1YXRpb25cblx0aWYgKHR5cGVvZiB0YXJnZXQgPT09ICdib29sZWFuJykge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fSBlbHNlIGlmICgodHlwZW9mIHRhcmdldCAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldCAhPT0gJ2Z1bmN0aW9uJykgfHwgdGFyZ2V0ID09IG51bGwpIHtcblx0XHR0YXJnZXQgPSB7fTtcblx0fVxuXG5cdGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcblx0XHRvcHRpb25zID0gYXJndW1lbnRzW2ldO1xuXHRcdC8vIE9ubHkgZGVhbCB3aXRoIG5vbi1udWxsL3VuZGVmaW5lZCB2YWx1ZXNcblx0XHRpZiAob3B0aW9ucyAhPSBudWxsKSB7XG5cdFx0XHQvLyBFeHRlbmQgdGhlIGJhc2Ugb2JqZWN0XG5cdFx0XHRmb3IgKG5hbWUgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbbmFtZV07XG5cdFx0XHRcdGNvcHkgPSBvcHRpb25zW25hbWVdO1xuXG5cdFx0XHRcdC8vIFByZXZlbnQgbmV2ZXItZW5kaW5nIGxvb3Bcblx0XHRcdFx0aWYgKHRhcmdldCAhPT0gY29weSkge1xuXHRcdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRcdGlmIChkZWVwICYmIGNvcHkgJiYgKGlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0gaXNBcnJheShjb3B5KSkpKSB7XG5cdFx0XHRcdFx0XHRpZiAoY29weUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gTmV2ZXIgbW92ZSBvcmlnaW5hbCBvYmplY3RzLCBjbG9uZSB0aGVtXG5cdFx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgYnJpbmcgaW4gdW5kZWZpbmVkIHZhbHVlc1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGNvcHkgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgbW9kaWZpZWQgb2JqZWN0XG5cdHJldHVybiB0YXJnZXQ7XG59O1xuXG4iLCJ2YXIgYmVsID0gcmVxdWlyZSgnYmVsJykgLy8gdHVybnMgdGVtcGxhdGUgdGFnIGludG8gRE9NIGVsZW1lbnRzXG52YXIgbW9ycGhkb20gPSByZXF1aXJlKCdtb3JwaGRvbScpIC8vIGVmZmljaWVudGx5IGRpZmZzICsgbW9ycGhzIHR3byBET00gZWxlbWVudHNcbnZhciBkZWZhdWx0RXZlbnRzID0gcmVxdWlyZSgnLi91cGRhdGUtZXZlbnRzLmpzJykgLy8gZGVmYXVsdCBldmVudHMgdG8gYmUgY29waWVkIHdoZW4gZG9tIGVsZW1lbnRzIHVwZGF0ZVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJlbFxuXG4vLyBUT0RPIG1vdmUgdGhpcyArIGRlZmF1bHRFdmVudHMgdG8gYSBuZXcgbW9kdWxlIG9uY2Ugd2UgcmVjZWl2ZSBtb3JlIGZlZWRiYWNrXG5tb2R1bGUuZXhwb3J0cy51cGRhdGUgPSBmdW5jdGlvbiAoZnJvbU5vZGUsIHRvTm9kZSwgb3B0cykge1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuICBpZiAob3B0cy5ldmVudHMgIT09IGZhbHNlKSB7XG4gICAgaWYgKCFvcHRzLm9uQmVmb3JlTW9ycGhFbCkgb3B0cy5vbkJlZm9yZU1vcnBoRWwgPSBjb3BpZXJcbiAgfVxuXG4gIHJldHVybiBtb3JwaGRvbShmcm9tTm9kZSwgdG9Ob2RlLCBvcHRzKVxuXG4gIC8vIG1vcnBoZG9tIG9ubHkgY29waWVzIGF0dHJpYnV0ZXMuIHdlIGRlY2lkZWQgd2UgYWxzbyB3YW50ZWQgdG8gY29weSBldmVudHNcbiAgLy8gdGhhdCBjYW4gYmUgc2V0IHZpYSBhdHRyaWJ1dGVzXG4gIGZ1bmN0aW9uIGNvcGllciAoZiwgdCkge1xuICAgIC8vIGNvcHkgZXZlbnRzOlxuICAgIHZhciBldmVudHMgPSBvcHRzLmV2ZW50cyB8fCBkZWZhdWx0RXZlbnRzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBldiA9IGV2ZW50c1tpXVxuICAgICAgaWYgKHRbZXZdKSB7IC8vIGlmIG5ldyBlbGVtZW50IGhhcyBhIHdoaXRlbGlzdGVkIGF0dHJpYnV0ZVxuICAgICAgICBmW2V2XSA9IHRbZXZdIC8vIHVwZGF0ZSBleGlzdGluZyBlbGVtZW50XG4gICAgICB9IGVsc2UgaWYgKGZbZXZdKSB7IC8vIGlmIGV4aXN0aW5nIGVsZW1lbnQgaGFzIGl0IGFuZCBuZXcgb25lIGRvZXNudFxuICAgICAgICBmW2V2XSA9IHVuZGVmaW5lZCAvLyByZW1vdmUgaXQgZnJvbSBleGlzdGluZyBlbGVtZW50XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvcHkgdmFsdWVzIGZvciBmb3JtIGVsZW1lbnRzXG4gICAgaWYgKChmLm5vZGVOYW1lID09PSAnSU5QVVQnICYmIGYudHlwZSAhPT0gJ2ZpbGUnKSB8fCBmLm5vZGVOYW1lID09PSAnVEVYVEFSRUEnIHx8IGYubm9kZU5hbWUgPT09ICdTRUxFQ1QnKSB7XG4gICAgICBpZiAodC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgPT09IG51bGwpIHQudmFsdWUgPSBmLnZhbHVlXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKCdnbG9iYWwvZG9jdW1lbnQnKVxudmFyIGh5cGVyeCA9IHJlcXVpcmUoJ2h5cGVyeCcpXG52YXIgb25sb2FkID0gcmVxdWlyZSgnb24tbG9hZCcpXG5cbnZhciBTVkdOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZydcbnZhciBCT09MX1BST1BTID0ge1xuICBhdXRvZm9jdXM6IDEsXG4gIGNoZWNrZWQ6IDEsXG4gIGRlZmF1bHRjaGVja2VkOiAxLFxuICBkaXNhYmxlZDogMSxcbiAgZm9ybW5vdmFsaWRhdGU6IDEsXG4gIGluZGV0ZXJtaW5hdGU6IDEsXG4gIHJlYWRvbmx5OiAxLFxuICByZXF1aXJlZDogMSxcbiAgc2VsZWN0ZWQ6IDEsXG4gIHdpbGx2YWxpZGF0ZTogMVxufVxudmFyIFNWR19UQUdTID0gW1xuICAnc3ZnJyxcbiAgJ2FsdEdseXBoJywgJ2FsdEdseXBoRGVmJywgJ2FsdEdseXBoSXRlbScsICdhbmltYXRlJywgJ2FuaW1hdGVDb2xvcicsXG4gICdhbmltYXRlTW90aW9uJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBQYXRoJywgJ2NvbG9yLXByb2ZpbGUnLFxuICAnY3Vyc29yJywgJ2RlZnMnLCAnZGVzYycsICdlbGxpcHNlJywgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsXG4gICdmZUNvbXBvbmVudFRyYW5zZmVyJywgJ2ZlQ29tcG9zaXRlJywgJ2ZlQ29udm9sdmVNYXRyaXgnLCAnZmVEaWZmdXNlTGlnaHRpbmcnLFxuICAnZmVEaXNwbGFjZW1lbnRNYXAnLCAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsICdmZUZ1bmNBJywgJ2ZlRnVuY0InLFxuICAnZmVGdW5jRycsICdmZUZ1bmNSJywgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLCAnZmVNZXJnZScsICdmZU1lcmdlTm9kZScsXG4gICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsXG4gICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLCAnZmVUdXJidWxlbmNlJywgJ2ZpbHRlcicsICdmb250JywgJ2ZvbnQtZmFjZScsXG4gICdmb250LWZhY2UtZm9ybWF0JywgJ2ZvbnQtZmFjZS1uYW1lJywgJ2ZvbnQtZmFjZS1zcmMnLCAnZm9udC1mYWNlLXVyaScsXG4gICdmb3JlaWduT2JqZWN0JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsXG4gICdsaW5lYXJHcmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtaXNzaW5nLWdseXBoJywgJ21wYXRoJyxcbiAgJ3BhdGgnLCAncGF0dGVybicsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JhZGlhbEdyYWRpZW50JywgJ3JlY3QnLFxuICAnc2V0JywgJ3N0b3AnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRQYXRoJywgJ3RpdGxlJywgJ3RyZWYnLFxuICAndHNwYW4nLCAndXNlJywgJ3ZpZXcnLCAndmtlcm4nXG5dXG5cbmZ1bmN0aW9uIGJlbENyZWF0ZUVsZW1lbnQgKHRhZywgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIHZhciBlbFxuXG4gIC8vIElmIGFuIHN2ZyB0YWcsIGl0IG5lZWRzIGEgbmFtZXNwYWNlXG4gIGlmIChTVkdfVEFHUy5pbmRleE9mKHRhZykgIT09IC0xKSB7XG4gICAgcHJvcHMubmFtZXNwYWNlID0gU1ZHTlNcbiAgfVxuXG4gIC8vIElmIHdlIGFyZSB1c2luZyBhIG5hbWVzcGFjZVxuICB2YXIgbnMgPSBmYWxzZVxuICBpZiAocHJvcHMubmFtZXNwYWNlKSB7XG4gICAgbnMgPSBwcm9wcy5uYW1lc3BhY2VcbiAgICBkZWxldGUgcHJvcHMubmFtZXNwYWNlXG4gIH1cblxuICAvLyBDcmVhdGUgdGhlIGVsZW1lbnRcbiAgaWYgKG5zKSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsIHRhZylcbiAgfSBlbHNlIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKVxuICB9XG5cbiAgLy8gSWYgYWRkaW5nIG9ubG9hZCBldmVudHNcbiAgaWYgKHByb3BzLm9ubG9hZCB8fCBwcm9wcy5vbnVubG9hZCkge1xuICAgIHZhciBsb2FkID0gcHJvcHMub25sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgdmFyIHVubG9hZCA9IHByb3BzLm9udW5sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgb25sb2FkKGVsLCBmdW5jdGlvbiBiZWxfb25sb2FkICgpIHtcbiAgICAgIGxvYWQoZWwpXG4gICAgfSwgZnVuY3Rpb24gYmVsX29udW5sb2FkICgpIHtcbiAgICAgIHVubG9hZChlbClcbiAgICB9LFxuICAgIC8vIFdlIGhhdmUgdG8gdXNlIG5vbi1zdGFuZGFyZCBgY2FsbGVyYCB0byBmaW5kIHdobyBpbnZva2VzIGBiZWxDcmVhdGVFbGVtZW50YFxuICAgIGJlbENyZWF0ZUVsZW1lbnQuY2FsbGVyLmNhbGxlci5jYWxsZXIpXG4gICAgZGVsZXRlIHByb3BzLm9ubG9hZFxuICAgIGRlbGV0ZSBwcm9wcy5vbnVubG9hZFxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzXG4gIGZvciAodmFyIHAgaW4gcHJvcHMpIHtcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgIHZhciBrZXkgPSBwLnRvTG93ZXJDYXNlKClcbiAgICAgIHZhciB2YWwgPSBwcm9wc1twXVxuICAgICAgLy8gTm9ybWFsaXplIGNsYXNzTmFtZVxuICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzbmFtZScpIHtcbiAgICAgICAga2V5ID0gJ2NsYXNzJ1xuICAgICAgICBwID0gJ2NsYXNzJ1xuICAgICAgfVxuICAgICAgLy8gVGhlIGZvciBhdHRyaWJ1dGUgZ2V0cyB0cmFuc2Zvcm1lZCB0byBodG1sRm9yLCBidXQgd2UganVzdCBzZXQgYXMgZm9yXG4gICAgICBpZiAocCA9PT0gJ2h0bWxGb3InKSB7XG4gICAgICAgIHAgPSAnZm9yJ1xuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBpcyBib29sZWFuLCBzZXQgaXRzZWxmIHRvIHRoZSBrZXlcbiAgICAgIGlmIChCT09MX1BST1BTW2tleV0pIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gJ3RydWUnKSB2YWwgPSBrZXlcbiAgICAgICAgZWxzZSBpZiAodmFsID09PSAnZmFsc2UnKSBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBwcmVmZXJzIGJlaW5nIHNldCBkaXJlY3RseSB2cyBzZXRBdHRyaWJ1dGVcbiAgICAgIGlmIChrZXkuc2xpY2UoMCwgMikgPT09ICdvbicpIHtcbiAgICAgICAgZWxbcF0gPSB2YWxcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChucykge1xuICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKG51bGwsIHAsIHZhbClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUocCwgdmFsKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXBwZW5kQ2hpbGQgKGNoaWxkcykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjaGlsZHMpKSByZXR1cm5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHNbaV1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICAgIGFwcGVuZENoaWxkKG5vZGUpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgdHlwZW9mIG5vZGUgPT09ICdib29sZWFuJyB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLnRvU3RyaW5nKClcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoZWwubGFzdENoaWxkICYmIGVsLmxhc3RDaGlsZC5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICAgIGVsLmxhc3RDaGlsZC5ub2RlVmFsdWUgKz0gbm9kZVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpXG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUpIHtcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYXBwZW5kQ2hpbGQoY2hpbGRyZW4pXG5cbiAgcmV0dXJuIGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaHlwZXJ4KGJlbENyZWF0ZUVsZW1lbnQpXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gYmVsQ3JlYXRlRWxlbWVudFxuIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsImlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGdsb2JhbDtcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpe1xuICAgIG1vZHVsZS5leHBvcnRzID0gc2VsZjtcbn0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7fTtcbn1cbiIsInZhciBhdHRyVG9Qcm9wID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQtYXR0cmlidXRlLXRvLXByb3BlcnR5JylcblxudmFyIFZBUiA9IDAsIFRFWFQgPSAxLCBPUEVOID0gMiwgQ0xPU0UgPSAzLCBBVFRSID0gNFxudmFyIEFUVFJfS0VZID0gNSwgQVRUUl9LRVlfVyA9IDZcbnZhciBBVFRSX1ZBTFVFX1cgPSA3LCBBVFRSX1ZBTFVFID0gOFxudmFyIEFUVFJfVkFMVUVfU1EgPSA5LCBBVFRSX1ZBTFVFX0RRID0gMTBcbnZhciBBVFRSX0VRID0gMTEsIEFUVFJfQlJFQUsgPSAxMlxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChoLCBvcHRzKSB7XG4gIGggPSBhdHRyVG9Qcm9wKGgpXG4gIGlmICghb3B0cykgb3B0cyA9IHt9XG4gIHZhciBjb25jYXQgPSBvcHRzLmNvbmNhdCB8fCBmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiBTdHJpbmcoYSkgKyBTdHJpbmcoYilcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoc3RyaW5ncykge1xuICAgIHZhciBzdGF0ZSA9IFRFWFQsIHJlZyA9ICcnXG4gICAgdmFyIGFyZ2xlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICB2YXIgcGFydHMgPSBbXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA8IGFyZ2xlbiAtIDEpIHtcbiAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpKzFdXG4gICAgICAgIHZhciBwID0gcGFyc2Uoc3RyaW5nc1tpXSlcbiAgICAgICAgdmFyIHhzdGF0ZSA9IHN0YXRlXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUikgeHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgcC5wdXNoKFsgVkFSLCB4c3RhdGUsIGFyZyBdKVxuICAgICAgICBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwKVxuICAgICAgfSBlbHNlIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHBhcnNlKHN0cmluZ3NbaV0pKVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gW251bGwse30sW11dXG4gICAgdmFyIHN0YWNrID0gW1t0cmVlLC0xXV1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdXG4gICAgICB2YXIgcCA9IHBhcnRzW2ldLCBzID0gcFswXVxuICAgICAgaWYgKHMgPT09IE9QRU4gJiYgL15cXC8vLnRlc3QocFsxXSkpIHtcbiAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IE9QRU4pIHtcbiAgICAgICAgdmFyIGMgPSBbcFsxXSx7fSxbXV1cbiAgICAgICAgY3VyWzJdLnB1c2goYylcbiAgICAgICAgc3RhY2sucHVzaChbYyxjdXJbMl0ubGVuZ3RoLTFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSB8fCAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICB2YXIga2V5ID0gJydcbiAgICAgICAgdmFyIGNvcHlLZXlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzFdKVxuICAgICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV1bMF0gPT09IFZBUiAmJiBwYXJ0c1tpXVsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFydHNbaV1bMl0gPT09ICdvYmplY3QnICYmICFrZXkpIHtcbiAgICAgICAgICAgICAgZm9yIChjb3B5S2V5IGluIHBhcnRzW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzW2ldWzJdLmhhc093blByb3BlcnR5KGNvcHlLZXkpICYmICFjdXJbMV1bY29weUtleV0pIHtcbiAgICAgICAgICAgICAgICAgIGN1clsxXVtjb3B5S2V5XSA9IHBhcnRzW2ldWzJdW2NvcHlLZXldXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfRVEpIGkrK1xuICAgICAgICB2YXIgaiA9IGlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9WQUxVRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMV0pXG4gICAgICAgICAgICBlbHNlIGN1clsxXVtrZXldID0gY29uY2F0KGN1clsxXVtrZXldLCBwYXJ0c1tpXVsxXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcnRzW2ldWzBdID09PSBWQVJcbiAgICAgICAgICAmJiAocGFydHNbaV1bMV0gPT09IEFUVFJfVkFMVUUgfHwgcGFydHNbaV1bMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICAgICAgaWYgKCFjdXJbMV1ba2V5XSkgY3VyWzFdW2tleV0gPSBzdHJmbihwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIGVsc2UgY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzJdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoa2V5Lmxlbmd0aCAmJiAhY3VyWzFdW2tleV0gJiYgaSA9PT0galxuICAgICAgICAgICAgJiYgKHBhcnRzW2ldWzBdID09PSBDTE9TRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9CUkVBSykpIHtcbiAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2UvaW5mcmFzdHJ1Y3R1cmUuaHRtbCNib29sZWFuLWF0dHJpYnV0ZXNcbiAgICAgICAgICAgICAgLy8gZW1wdHkgc3RyaW5nIGlzIGZhbHN5LCBub3Qgd2VsbCBiZWhhdmVkIHZhbHVlIGluIGJyb3dzZXJcbiAgICAgICAgICAgICAgY3VyWzFdW2tleV0gPSBrZXkudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMV1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMl1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBDTE9TRSkge1xuICAgICAgICBpZiAoc2VsZkNsb3NpbmcoY3VyWzBdKSAmJiBzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IFRFWFQpIHtcbiAgICAgICAgaWYgKHBbMl0gPT09IHVuZGVmaW5lZCB8fCBwWzJdID09PSBudWxsKSBwWzJdID0gJydcbiAgICAgICAgZWxzZSBpZiAoIXBbMl0pIHBbMl0gPSBjb25jYXQoJycsIHBbMl0pXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBbMl1bMF0pKSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2guYXBwbHkoY3VyWzJdLCBwWzJdKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN1clsyXS5wdXNoKHBbMl0pXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVEVYVCkge1xuICAgICAgICBjdXJbMl0ucHVzaChwWzFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0VRIHx8IHMgPT09IEFUVFJfQlJFQUspIHtcbiAgICAgICAgLy8gbm8tb3BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5oYW5kbGVkOiAnICsgcylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAxICYmIC9eXFxzKiQvLnRlc3QodHJlZVsyXVswXSkpIHtcbiAgICAgIHRyZWVbMl0uc2hpZnQoKVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDJcbiAgICB8fCAodHJlZVsyXS5sZW5ndGggPT09IDIgJiYgL1xcUy8udGVzdCh0cmVlWzJdWzFdKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ211bHRpcGxlIHJvb3QgZWxlbWVudHMgbXVzdCBiZSB3cmFwcGVkIGluIGFuIGVuY2xvc2luZyB0YWcnXG4gICAgICApXG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHRyZWVbMl1bMF0pICYmIHR5cGVvZiB0cmVlWzJdWzBdWzBdID09PSAnc3RyaW5nJ1xuICAgICYmIEFycmF5LmlzQXJyYXkodHJlZVsyXVswXVsyXSkpIHtcbiAgICAgIHRyZWVbMl1bMF0gPSBoKHRyZWVbMl1bMF1bMF0sIHRyZWVbMl1bMF1bMV0sIHRyZWVbMl1bMF1bMl0pXG4gICAgfVxuICAgIHJldHVybiB0cmVlWzJdWzBdXG5cbiAgICBmdW5jdGlvbiBwYXJzZSAoc3RyKSB7XG4gICAgICB2YXIgcmVzID0gW11cbiAgICAgIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XKSBzdGF0ZSA9IEFUVFJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjID0gc3RyLmNoYXJBdChpKVxuICAgICAgICBpZiAoc3RhdGUgPT09IFRFWFQgJiYgYyA9PT0gJzwnKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtURVhULCByZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBPUEVOXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJz4nICYmICFxdW90KHN0YXRlKSkge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4scmVnXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXMucHVzaChbQ0xPU0VdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IFRFWFQpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvW1xcdy1dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIHJlZyA9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddLFtBVFRSX0VRXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0VRXSlcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgICAgaWYgKC9bXFx3LV0vLnRlc3QoYykpIHtcbiAgICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgfSBlbHNlIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9EUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICAgIGktLVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW1RFWFQscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0cmZuICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JykgcmV0dXJuIHhcbiAgICBlbHNlIHJldHVybiBjb25jYXQoJycsIHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVvdCAoc3RhdGUpIHtcbiAgcmV0dXJuIHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRXG59XG5cbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG5mdW5jdGlvbiBoYXMgKG9iaiwga2V5KSB7IHJldHVybiBoYXNPd24uY2FsbChvYmosIGtleSkgfVxuXG52YXIgY2xvc2VSRSA9IFJlZ0V4cCgnXignICsgW1xuICAnYXJlYScsICdiYXNlJywgJ2Jhc2Vmb250JywgJ2Jnc291bmQnLCAnYnInLCAnY29sJywgJ2NvbW1hbmQnLCAnZW1iZWQnLFxuICAnZnJhbWUnLCAnaHInLCAnaW1nJywgJ2lucHV0JywgJ2lzaW5kZXgnLCAna2V5Z2VuJywgJ2xpbmsnLCAnbWV0YScsICdwYXJhbScsXG4gICdzb3VyY2UnLCAndHJhY2snLCAnd2JyJyxcbiAgLy8gU1ZHIFRBR1NcbiAgJ2FuaW1hdGUnLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY3Vyc29yJywgJ2Rlc2MnLCAnZWxsaXBzZScsXG4gICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLCAnZmVDb21wb25lbnRUcmFuc2ZlcicsICdmZUNvbXBvc2l0ZScsXG4gICdmZUNvbnZvbHZlTWF0cml4JywgJ2ZlRGlmZnVzZUxpZ2h0aW5nJywgJ2ZlRGlzcGxhY2VtZW50TWFwJyxcbiAgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRmxvb2QnLCAnZmVGdW5jQScsICdmZUZ1bmNCJywgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsXG4gICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJywgJ2ZlTWVyZ2VOb2RlJywgJ2ZlTW9ycGhvbG9neScsXG4gICdmZU9mZnNldCcsICdmZVBvaW50TGlnaHQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJywgJ2ZlU3BvdExpZ2h0JywgJ2ZlVGlsZScsXG4gICdmZVR1cmJ1bGVuY2UnLCAnZm9udC1mYWNlLWZvcm1hdCcsICdmb250LWZhY2UtbmFtZScsICdmb250LWZhY2UtdXJpJyxcbiAgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJywgJ2xpbmUnLCAnbWlzc2luZy1nbHlwaCcsICdtcGF0aCcsXG4gICdwYXRoJywgJ3BvbHlnb24nLCAncG9seWxpbmUnLCAncmVjdCcsICdzZXQnLCAnc3RvcCcsICd0cmVmJywgJ3VzZScsICd2aWV3JyxcbiAgJ3ZrZXJuJ1xuXS5qb2luKCd8JykgKyAnKSg/OltcXC4jXVthLXpBLVowLTlcXHUwMDdGLVxcdUZGRkZfOi1dKykqJCcpXG5mdW5jdGlvbiBzZWxmQ2xvc2luZyAodGFnKSB7IHJldHVybiBjbG9zZVJFLnRlc3QodGFnKSB9XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGF0dHJpYnV0ZVRvUHJvcGVydHlcblxudmFyIHRyYW5zZm9ybSA9IHtcbiAgJ2NsYXNzJzogJ2NsYXNzTmFtZScsXG4gICdmb3InOiAnaHRtbEZvcicsXG4gICdodHRwLWVxdWl2JzogJ2h0dHBFcXVpdidcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVG9Qcm9wZXJ0eSAoaCkge1xuICByZXR1cm4gZnVuY3Rpb24gKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbikge1xuICAgIGZvciAodmFyIGF0dHIgaW4gYXR0cnMpIHtcbiAgICAgIGlmIChhdHRyIGluIHRyYW5zZm9ybSkge1xuICAgICAgICBhdHRyc1t0cmFuc2Zvcm1bYXR0cl1dID0gYXR0cnNbYXR0cl1cbiAgICAgICAgZGVsZXRlIGF0dHJzW2F0dHJdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBoKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbilcbiAgfVxufVxuIiwiLyogZ2xvYmFsIE11dGF0aW9uT2JzZXJ2ZXIgKi9cbnZhciBkb2N1bWVudCA9IHJlcXVpcmUoJ2dsb2JhbC9kb2N1bWVudCcpXG52YXIgd2luZG93ID0gcmVxdWlyZSgnZ2xvYmFsL3dpbmRvdycpXG52YXIgd2F0Y2ggPSBPYmplY3QuY3JlYXRlKG51bGwpXG52YXIgS0VZX0lEID0gJ29ubG9hZGlkJyArIChuZXcgRGF0ZSgpICUgOWU2KS50b1N0cmluZygzNilcbnZhciBLRVlfQVRUUiA9ICdkYXRhLScgKyBLRVlfSURcbnZhciBJTkRFWCA9IDBcblxuaWYgKHdpbmRvdyAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcikge1xuICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgaWYgKE9iamVjdC5rZXlzKHdhdGNoKS5sZW5ndGggPCAxKSByZXR1cm5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG11dGF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG11dGF0aW9uc1tpXS5hdHRyaWJ1dGVOYW1lID09PSBLRVlfQVRUUikge1xuICAgICAgICBlYWNoQXR0cihtdXRhdGlvbnNbaV0sIHR1cm5vbiwgdHVybm9mZilcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGVhY2hNdXRhdGlvbihtdXRhdGlvbnNbaV0ucmVtb3ZlZE5vZGVzLCB0dXJub2ZmKVxuICAgICAgZWFjaE11dGF0aW9uKG11dGF0aW9uc1tpXS5hZGRlZE5vZGVzLCB0dXJub24pXG4gICAgfVxuICB9KVxuICBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHtcbiAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgc3VidHJlZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVzOiB0cnVlLFxuICAgIGF0dHJpYnV0ZU9sZFZhbHVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZUZpbHRlcjogW0tFWV9BVFRSXVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG9ubG9hZCAoZWwsIG9uLCBvZmYsIGNhbGxlcikge1xuICBvbiA9IG9uIHx8IGZ1bmN0aW9uICgpIHt9XG4gIG9mZiA9IG9mZiB8fCBmdW5jdGlvbiAoKSB7fVxuICBlbC5zZXRBdHRyaWJ1dGUoS0VZX0FUVFIsICdvJyArIElOREVYKVxuICB3YXRjaFsnbycgKyBJTkRFWF0gPSBbb24sIG9mZiwgMCwgY2FsbGVyIHx8IG9ubG9hZC5jYWxsZXJdXG4gIElOREVYICs9IDFcbiAgcmV0dXJuIGVsXG59XG5cbmZ1bmN0aW9uIHR1cm5vbiAoaW5kZXgsIGVsKSB7XG4gIGlmICh3YXRjaFtpbmRleF1bMF0gJiYgd2F0Y2hbaW5kZXhdWzJdID09PSAwKSB7XG4gICAgd2F0Y2hbaW5kZXhdWzBdKGVsKVxuICAgIHdhdGNoW2luZGV4XVsyXSA9IDFcbiAgfVxufVxuXG5mdW5jdGlvbiB0dXJub2ZmIChpbmRleCwgZWwpIHtcbiAgaWYgKHdhdGNoW2luZGV4XVsxXSAmJiB3YXRjaFtpbmRleF1bMl0gPT09IDEpIHtcbiAgICB3YXRjaFtpbmRleF1bMV0oZWwpXG4gICAgd2F0Y2hbaW5kZXhdWzJdID0gMFxuICB9XG59XG5cbmZ1bmN0aW9uIGVhY2hBdHRyIChtdXRhdGlvbiwgb24sIG9mZikge1xuICB2YXIgbmV3VmFsdWUgPSBtdXRhdGlvbi50YXJnZXQuZ2V0QXR0cmlidXRlKEtFWV9BVFRSKVxuICBpZiAoc2FtZU9yaWdpbihtdXRhdGlvbi5vbGRWYWx1ZSwgbmV3VmFsdWUpKSB7XG4gICAgd2F0Y2hbbmV3VmFsdWVdID0gd2F0Y2hbbXV0YXRpb24ub2xkVmFsdWVdXG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKHdhdGNoW211dGF0aW9uLm9sZFZhbHVlXSkge1xuICAgIG9mZihtdXRhdGlvbi5vbGRWYWx1ZSwgbXV0YXRpb24udGFyZ2V0KVxuICB9XG4gIGlmICh3YXRjaFtuZXdWYWx1ZV0pIHtcbiAgICBvbihuZXdWYWx1ZSwgbXV0YXRpb24udGFyZ2V0KVxuICB9XG59XG5cbmZ1bmN0aW9uIHNhbWVPcmlnaW4gKG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICBpZiAoIW9sZFZhbHVlIHx8ICFuZXdWYWx1ZSkgcmV0dXJuIGZhbHNlXG4gIHJldHVybiB3YXRjaFtvbGRWYWx1ZV1bM10gPT09IHdhdGNoW25ld1ZhbHVlXVszXVxufVxuXG5mdW5jdGlvbiBlYWNoTXV0YXRpb24gKG5vZGVzLCBmbikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHdhdGNoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG5vZGVzW2ldICYmIG5vZGVzW2ldLmdldEF0dHJpYnV0ZSAmJiBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpKSB7XG4gICAgICB2YXIgb25sb2FkaWQgPSBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpXG4gICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgaWYgKG9ubG9hZGlkID09PSBrKSB7XG4gICAgICAgICAgZm4oaywgbm9kZXNbaV0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGlmIChub2Rlc1tpXS5jaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGVhY2hNdXRhdGlvbihub2Rlc1tpXS5jaGlsZE5vZGVzLCBmbilcbiAgICB9XG4gIH1cbn1cbiIsIi8vIENyZWF0ZSBhIHJhbmdlIG9iamVjdCBmb3IgZWZmaWNlbnRseSByZW5kZXJpbmcgc3RyaW5ncyB0byBlbGVtZW50cy5cbnZhciByYW5nZTtcblxudmFyIHRlc3RFbCA9ICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSA/XG4gICAgZG9jdW1lbnQuYm9keSB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSA6XG4gICAge307XG5cbnZhciBYSFRNTCA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJztcbnZhciBFTEVNRU5UX05PREUgPSAxO1xudmFyIFRFWFRfTk9ERSA9IDM7XG52YXIgQ09NTUVOVF9OT0RFID0gODtcblxuLy8gRml4ZXMgPGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2lzc3Vlcy8zMj5cbi8vIChJRTcrIHN1cHBvcnQpIDw9SUU3IGRvZXMgbm90IHN1cHBvcnQgZWwuaGFzQXR0cmlidXRlKG5hbWUpXG52YXIgaGFzQXR0cmlidXRlTlM7XG5cbmlmICh0ZXN0RWwuaGFzQXR0cmlidXRlTlMpIHtcbiAgICBoYXNBdHRyaWJ1dGVOUyA9IGZ1bmN0aW9uKGVsLCBuYW1lc3BhY2VVUkksIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZU5TKG5hbWVzcGFjZVVSSSwgbmFtZSk7XG4gICAgfTtcbn0gZWxzZSBpZiAodGVzdEVsLmhhc0F0dHJpYnV0ZSkge1xuICAgIGhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKG5hbWUpO1xuICAgIH07XG59IGVsc2Uge1xuICAgIGhhc0F0dHJpYnV0ZU5TID0gZnVuY3Rpb24oZWwsIG5hbWVzcGFjZVVSSSwgbmFtZSkge1xuICAgICAgICByZXR1cm4gISFlbC5nZXRBdHRyaWJ1dGVOb2RlKG5hbWUpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGVtcHR5KG8pIHtcbiAgICBmb3IgKHZhciBrIGluIG8pIHtcbiAgICAgICAgaWYgKG8uaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdG9FbGVtZW50KHN0cikge1xuICAgIGlmICghcmFuZ2UgJiYgZG9jdW1lbnQuY3JlYXRlUmFuZ2UpIHtcbiAgICAgICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgICAgICByYW5nZS5zZWxlY3ROb2RlKGRvY3VtZW50LmJvZHkpO1xuICAgIH1cblxuICAgIHZhciBmcmFnbWVudDtcbiAgICBpZiAocmFuZ2UgJiYgcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KSB7XG4gICAgICAgIGZyYWdtZW50ID0gcmFuZ2UuY3JlYXRlQ29udGV4dHVhbEZyYWdtZW50KHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib2R5Jyk7XG4gICAgICAgIGZyYWdtZW50LmlubmVySFRNTCA9IHN0cjtcbiAgICB9XG4gICAgcmV0dXJuIGZyYWdtZW50LmNoaWxkTm9kZXNbMF07XG59XG5cbnZhciBzcGVjaWFsRWxIYW5kbGVycyA9IHtcbiAgICAvKipcbiAgICAgKiBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIGRvZXNuJ3QgdGhpbmsgdGhhdCBcInNlbGVjdGVkXCIgaXMgYW5cbiAgICAgKiBhdHRyaWJ1dGUgd2hlbiByZWFkaW5nIG92ZXIgdGhlIGF0dHJpYnV0ZXMgdXNpbmcgc2VsZWN0RWwuYXR0cmlidXRlc1xuICAgICAqL1xuICAgIE9QVElPTjogZnVuY3Rpb24oZnJvbUVsLCB0b0VsKSB7XG4gICAgICAgIGZyb21FbC5zZWxlY3RlZCA9IHRvRWwuc2VsZWN0ZWQ7XG4gICAgICAgIGlmIChmcm9tRWwuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIGZyb21FbC5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbUVsLnJlbW92ZUF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRoZSBcInZhbHVlXCIgYXR0cmlidXRlIGlzIHNwZWNpYWwgZm9yIHRoZSA8aW5wdXQ+IGVsZW1lbnQgc2luY2UgaXQgc2V0c1xuICAgICAqIHRoZSBpbml0aWFsIHZhbHVlLiBDaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSB3aXRob3V0IGNoYW5naW5nIHRoZVxuICAgICAqIFwidmFsdWVcIiBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZVxuICAgICAqIGluaXRpYWwgdmFsdWUuICBTaW1pbGFyIGZvciB0aGUgXCJjaGVja2VkXCIgYXR0cmlidXRlLCBhbmQgXCJkaXNhYmxlZFwiLlxuICAgICAqL1xuICAgIElOUFVUOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgZnJvbUVsLmNoZWNrZWQgPSB0b0VsLmNoZWNrZWQ7XG4gICAgICAgIGlmIChmcm9tRWwuY2hlY2tlZCkge1xuICAgICAgICAgICAgZnJvbUVsLnNldEF0dHJpYnV0ZSgnY2hlY2tlZCcsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyb21FbC5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm9tRWwudmFsdWUgIT09IHRvRWwudmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IHRvRWwudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWhhc0F0dHJpYnV0ZU5TKHRvRWwsIG51bGwsICd2YWx1ZScpKSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCd2YWx1ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnJvbUVsLmRpc2FibGVkID0gdG9FbC5kaXNhYmxlZDtcbiAgICAgICAgaWYgKGZyb21FbC5kaXNhYmxlZCkge1xuICAgICAgICAgICAgZnJvbUVsLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcm9tRWwucmVtb3ZlQXR0cmlidXRlKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIFRFWFRBUkVBOiBmdW5jdGlvbihmcm9tRWwsIHRvRWwpIHtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gdG9FbC52YWx1ZTtcbiAgICAgICAgaWYgKGZyb21FbC52YWx1ZSAhPT0gbmV3VmFsdWUpIHtcbiAgICAgICAgICAgIGZyb21FbC52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZyb21FbC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBmcm9tRWwuZmlyc3RDaGlsZC5ub2RlVmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0d28gbm9kZSdzIG5hbWVzIGFuZCBuYW1lc3BhY2UgVVJJcyBhcmUgdGhlIHNhbWUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBhXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGJcbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbnZhciBjb21wYXJlTm9kZU5hbWVzID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLm5vZGVOYW1lID09PSBiLm5vZGVOYW1lICYmXG4gICAgICAgICAgIGEubmFtZXNwYWNlVVJJID09PSBiLm5hbWVzcGFjZVVSSTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVsZW1lbnQsIG9wdGlvbmFsbHkgd2l0aCBhIGtub3duIG5hbWVzcGFjZSBVUkkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIGVsZW1lbnQgbmFtZSwgZS5nLiAnZGl2JyBvciAnc3ZnJ1xuICogQHBhcmFtIHtzdHJpbmd9IFtuYW1lc3BhY2VVUkldIHRoZSBlbGVtZW50J3MgbmFtZXNwYWNlIFVSSSwgaS5lLiB0aGUgdmFsdWUgb2ZcbiAqIGl0cyBgeG1sbnNgIGF0dHJpYnV0ZSBvciBpdHMgaW5mZXJyZWQgbmFtZXNwYWNlLlxuICpcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lLCBuYW1lc3BhY2VVUkkpIHtcbiAgICByZXR1cm4gIW5hbWVzcGFjZVVSSSB8fCBuYW1lc3BhY2VVUkkgPT09IFhIVE1MID9cbiAgICAgICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKSA6XG4gICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIG5hbWUpO1xufVxuXG4vKipcbiAqIExvb3Agb3ZlciBhbGwgb2YgdGhlIGF0dHJpYnV0ZXMgb24gdGhlIHRhcmdldCBub2RlIGFuZCBtYWtlIHN1cmUgdGhlIG9yaWdpbmFsXG4gKiBET00gbm9kZSBoYXMgdGhlIHNhbWUgYXR0cmlidXRlcy4gSWYgYW4gYXR0cmlidXRlIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBub2RlXG4gKiBpcyBub3Qgb24gdGhlIG5ldyBub2RlIHRoZW4gcmVtb3ZlIGl0IGZyb20gdGhlIG9yaWdpbmFsIG5vZGUuXG4gKlxuICogQHBhcmFtICB7RWxlbWVudH0gZnJvbU5vZGVcbiAqIEBwYXJhbSAge0VsZW1lbnR9IHRvTm9kZVxuICovXG5mdW5jdGlvbiBtb3JwaEF0dHJzKGZyb21Ob2RlLCB0b05vZGUpIHtcbiAgICB2YXIgYXR0cnMgPSB0b05vZGUuYXR0cmlidXRlcztcbiAgICB2YXIgaTtcbiAgICB2YXIgYXR0cjtcbiAgICB2YXIgYXR0ck5hbWU7XG4gICAgdmFyIGF0dHJOYW1lc3BhY2VVUkk7XG4gICAgdmFyIGF0dHJWYWx1ZTtcbiAgICB2YXIgZnJvbVZhbHVlO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgYXR0clZhbHVlID0gYXR0ci52YWx1ZTtcbiAgICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJO1xuXG4gICAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lO1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJvbVZhbHVlID0gZnJvbU5vZGUuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgICAgICBmcm9tTm9kZS5zZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSwgYXR0clZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnJvbU5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIGFueSBleHRyYSBhdHRyaWJ1dGVzIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBET00gZWxlbWVudCB0aGF0XG4gICAgLy8gd2VyZW4ndCBmb3VuZCBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuXG4gICAgYXR0cnMgPSBmcm9tTm9kZS5hdHRyaWJ1dGVzO1xuXG4gICAgZm9yIChpID0gYXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgICBpZiAoYXR0ci5zcGVjaWZpZWQgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSTtcblxuICAgICAgICAgICAgaWYgKCFoYXNBdHRyaWJ1dGVOUyh0b05vZGUsIGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lc3BhY2VVUkkgPyBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lIDogYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbU5vZGUucmVtb3ZlQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ci5sb2NhbE5hbWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb21Ob2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIENvcGllcyB0aGUgY2hpbGRyZW4gb2Ygb25lIERPTSBlbGVtZW50IHRvIGFub3RoZXIgRE9NIGVsZW1lbnRcbiAqL1xuZnVuY3Rpb24gbW92ZUNoaWxkcmVuKGZyb21FbCwgdG9FbCkge1xuICAgIHZhciBjdXJDaGlsZCA9IGZyb21FbC5maXJzdENoaWxkO1xuICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgICB2YXIgbmV4dENoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgIHRvRWwuYXBwZW5kQ2hpbGQoY3VyQ2hpbGQpO1xuICAgICAgICBjdXJDaGlsZCA9IG5leHRDaGlsZDtcbiAgICB9XG4gICAgcmV0dXJuIHRvRWw7XG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRHZXROb2RlS2V5KG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5pZDtcbn1cblxuZnVuY3Rpb24gbW9ycGhkb20oZnJvbU5vZGUsIHRvTm9kZSwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0b05vZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGlmIChmcm9tTm9kZS5ub2RlTmFtZSA9PT0gJyNkb2N1bWVudCcgfHwgZnJvbU5vZGUubm9kZU5hbWUgPT09ICdIVE1MJykge1xuICAgICAgICAgICAgdmFyIHRvTm9kZUh0bWwgPSB0b05vZGU7XG4gICAgICAgICAgICB0b05vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdodG1sJyk7XG4gICAgICAgICAgICB0b05vZGUuaW5uZXJIVE1MID0gdG9Ob2RlSHRtbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRvTm9kZSA9IHRvRWxlbWVudCh0b05vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gWFhYIG9wdGltaXphdGlvbjogaWYgdGhlIG5vZGVzIGFyZSBlcXVhbCwgZG9uJ3QgbW9ycGggdGhlbVxuICAgIC8qXG4gICAgaWYgKGZyb21Ob2RlLmlzRXF1YWxOb2RlKHRvTm9kZSkpIHtcbiAgICAgIHJldHVybiBmcm9tTm9kZTtcbiAgICB9XG4gICAgKi9cblxuICAgIHZhciBzYXZlZEVscyA9IHt9OyAvLyBVc2VkIHRvIHNhdmUgb2ZmIERPTSBlbGVtZW50cyB3aXRoIElEc1xuICAgIHZhciB1bm1hdGNoZWRFbHMgPSB7fTtcbiAgICB2YXIgZ2V0Tm9kZUtleSA9IG9wdGlvbnMuZ2V0Tm9kZUtleSB8fCBkZWZhdWx0R2V0Tm9kZUtleTtcbiAgICB2YXIgb25CZWZvcmVOb2RlQWRkZWQgPSBvcHRpb25zLm9uQmVmb3JlTm9kZUFkZGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uTm9kZUFkZGVkID0gb3B0aW9ucy5vbk5vZGVBZGRlZCB8fCBub29wO1xuICAgIHZhciBvbkJlZm9yZUVsVXBkYXRlZCA9IG9wdGlvbnMub25CZWZvcmVFbFVwZGF0ZWQgfHwgb3B0aW9ucy5vbkJlZm9yZU1vcnBoRWwgfHwgbm9vcDtcbiAgICB2YXIgb25FbFVwZGF0ZWQgPSBvcHRpb25zLm9uRWxVcGRhdGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uQmVmb3JlTm9kZURpc2NhcmRlZCA9IG9wdGlvbnMub25CZWZvcmVOb2RlRGlzY2FyZGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uTm9kZURpc2NhcmRlZCA9IG9wdGlvbnMub25Ob2RlRGlzY2FyZGVkIHx8IG5vb3A7XG4gICAgdmFyIG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgPSBvcHRpb25zLm9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQgfHwgb3B0aW9ucy5vbkJlZm9yZU1vcnBoRWxDaGlsZHJlbiB8fCBub29wO1xuICAgIHZhciBjaGlsZHJlbk9ubHkgPSBvcHRpb25zLmNoaWxkcmVuT25seSA9PT0gdHJ1ZTtcbiAgICB2YXIgbW92ZWRFbHMgPSBbXTtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGVIZWxwZXIobm9kZSwgbmVzdGVkSW5TYXZlZEVsKSB7XG4gICAgICAgIHZhciBpZCA9IGdldE5vZGVLZXkobm9kZSk7XG4gICAgICAgIC8vIElmIHRoZSBub2RlIGhhcyBhbiBJRCB0aGVuIHNhdmUgaXQgb2ZmIHNpbmNlIHdlIHdpbGwgd2FudFxuICAgICAgICAvLyB0byByZXVzZSBpdCBpbiBjYXNlIHRoZSB0YXJnZXQgRE9NIHRyZWUgaGFzIGEgRE9NIGVsZW1lbnRcbiAgICAgICAgLy8gd2l0aCB0aGUgc2FtZSBJRFxuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHNhdmVkRWxzW2lkXSA9IG5vZGU7XG4gICAgICAgIH0gZWxzZSBpZiAoIW5lc3RlZEluU2F2ZWRFbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgYXJlIG5vdCBuZXN0ZWQgaW4gYSBzYXZlZCBlbGVtZW50IHRoZW4gd2Uga25vdyB0aGF0IHRoaXMgbm9kZSBoYXMgYmVlblxuICAgICAgICAgICAgLy8gY29tcGxldGVseSBkaXNjYXJkZWQgYW5kIHdpbGwgbm90IGV4aXN0IGluIHRoZSBmaW5hbCBET00uXG4gICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQobm9kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICB2YXIgY3VyQ2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICByZW1vdmVOb2RlSGVscGVyKGN1ckNoaWxkLCBuZXN0ZWRJblNhdmVkRWwgfHwgaWQpO1xuICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3YWxrRGlzY2FyZGVkQ2hpbGROb2Rlcyhub2RlKSB7XG4gICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgIHZhciBjdXJDaGlsZCA9IG5vZGUuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHdoaWxlIChjdXJDaGlsZCkge1xuXG5cbiAgICAgICAgICAgICAgICBpZiAoIWdldE5vZGVLZXkoY3VyQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIG9ubHkgd2FudCB0byBoYW5kbGUgbm9kZXMgdGhhdCBkb24ndCBoYXZlIGFuIElEIHRvIGF2b2lkIGRvdWJsZVxuICAgICAgICAgICAgICAgICAgICAvLyB3YWxraW5nIHRoZSBzYW1lIHNhdmVkIGVsZW1lbnQuXG5cbiAgICAgICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGN1ckNoaWxkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBXYWxrIHJlY3Vyc2l2ZWx5XG4gICAgICAgICAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlTm9kZShub2RlLCBwYXJlbnROb2RlLCBhbHJlYWR5VmlzaXRlZCkge1xuICAgICAgICBpZiAob25CZWZvcmVOb2RlRGlzY2FyZGVkKG5vZGUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgaWYgKGFscmVhZHlWaXNpdGVkKSB7XG4gICAgICAgICAgICBpZiAoIWdldE5vZGVLZXkobm9kZSkpIHtcbiAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQobm9kZSk7XG4gICAgICAgICAgICAgICAgd2Fsa0Rpc2NhcmRlZENoaWxkTm9kZXMobm9kZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZW1vdmVOb2RlSGVscGVyKG5vZGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW9ycGhFbChmcm9tRWwsIHRvRWwsIGFscmVhZHlWaXNpdGVkLCBjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgdmFyIHRvRWxLZXkgPSBnZXROb2RlS2V5KHRvRWwpO1xuICAgICAgICBpZiAodG9FbEtleSkge1xuICAgICAgICAgICAgLy8gSWYgYW4gZWxlbWVudCB3aXRoIGFuIElEIGlzIGJlaW5nIG1vcnBoZWQgdGhlbiBpdCBpcyB3aWxsIGJlIGluIHRoZSBmaW5hbFxuICAgICAgICAgICAgLy8gRE9NIHNvIGNsZWFyIGl0IG91dCBvZiB0aGUgc2F2ZWQgZWxlbWVudHMgY29sbGVjdGlvblxuICAgICAgICAgICAgZGVsZXRlIHNhdmVkRWxzW3RvRWxLZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgICAgIGlmIChvbkJlZm9yZUVsVXBkYXRlZChmcm9tRWwsIHRvRWwpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW9ycGhBdHRycyhmcm9tRWwsIHRvRWwpO1xuICAgICAgICAgICAgb25FbFVwZGF0ZWQoZnJvbUVsKTtcblxuICAgICAgICAgICAgaWYgKG9uQmVmb3JlRWxDaGlsZHJlblVwZGF0ZWQoZnJvbUVsLCB0b0VsKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZnJvbUVsLm5vZGVOYW1lICE9PSAnVEVYVEFSRUEnKSB7XG4gICAgICAgICAgICB2YXIgY3VyVG9Ob2RlQ2hpbGQgPSB0b0VsLmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21FbC5maXJzdENoaWxkO1xuICAgICAgICAgICAgdmFyIGN1clRvTm9kZUlkO1xuXG4gICAgICAgICAgICB2YXIgZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgdmFyIHRvTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICB2YXIgc2F2ZWRFbDtcbiAgICAgICAgICAgIHZhciB1bm1hdGNoZWRFbDtcblxuICAgICAgICAgICAgb3V0ZXI6IHdoaWxlIChjdXJUb05vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgIHRvTmV4dFNpYmxpbmcgPSBjdXJUb05vZGVDaGlsZC5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICBjdXJUb05vZGVJZCA9IGdldE5vZGVLZXkoY3VyVG9Ob2RlQ2hpbGQpO1xuXG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1ckZyb21Ob2RlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1ckZyb21Ob2RlSWQgPSBnZXROb2RlS2V5KGN1ckZyb21Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICBmcm9tTmV4dFNpYmxpbmcgPSBjdXJGcm9tTm9kZUNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICghYWxyZWFkeVZpc2l0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJGcm9tTm9kZUlkICYmICh1bm1hdGNoZWRFbCA9IHVubWF0Y2hlZEVsc1tjdXJGcm9tTm9kZUlkXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bm1hdGNoZWRFbC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjdXJGcm9tTm9kZUNoaWxkLCB1bm1hdGNoZWRFbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChjdXJGcm9tTm9kZUNoaWxkLCB1bm1hdGNoZWRFbCwgYWxyZWFkeVZpc2l0ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgY3VyRnJvbU5vZGVUeXBlID0gY3VyRnJvbU5vZGVDaGlsZC5ub2RlVHlwZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBjdXJUb05vZGVDaGlsZC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQ29tcGF0aWJsZSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBCb3RoIG5vZGVzIGJlaW5nIGNvbXBhcmVkIGFyZSBFbGVtZW50IG5vZGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGFyZU5vZGVOYW1lcyhjdXJGcm9tTm9kZUNoaWxkLCBjdXJUb05vZGVDaGlsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBjb21wYXRpYmxlIERPTSBlbGVtZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VyRnJvbU5vZGVJZCB8fCBjdXJUb05vZGVJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZWl0aGVyIERPTSBlbGVtZW50IGhhcyBhbiBJRCB0aGVuIHdlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBoYW5kbGUgdGhvc2UgZGlmZmVyZW50bHkgc2luY2Ugd2Ugd2FudCB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2ggdXAgYnkgSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJUb05vZGVJZCA9PT0gY3VyRnJvbU5vZGVJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29tcGF0aWJsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0NvbXBhdGlibGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29tcGF0aWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBmb3VuZCBjb21wYXRpYmxlIERPTSBlbGVtZW50cyBzbyB0cmFuc2Zvcm1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgXCJmcm9tXCIgbm9kZSB0byBtYXRjaCB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0YXJnZXQgRE9NIG5vZGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vcnBoRWwoY3VyRnJvbU5vZGVDaGlsZCwgY3VyVG9Ob2RlQ2hpbGQsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBCb3RoIG5vZGVzIGJlaW5nIGNvbXBhcmVkIGFyZSBUZXh0IG9yIENvbW1lbnQgbm9kZXNcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJGcm9tTm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBjdXJGcm9tTm9kZVR5cGUgPT0gQ09NTUVOVF9OT0RFKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb21wYXRpYmxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaW1wbHkgdXBkYXRlIG5vZGVWYWx1ZSBvbiB0aGUgb3JpZ2luYWwgbm9kZSB0b1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZSB0aGUgdGV4dCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQubm9kZVZhbHVlID0gY3VyVG9Ob2RlQ2hpbGQubm9kZVZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VyVG9Ob2RlQ2hpbGQgPSB0b05leHRTaWJsaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ckZyb21Ob2RlQ2hpbGQgPSBmcm9tTmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgb3V0ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBObyBjb21wYXRpYmxlIG1hdGNoIHNvIHJlbW92ZSB0aGUgb2xkIG5vZGUgZnJvbSB0aGUgRE9NXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZCBjb250aW51ZSB0cnlpbmcgdG8gZmluZCBhIG1hdGNoIGluIHRoZSBvcmlnaW5hbCBET01cbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgY3VyRnJvbU5vZGVDaGlsZCA9IGZyb21OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VyVG9Ob2RlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChzYXZlZEVsID0gc2F2ZWRFbHNbY3VyVG9Ob2RlSWRdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBhcmVOb2RlTmFtZXMoc2F2ZWRFbCwgY3VyVG9Ob2RlQ2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9ycGhFbChzYXZlZEVsLCBjdXJUb05vZGVDaGlsZCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2Ugd2FudCB0byBhcHBlbmQgdGhlIHNhdmVkIGVsZW1lbnQgaW5zdGVhZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gc2F2ZWRFbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVkRWxzW2N1clRvTm9kZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQoc2F2ZWRFbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY3VycmVudCBET00gZWxlbWVudCBpbiB0aGUgdGFyZ2V0IHRyZWUgaGFzIGFuIElEXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBidXQgd2UgZGlkIG5vdCBmaW5kIGEgbWF0Y2ggaW4gYW55IG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZGluZyBzaWJsaW5ncy4gV2UganVzdCBwdXQgdGhlIHRhcmdldFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCBpbiB0aGUgb2xkIERPTSB0cmVlIGJ1dCBpZiB3ZSBsYXRlciBmaW5kIGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBlbGVtZW50IGluIHRoZSBvbGQgRE9NIHRyZWUgdGhhdCBoYXMgYSBtYXRjaGluZyBJRFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlbiB3ZSB3aWxsIHJlcGxhY2UgdGhlIHRhcmdldCBlbGVtZW50IHdpdGggdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb3JyZXNwb25kaW5nIG9sZCBlbGVtZW50IGFuZCBtb3JwaCB0aGUgb2xkIGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHVubWF0Y2hlZEVsc1tjdXJUb05vZGVJZF0gPSBjdXJUb05vZGVDaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGdvdCB0aGlzIGZhciB0aGVuIHdlIGRpZCBub3QgZmluZCBhIGNhbmRpZGF0ZSBtYXRjaCBmb3JcbiAgICAgICAgICAgICAgICAvLyBvdXIgXCJ0byBub2RlXCIgYW5kIHdlIGV4aGF1c3RlZCBhbGwgb2YgdGhlIGNoaWxkcmVuIFwiZnJvbVwiXG4gICAgICAgICAgICAgICAgLy8gbm9kZXMuIFRoZXJlZm9yZSwgd2Ugd2lsbCBqdXN0IGFwcGVuZCB0aGUgY3VycmVudCBcInRvIG5vZGVcIlxuICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBlbmRcbiAgICAgICAgICAgICAgICBpZiAob25CZWZvcmVOb2RlQWRkZWQoY3VyVG9Ob2RlQ2hpbGQpICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tRWwuYXBwZW5kQ2hpbGQoY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICBvbk5vZGVBZGRlZChjdXJUb05vZGVDaGlsZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGN1clRvTm9kZUNoaWxkLm5vZGVUeXBlID09PSBFTEVNRU5UX05PREUgJiZcbiAgICAgICAgICAgICAgICAgICAgKGN1clRvTm9kZUlkIHx8IGN1clRvTm9kZUNoaWxkLmZpcnN0Q2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBlbGVtZW50IHRoYXQgd2FzIGp1c3QgYWRkZWQgdG8gdGhlIG9yaWdpbmFsIERPTSBtYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gaGF2ZSBzb21lIG5lc3RlZCBlbGVtZW50cyB3aXRoIGEga2V5L0lEIHRoYXQgbmVlZHMgdG8gYmVcbiAgICAgICAgICAgICAgICAgICAgLy8gbWF0Y2hlZCB1cCB3aXRoIG90aGVyIGVsZW1lbnRzLiBXZSdsbCBhZGQgdGhlIGVsZW1lbnQgdG9cbiAgICAgICAgICAgICAgICAgICAgLy8gYSBsaXN0IHNvIHRoYXQgd2UgY2FuIGxhdGVyIHByb2Nlc3MgdGhlIG5lc3RlZCBlbGVtZW50c1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGVyZSBhcmUgYW55IHVubWF0Y2hlZCBrZXllZCBlbGVtZW50cyB0aGF0IHdlcmVcbiAgICAgICAgICAgICAgICAgICAgLy8gZGlzY2FyZGVkXG4gICAgICAgICAgICAgICAgICAgIG1vdmVkRWxzLnB1c2goY3VyVG9Ob2RlQ2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGN1clRvTm9kZUNoaWxkID0gdG9OZXh0U2libGluZztcbiAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXZSBoYXZlIHByb2Nlc3NlZCBhbGwgb2YgdGhlIFwidG8gbm9kZXNcIi4gSWYgY3VyRnJvbU5vZGVDaGlsZCBpc1xuICAgICAgICAgICAgLy8gbm9uLW51bGwgdGhlbiB3ZSBzdGlsbCBoYXZlIHNvbWUgZnJvbSBub2RlcyBsZWZ0IG92ZXIgdGhhdCBuZWVkXG4gICAgICAgICAgICAvLyB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICB3aGlsZSAoY3VyRnJvbU5vZGVDaGlsZCkge1xuICAgICAgICAgICAgICAgIGZyb21OZXh0U2libGluZyA9IGN1ckZyb21Ob2RlQ2hpbGQubmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgcmVtb3ZlTm9kZShjdXJGcm9tTm9kZUNoaWxkLCBmcm9tRWwsIGFscmVhZHlWaXNpdGVkKTtcbiAgICAgICAgICAgICAgICBjdXJGcm9tTm9kZUNoaWxkID0gZnJvbU5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNwZWNpYWxFbEhhbmRsZXIgPSBzcGVjaWFsRWxIYW5kbGVyc1tmcm9tRWwubm9kZU5hbWVdO1xuICAgICAgICBpZiAoc3BlY2lhbEVsSGFuZGxlcikge1xuICAgICAgICAgICAgc3BlY2lhbEVsSGFuZGxlcihmcm9tRWwsIHRvRWwpO1xuICAgICAgICB9XG4gICAgfSAvLyBFTkQ6IG1vcnBoRWwoLi4uKVxuXG4gICAgdmFyIG1vcnBoZWROb2RlID0gZnJvbU5vZGU7XG4gICAgdmFyIG1vcnBoZWROb2RlVHlwZSA9IG1vcnBoZWROb2RlLm5vZGVUeXBlO1xuICAgIHZhciB0b05vZGVUeXBlID0gdG9Ob2RlLm5vZGVUeXBlO1xuXG4gICAgaWYgKCFjaGlsZHJlbk9ubHkpIHtcbiAgICAgICAgLy8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIHdlIGFyZSBnaXZlbiB0d28gRE9NIG5vZGVzIHRoYXQgYXJlIG5vdFxuICAgICAgICAvLyBjb21wYXRpYmxlIChlLmcuIDxkaXY+IC0tPiA8c3Bhbj4gb3IgPGRpdj4gLS0+IFRFWFQpXG4gICAgICAgIGlmIChtb3JwaGVkTm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgIGlmICghY29tcGFyZU5vZGVOYW1lcyhmcm9tTm9kZSwgdG9Ob2RlKSkge1xuICAgICAgICAgICAgICAgICAgICBvbk5vZGVEaXNjYXJkZWQoZnJvbU5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IG1vdmVDaGlsZHJlbihmcm9tTm9kZSwgY3JlYXRlRWxlbWVudE5TKHRvTm9kZS5ub2RlTmFtZSwgdG9Ob2RlLm5hbWVzcGFjZVVSSSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gR29pbmcgZnJvbSBhbiBlbGVtZW50IG5vZGUgdG8gYSB0ZXh0IG5vZGVcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChtb3JwaGVkTm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBtb3JwaGVkTm9kZVR5cGUgPT09IENPTU1FTlRfTk9ERSkgeyAvLyBUZXh0IG9yIGNvbW1lbnQgbm9kZVxuICAgICAgICAgICAgaWYgKHRvTm9kZVR5cGUgPT09IG1vcnBoZWROb2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIG1vcnBoZWROb2RlLm5vZGVWYWx1ZSA9IHRvTm9kZS5ub2RlVmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vcnBoZWROb2RlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUZXh0IG5vZGUgdG8gc29tZXRoaW5nIGVsc2VcbiAgICAgICAgICAgICAgICBtb3JwaGVkTm9kZSA9IHRvTm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtb3JwaGVkTm9kZSA9PT0gdG9Ob2RlKSB7XG4gICAgICAgIC8vIFRoZSBcInRvIG5vZGVcIiB3YXMgbm90IGNvbXBhdGlibGUgd2l0aCB0aGUgXCJmcm9tIG5vZGVcIiBzbyB3ZSBoYWQgdG9cbiAgICAgICAgLy8gdG9zcyBvdXQgdGhlIFwiZnJvbSBub2RlXCIgYW5kIHVzZSB0aGUgXCJ0byBub2RlXCJcbiAgICAgICAgb25Ob2RlRGlzY2FyZGVkKGZyb21Ob2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBtb3JwaEVsKG1vcnBoZWROb2RlLCB0b05vZGUsIGZhbHNlLCBjaGlsZHJlbk9ubHkpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXaGF0IHdlIHdpbGwgZG8gaGVyZSBpcyB3YWxrIHRoZSB0cmVlIGZvciB0aGUgRE9NIGVsZW1lbnQgdGhhdCB3YXNcbiAgICAgICAgICogbW92ZWQgZnJvbSB0aGUgdGFyZ2V0IERPTSB0cmVlIHRvIHRoZSBvcmlnaW5hbCBET00gdHJlZSBhbmQgd2Ugd2lsbFxuICAgICAgICAgKiBsb29rIGZvciBrZXllZCBlbGVtZW50cyB0aGF0IGNvdWxkIGJlIG1hdGNoZWQgdG8ga2V5ZWQgZWxlbWVudHMgdGhhdFxuICAgICAgICAgKiB3ZXJlIGVhcmxpZXIgZGlzY2FyZGVkLiAgSWYgd2UgZmluZCBhIG1hdGNoIHRoZW4gd2Ugd2lsbCBtb3ZlIHRoZVxuICAgICAgICAgKiBzYXZlZCBlbGVtZW50IGludG8gdGhlIGZpbmFsIERPTSB0cmVlLlxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGhhbmRsZU1vdmVkRWwgPSBmdW5jdGlvbihlbCkge1xuICAgICAgICAgICAgdmFyIGN1ckNoaWxkID0gZWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0U2libGluZyA9IGN1ckNoaWxkLm5leHRTaWJsaW5nO1xuXG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGdldE5vZGVLZXkoY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNhdmVkRWwgPSBzYXZlZEVsc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2F2ZWRFbCAmJiBjb21wYXJlTm9kZU5hbWVzKGN1ckNoaWxkLCBzYXZlZEVsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VyQ2hpbGQucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoc2F2ZWRFbCwgY3VyQ2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdHJ1ZTogYWxyZWFkeSB2aXNpdGVkIHRoZSBzYXZlZCBlbCB0cmVlXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3JwaEVsKHNhdmVkRWwsIGN1ckNoaWxkLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1ckNoaWxkID0gbmV4dFNpYmxpbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHkoc2F2ZWRFbHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VyQ2hpbGQubm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVNb3ZlZEVsKGN1ckNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJDaGlsZCA9IG5leHRTaWJsaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRoZSBsb29wIGJlbG93IGlzIHVzZWQgdG8gcG9zc2libHkgbWF0Y2ggdXAgYW55IGRpc2NhcmRlZFxuICAgICAgICAvLyBlbGVtZW50cyBpbiB0aGUgb3JpZ2luYWwgRE9NIHRyZWUgd2l0aCBlbGVtZW5ldHMgZnJvbSB0aGVcbiAgICAgICAgLy8gdGFyZ2V0IHRyZWUgdGhhdCB3ZXJlIG1vdmVkIG92ZXIgd2l0aG91dCB2aXNpdGluZyB0aGVpclxuICAgICAgICAvLyBjaGlsZHJlblxuICAgICAgICBpZiAoIWVtcHR5KHNhdmVkRWxzKSkge1xuICAgICAgICAgICAgaGFuZGxlTW92ZWRFbHNMb29wOlxuICAgICAgICAgICAgd2hpbGUgKG1vdmVkRWxzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBtb3ZlZEVsc1RlbXAgPSBtb3ZlZEVscztcbiAgICAgICAgICAgICAgICBtb3ZlZEVscyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaTxtb3ZlZEVsc1RlbXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZU1vdmVkRWwobW92ZWRFbHNUZW1wW2ldKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXJlIGFyZSBubyBtb3JlIHVubWF0Y2hlZCBlbGVtZW50cyBzbyBjb21wbGV0ZWx5IGVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGxvb3BcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrIGhhbmRsZU1vdmVkRWxzTG9vcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpcmUgdGhlIFwib25Ob2RlRGlzY2FyZGVkXCIgZXZlbnQgZm9yIGFueSBzYXZlZCBlbGVtZW50c1xuICAgICAgICAvLyB0aGF0IG5ldmVyIGZvdW5kIGEgbmV3IGhvbWUgaW4gdGhlIG1vcnBoZWQgRE9NXG4gICAgICAgIGZvciAodmFyIHNhdmVkRWxJZCBpbiBzYXZlZEVscykge1xuICAgICAgICAgICAgaWYgKHNhdmVkRWxzLmhhc093blByb3BlcnR5KHNhdmVkRWxJZCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2F2ZWRFbCA9IHNhdmVkRWxzW3NhdmVkRWxJZF07XG4gICAgICAgICAgICAgICAgb25Ob2RlRGlzY2FyZGVkKHNhdmVkRWwpO1xuICAgICAgICAgICAgICAgIHdhbGtEaXNjYXJkZWRDaGlsZE5vZGVzKHNhdmVkRWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFjaGlsZHJlbk9ubHkgJiYgbW9ycGhlZE5vZGUgIT09IGZyb21Ob2RlICYmIGZyb21Ob2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgLy8gSWYgd2UgaGFkIHRvIHN3YXAgb3V0IHRoZSBmcm9tIG5vZGUgd2l0aCBhIG5ldyBub2RlIGJlY2F1c2UgdGhlIG9sZFxuICAgICAgICAvLyBub2RlIHdhcyBub3QgY29tcGF0aWJsZSB3aXRoIHRoZSB0YXJnZXQgbm9kZSB0aGVuIHdlIG5lZWQgdG9cbiAgICAgICAgLy8gcmVwbGFjZSB0aGUgb2xkIERPTSBub2RlIGluIHRoZSBvcmlnaW5hbCBET00gdHJlZS4gVGhpcyBpcyBvbmx5XG4gICAgICAgIC8vIHBvc3NpYmxlIGlmIHRoZSBvcmlnaW5hbCBET00gbm9kZSB3YXMgcGFydCBvZiBhIERPTSB0cmVlIHdoaWNoXG4gICAgICAgIC8vIHdlIGtub3cgaXMgdGhlIGNhc2UgaWYgaXQgaGFzIGEgcGFyZW50IG5vZGUuXG4gICAgICAgIGZyb21Ob2RlLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG1vcnBoZWROb2RlLCBmcm9tTm9kZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vcnBoZWROb2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1vcnBoZG9tO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG4gIC8vIGF0dHJpYnV0ZSBldmVudHMgKGNhbiBiZSBzZXQgd2l0aCBhdHRyaWJ1dGVzKVxuICAnb25jbGljaycsXG4gICdvbmRibGNsaWNrJyxcbiAgJ29ubW91c2Vkb3duJyxcbiAgJ29ubW91c2V1cCcsXG4gICdvbm1vdXNlb3ZlcicsXG4gICdvbm1vdXNlbW92ZScsXG4gICdvbm1vdXNlb3V0JyxcbiAgJ29uZHJhZ3N0YXJ0JyxcbiAgJ29uZHJhZycsXG4gICdvbmRyYWdlbnRlcicsXG4gICdvbmRyYWdsZWF2ZScsXG4gICdvbmRyYWdvdmVyJyxcbiAgJ29uZHJvcCcsXG4gICdvbmRyYWdlbmQnLFxuICAnb25rZXlkb3duJyxcbiAgJ29ua2V5cHJlc3MnLFxuICAnb25rZXl1cCcsXG4gICdvbnVubG9hZCcsXG4gICdvbmFib3J0JyxcbiAgJ29uZXJyb3InLFxuICAnb25yZXNpemUnLFxuICAnb25zY3JvbGwnLFxuICAnb25zZWxlY3QnLFxuICAnb25jaGFuZ2UnLFxuICAnb25zdWJtaXQnLFxuICAnb25yZXNldCcsXG4gICdvbmZvY3VzJyxcbiAgJ29uYmx1cicsXG4gICdvbmlucHV0JyxcbiAgLy8gb3RoZXIgY29tbW9uIGV2ZW50c1xuICAnb25jb250ZXh0bWVudScsXG4gICdvbmZvY3VzaW4nLFxuICAnb25mb2N1c291dCdcbl1cbiIsImltcG9ydCBVdGlscyBmcm9tICcuLi9jb3JlL1V0aWxzJ1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi4vY29yZS9UcmFuc2xhdG9yJ1xuaW1wb3J0IHByZXR0eUJ5dGVzIGZyb20gJ3ByZXR0eS1ieXRlcydcbmltcG9ydCB5byBmcm9tICd5by15bydcbmltcG9ydCBlZSBmcm9tICdldmVudHMnXG5pbXBvcnQgVXBweVNvY2tldCBmcm9tICcuL1VwcHlTb2NrZXQnXG5cbi8qKlxuICogTWFpbiBVcHB5IGNvcmVcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0cyBnZW5lcmFsIG9wdGlvbnMsIGxpa2UgbG9jYWxlcywgdG8gc2hvdyBtb2RhbCBvciBub3QgdG8gc2hvd1xuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb3JlIHtcbiAgY29uc3RydWN0b3IgKG9wdHMpIHtcbiAgICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICAvLyBsb2FkIEVuZ2xpc2ggYXMgdGhlIGRlZmF1bHQgbG9jYWxlc1xuICAgICAgbG9jYWxlczogcmVxdWlyZSgnLi4vbG9jYWxlcy9lbl9VUy5qcycpLFxuICAgICAgYXV0b1Byb2NlZWQ6IHRydWUsXG4gICAgICBkZWJ1ZzogZmFsc2VcbiAgICB9XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuXG4gICAgLy8gRGljdGF0ZXMgaW4gd2hhdCBvcmRlciBkaWZmZXJlbnQgcGx1Z2luIHR5cGVzIGFyZSByYW46XG4gICAgdGhpcy50eXBlcyA9IFsgJ3ByZXNldHRlcicsICdvcmNoZXN0cmF0b3InLCAncHJvZ3Jlc3NpbmRpY2F0b3InLCAnYWNxdWlyZXInLCAndXBsb2FkZXInLCAncHJlc2VudGVyJyBdXG5cbiAgICB0aGlzLnR5cGUgPSAnY29yZSdcblxuICAgIC8vIENvbnRhaW5lciBmb3IgZGlmZmVyZW50IHR5cGVzIG9mIHBsdWdpbnNcbiAgICB0aGlzLnBsdWdpbnMgPSB7fVxuXG4gICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3Ioe2xvY2FsZXM6IHRoaXMub3B0cy5sb2NhbGVzfSlcbiAgICB0aGlzLmkxOG4gPSB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlLmJpbmQodGhpcy50cmFuc2xhdG9yKVxuICAgIHRoaXMuaW5pdFNvY2tldCA9IHRoaXMuaW5pdFNvY2tldC5iaW5kKHRoaXMpXG5cbiAgICB0aGlzLmVtaXR0ZXIgPSBuZXcgZWUuRXZlbnRFbWl0dGVyKClcblxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBmaWxlczoge31cbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRzLmRlYnVnKSB7XG4gICAgICAvLyBmb3IgZGVidWdnaW5nIGFuZCB0ZXN0aW5nXG4gICAgICBnbG9iYWwuVXBweVN0YXRlID0gdGhpcy5zdGF0ZVxuICAgICAgZ2xvYmFsLnVwcHlMb2cgPSAnJ1xuICAgICAgZ2xvYmFsLlVwcHlBZGRGaWxlID0gdGhpcy5hZGRGaWxlLmJpbmQodGhpcylcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSBvbiBhbGwgcGx1Z2lucyBhbmQgcnVuIGB1cGRhdGVgIG9uIHRoZW0uIENhbGxlZCBlYWNoIHRpbWUgd2hlbiBzdGF0ZSBjaGFuZ2VzXG4gICAqXG4gICAqL1xuICB1cGRhdGVBbGwgKCkge1xuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2lucykuZm9yRWFjaCgocGx1Z2luVHlwZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW5zW3BsdWdpblR5cGVdLmZvckVhY2goKHBsdWdpbikgPT4ge1xuICAgICAgICBwbHVnaW4udXBkYXRlKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHN0YXRlXG4gICAqXG4gICAqIEBwYXJhbSB7bmV3U3RhdGV9IG9iamVjdFxuICAgKi9cbiAgc2V0U3RhdGUgKG5ld1N0YXRlKSB7XG4gICAgdGhpcy5sb2coJ1NldHRpbmcgc3RhdGUgdG86ICcpXG4gICAgdGhpcy5sb2cobmV3U3RhdGUpXG4gICAgdGhpcy5zdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUsIG5ld1N0YXRlKVxuICAgIHRoaXMudXBkYXRlQWxsKClcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGN1cnJlbnQgc3RhdGUsIG1ha2luZyBzdXJlIHRvIG1ha2UgYSBjb3B5IG9mIHRoZSBzdGF0ZSBvYmplY3QgYW5kIHBhc3MgdGhhdCxcbiAgICogaW5zdGVhZCBvZiBhbiBhY3R1YWwgcmVmZXJlbmNlIHRvIGB0aGlzLnN0YXRlYFxuICAgKlxuICAgKi9cbiAgZ2V0U3RhdGUgKCkge1xuICAgIHJldHVybiB0aGlzLnN0YXRlXG4gIH1cblxuICBhZGRNZXRhIChtZXRhLCBmaWxlSUQpIHtcbiAgICBpZiAodHlwZW9mIGZpbGVJRCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICBmb3IgKGxldCBmaWxlIGluIHVwZGF0ZWRGaWxlcykge1xuICAgICAgICB1cGRhdGVkRmlsZXNbZmlsZV0ubWV0YSA9IG1ldGFcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICAgIH1cbiAgfVxuXG4gIGFkZEZpbGUgKGZpbGUpIHtcbiAgICBjb25zdCB1cGRhdGVkRmlsZXMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLmZpbGVzKVxuXG4gICAgY29uc3QgZmlsZVR5cGUgPSBmaWxlLnR5cGUuc3BsaXQoJy8nKVxuICAgIGNvbnN0IGZpbGVUeXBlR2VuZXJhbCA9IGZpbGVUeXBlWzBdXG4gICAgY29uc3QgZmlsZVR5cGVTcGVjaWZpYyA9IGZpbGVUeXBlWzFdXG4gICAgY29uc3QgZmlsZUlEID0gVXRpbHMuZ2VuZXJhdGVGaWxlSUQoZmlsZS5uYW1lKVxuXG4gICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0gPSB7XG4gICAgICBzb3VyY2U6IGZpbGUuc291cmNlIHx8ICcnLFxuICAgICAgaWQ6IGZpbGVJRCxcbiAgICAgIG5hbWU6IGZpbGUubmFtZSxcbiAgICAgIHR5cGU6IHtcbiAgICAgICAgZ2VuZXJhbDogZmlsZVR5cGVHZW5lcmFsLFxuICAgICAgICBzcGVjaWZpYzogZmlsZVR5cGVTcGVjaWZpY1xuICAgICAgfSxcbiAgICAgIGRhdGE6IGZpbGUuZGF0YSxcbiAgICAgIHByb2dyZXNzOiAwLFxuICAgICAgdG90YWxTaXplOiBmaWxlLmRhdGEuc2l6ZSA/IHByZXR0eUJ5dGVzKGZpbGUuZGF0YS5zaXplKSA6ICc/JyxcbiAgICAgIHVwbG9hZGVkU2l6ZTogMCxcbiAgICAgIGlzUmVtb3RlOiBmaWxlLmlzUmVtb3RlIHx8IGZhbHNlLFxuICAgICAgcmVtb3RlOiBmaWxlLnJlbW90ZVxuICAgIH1cblxuICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuXG4gICAgaWYgKGZpbGVUeXBlR2VuZXJhbCA9PT0gJ2ltYWdlJykge1xuICAgICAgLy8gdGhpcy5hZGRJbWdQcmV2aWV3VG9GaWxlKHVwZGF0ZWRGaWxlc1tmaWxlSURdKVxuICAgICAgVXRpbHMucmVhZEltYWdlKHVwZGF0ZWRGaWxlc1tmaWxlSURdLmRhdGEsIChpbWdFbCkgPT4ge1xuICAgICAgICBjb25zdCBuZXdJbWFnZVdpZHRoID0gMjAwXG4gICAgICAgIGNvbnN0IG5ld0ltYWdlSGVpZ2h0ID0gVXRpbHMuZ2V0UHJvcG9ydGlvbmFsSW1hZ2VIZWlnaHQoaW1nRWwsIG5ld0ltYWdlV2lkdGgpXG4gICAgICAgIGNvbnN0IHJlc2l6ZWRJbWdTcmMgPSBVdGlscy5yZXNpemVJbWFnZShpbWdFbCwgbmV3SW1hZ2VXaWR0aCwgbmV3SW1hZ2VIZWlnaHQpXG5cbiAgICAgICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5maWxlcylcbiAgICAgICAgdXBkYXRlZEZpbGVzW2ZpbGVJRF0ucHJldmlld0VsID0geW9gPGltZyBhbHQ9XCIke2ZpbGUubmFtZX1cIiBzcmM9XCIke3Jlc2l6ZWRJbWdTcmN9XCI+YFxuICAgICAgICB0aGlzLnNldFN0YXRlKHtmaWxlczogdXBkYXRlZEZpbGVzfSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0cy5hdXRvUHJvY2VlZCkge1xuICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ25leHQnKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgbGlzdGVuZXJzIGZvciBhbGwgZ2xvYmFsIGFjdGlvbnMsIGxpa2U6XG4gICAqIGBmaWxlLWFkZGAsIGBmaWxlLXJlbW92ZWAsIGB1cGxvYWQtcHJvZ3Jlc3NgLCBgcmVzZXRgXG4gICAqXG4gICAqL1xuICBhY3Rpb25zICgpIHtcbiAgICB0aGlzLmVtaXR0ZXIub24oJ2ZpbGUtYWRkJywgKGRhdGEpID0+IHtcbiAgICAgIHRoaXMuYWRkRmlsZShkYXRhKVxuICAgIH0pXG5cbiAgICAvLyBgcmVtb3ZlLWZpbGVgIHJlbW92ZXMgYSBmaWxlIGZyb20gYHN0YXRlLmZpbGVzYCwgZm9yIGV4YW1wbGUgd2hlblxuICAgIC8vIGEgdXNlciBkZWNpZGVzIG5vdCB0byB1cGxvYWQgcGFydGljdWxhciBmaWxlIGFuZCBjbGlja3MgYSBidXR0b24gdG8gcmVtb3ZlIGl0XG4gICAgdGhpcy5lbWl0dGVyLm9uKCdmaWxlLXJlbW92ZScsIChmaWxlSUQpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICBkZWxldGUgdXBkYXRlZEZpbGVzW2ZpbGVJRF1cbiAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICAgIH0pXG5cbiAgICB0aGlzLmVtaXR0ZXIub24oJ3VwbG9hZC1wcm9ncmVzcycsIChkYXRhKSA9PiB7XG4gICAgICBsZXQgcGVyY2VudGFnZSA9IChkYXRhLmJ5dGVzVXBsb2FkZWQgLyBkYXRhLmJ5dGVzVG90YWwgKiAxMDApLnRvRml4ZWQoMilcbiAgICAgIHBlcmNlbnRhZ2UgPSBNYXRoLnJvdW5kKHBlcmNlbnRhZ2UpXG5cbiAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUuZmlsZXMpXG4gICAgICB1cGRhdGVkRmlsZXNbZGF0YS5pZF0ucHJvZ3Jlc3MgPSBwZXJjZW50YWdlXG4gICAgICB1cGRhdGVkRmlsZXNbZGF0YS5pZF0udXBsb2FkZWRTaXplID0gZGF0YS5ieXRlc1VwbG9hZGVkID8gcHJldHR5Qnl0ZXMoZGF0YS5ieXRlc1VwbG9hZGVkKSA6ICc/J1xuXG4gICAgICBjb25zdCBpblByb2dyZXNzID0gT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5tYXAoKGZpbGUpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGUucHJvZ3Jlc3MgIT09IDBcbiAgICAgIH0pXG5cbiAgICAgIC8vIGNhbGN1bGF0ZSB0b3RhbCBwcm9ncmVzcywgdXNpbmcgdGhlIG51bWJlciBvZiBmaWxlcyBjdXJyZW50bHkgdXBsb2FkaW5nLFxuICAgICAgLy8gbXVsdGlwbGllZCBieSAxMDAgYW5kIHRoZSBzdW1tIG9mIGluZGl2aWR1YWwgcHJvZ3Jlc3Mgb2YgZWFjaCBmaWxlXG4gICAgICBjb25zdCBwcm9ncmVzc01heCA9IE9iamVjdC5rZXlzKGluUHJvZ3Jlc3MpLmxlbmd0aCAqIDEwMFxuICAgICAgbGV0IHByb2dyZXNzQWxsID0gMFxuICAgICAgT2JqZWN0LmtleXModXBkYXRlZEZpbGVzKS5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgIHByb2dyZXNzQWxsID0gcHJvZ3Jlc3NBbGwgKyB1cGRhdGVkRmlsZXNbZmlsZV0ucHJvZ3Jlc3NcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IHRvdGFsUHJvZ3Jlc3MgPSBwcm9ncmVzc0FsbCAqIDEwMCAvIHByb2dyZXNzTWF4XG5cbiAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICB0b3RhbFByb2dyZXNzOiB0b3RhbFByb2dyZXNzLFxuICAgICAgICBmaWxlczogdXBkYXRlZEZpbGVzXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICAvLyBgdXBsb2FkLXN1Y2Nlc3NgIGFkZHMgc3VjY2Vzc2Z1bGx5IHVwbG9hZGVkIGZpbGUgdG8gYHN0YXRlLnVwbG9hZGVkRmlsZXNgXG4gICAgLy8gYW5kIGZpcmVzIGByZW1vdmUtZmlsZWAgdG8gcmVtb3ZlIGl0IGZyb20gYHN0YXRlLmZpbGVzYFxuICAgIHRoaXMuZW1pdHRlci5vbigndXBsb2FkLXN1Y2Nlc3MnLCAoZmlsZSkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZEZpbGVzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5maWxlcylcbiAgICAgIHVwZGF0ZWRGaWxlc1tmaWxlLmlkXSA9IGZpbGVcbiAgICAgIHRoaXMuc2V0U3RhdGUoe2ZpbGVzOiB1cGRhdGVkRmlsZXN9KVxuICAgICAgLy8gdGhpcy5sb2codGhpcy5zdGF0ZS51cGxvYWRlZEZpbGVzKVxuICAgICAgLy8gdGhpcy5lbWl0dGVyLmVtaXQoJ2ZpbGUtcmVtb3ZlJywgZmlsZS5pZClcbiAgICB9KVxuICB9XG5cbi8qKlxuICogUmVnaXN0ZXJzIGEgcGx1Z2luIHdpdGggQ29yZVxuICpcbiAqIEBwYXJhbSB7Q2xhc3N9IFBsdWdpbiBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIHRvIFBsdWdpbiBsYXRlclxuICogQHJldHVybiB7T2JqZWN0fSBzZWxmIGZvciBjaGFpbmluZ1xuICovXG4gIHVzZSAoUGx1Z2luLCBvcHRzKSB7XG4gICAgLy8gSW5zdGFudGlhdGVcbiAgICBjb25zdCBwbHVnaW4gPSBuZXcgUGx1Z2luKHRoaXMsIG9wdHMpXG4gICAgY29uc3QgcGx1Z2luTmFtZSA9IHBsdWdpbi5pZFxuICAgIHRoaXMucGx1Z2luc1twbHVnaW4udHlwZV0gPSB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdIHx8IFtdXG5cbiAgICBpZiAoIXBsdWdpbk5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91ciBwbHVnaW4gbXVzdCBoYXZlIGEgbmFtZScpXG4gICAgfVxuXG4gICAgaWYgKCFwbHVnaW4udHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3VyIHBsdWdpbiBtdXN0IGhhdmUgYSB0eXBlJylcbiAgICB9XG5cbiAgICBsZXQgZXhpc3RzUGx1Z2luQWxyZWFkeSA9IHRoaXMuZ2V0UGx1Z2luKHBsdWdpbk5hbWUpXG4gICAgaWYgKGV4aXN0c1BsdWdpbkFscmVhZHkpIHtcbiAgICAgIGxldCBtc2cgPSBgQWxyZWFkeSBmb3VuZCBhIHBsdWdpbiBuYW1lZCAnJHtleGlzdHNQbHVnaW5BbHJlYWR5Lm5hbWV9Jy5cbiAgICAgICAgVHJpZWQgdG8gdXNlOiAnJHtwbHVnaW5OYW1lfScuXG4gICAgICAgIFVwcHkgaXMgY3VycmVudGx5IGxpbWl0ZWQgdG8gcnVubmluZyBvbmUgb2YgZXZlcnkgcGx1Z2luLlxuICAgICAgICBTaGFyZSB5b3VyIHVzZSBjYXNlIHdpdGggdXMgb3ZlciBhdFxuICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vdHJhbnNsb2FkaXQvdXBweS9pc3N1ZXMvXG4gICAgICAgIGlmIHlvdSB3YW50IHVzIHRvIHJlY29uc2lkZXIuYFxuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZylcbiAgICB9XG5cbiAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdLnB1c2gocGx1Z2luKVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4vKipcbiAqIEZpbmQgb25lIFBsdWdpbiBieSBuYW1lXG4gKlxuICogQHBhcmFtIHN0cmluZyBuYW1lIGRlc2NyaXB0aW9uXG4gKi9cbiAgZ2V0UGx1Z2luIChuYW1lKSB7XG4gICAgbGV0IGZvdW5kUGx1Z2luID0gZmFsc2VcbiAgICB0aGlzLml0ZXJhdGVQbHVnaW5zKChwbHVnaW4pID0+IHtcbiAgICAgIGNvbnN0IHBsdWdpbk5hbWUgPSBwbHVnaW4uaWRcbiAgICAgIGlmIChwbHVnaW5OYW1lID09PSBuYW1lKSB7XG4gICAgICAgIGZvdW5kUGx1Z2luID0gcGx1Z2luXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvdW5kUGx1Z2luXG4gIH1cblxuLyoqXG4gKiBJdGVyYXRlIHRocm91Z2ggYWxsIGB1c2VgZCBwbHVnaW5zXG4gKlxuICogQHBhcmFtIGZ1bmN0aW9uIG1ldGhvZCBkZXNjcmlwdGlvblxuICovXG4gIGl0ZXJhdGVQbHVnaW5zIChtZXRob2QpIHtcbiAgICBPYmplY3Qua2V5cyh0aGlzLnBsdWdpbnMpLmZvckVhY2goKHBsdWdpblR5cGUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luc1twbHVnaW5UeXBlXS5mb3JFYWNoKG1ldGhvZClcbiAgICB9KVxuICB9XG5cbi8qKlxuICogTG9ncyBzdHVmZiB0byBjb25zb2xlLCBvbmx5IGlmIGBkZWJ1Z2AgaXMgc2V0IHRvIHRydWUuIFNpbGVudCBpbiBwcm9kdWN0aW9uLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ3xPYmplY3R9IHRvIGxvZ1xuICovXG4gIGxvZyAobXNnKSB7XG4gICAgaWYgKCF0aGlzLm9wdHMuZGVidWcpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAobXNnID09PSBgJHttc2d9YCkge1xuICAgICAgY29uc29sZS5sb2coYExPRzogJHttc2d9YClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coJ0xPR+KGkycpXG4gICAgICBjb25zb2xlLmRpcihtc2cpXG4gICAgfVxuICAgIGdsb2JhbC51cHB5TG9nID0gZ2xvYmFsLnVwcHlMb2cgKyAnXFxuJyArICdERUJVRyBMT0c6ICcgKyBtc2dcbiAgfVxuXG4vKipcbiAqIFJ1bnMgYWxsIHBsdWdpbnMgb2YgdGhlIHNhbWUgdHlwZSBpbiBwYXJhbGxlbFxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIHRoYXQgd2FudHMgdG8gc2V0IHByb2dyZXNzXG4gKiBAcGFyYW0ge2FycmF5fSBmaWxlc1xuICogQHJldHVybiB7UHJvbWlzZX0gb2YgYWxsIG1ldGhvZHNcbiAqL1xuICBydW5UeXBlICh0eXBlLCBtZXRob2QsIGZpbGVzKSB7XG4gICAgY29uc3QgbWV0aG9kcyA9IHRoaXMucGx1Z2luc1t0eXBlXS5tYXAoXG4gICAgICAocGx1Z2luKSA9PiBwbHVnaW5bbWV0aG9kXShVdGlscy5mbGF0dGVuKGZpbGVzKSlcbiAgICApXG5cbiAgICByZXR1cm4gUHJvbWlzZS5hbGwobWV0aG9kcylcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZXJyb3IpKVxuICB9XG5cbi8qKlxuICogUnVucyBhIHdhdGVyZmFsbCBvZiBydW5UeXBlIHBsdWdpbiBwYWNrcywgbGlrZSBzbzpcbiAqIEFsbCBwcmVzZXRlcnMoZGF0YSkgLS0+IEFsbCBhY3F1aXJlcnMoZGF0YSkgLS0+IEFsbCB1cGxvYWRlcnMoZGF0YSkgLS0+IGRvbmVcbiAqL1xuICBydW4gKCkge1xuICAgIHRoaXMubG9nKCdDb3JlIGlzIHJ1biwgaW5pdGlhbGl6aW5nIGFjdGlvbnMsIGluc3RhbGxpbmcgcGx1Z2lucy4uLicpXG5cbiAgICB0aGlzLmFjdGlvbnMoKVxuXG4gICAgLy8gRm9yc2Ugc2V0IGBhdXRvUHJvY2VlZGAgb3B0aW9uIHRvIGZhbHNlIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBzZWxlY3RvciBQbHVnaW5zIGFjdGl2ZVxuICAgIGlmICh0aGlzLnBsdWdpbnMuYWNxdWlyZXIgJiYgdGhpcy5wbHVnaW5zLmFjcXVpcmVyLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMub3B0cy5hdXRvUHJvY2VlZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgLy8gSW5zdGFsbCBhbGwgcGx1Z2luc1xuICAgIE9iamVjdC5rZXlzKHRoaXMucGx1Z2lucykuZm9yRWFjaCgocGx1Z2luVHlwZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW5zW3BsdWdpblR5cGVdLmZvckVhY2goKHBsdWdpbikgPT4ge1xuICAgICAgICBwbHVnaW4uaW5zdGFsbCgpXG4gICAgICB9KVxuICAgIH0pXG5cbiAgICByZXR1cm5cblxuICAgIC8vIEVhY2ggUGx1Z2luIGNhbiBoYXZlIGBydW5gIGFuZC9vciBgaW5zdGFsbGAgbWV0aG9kcy5cbiAgICAvLyBgaW5zdGFsbGAgYWRkcyBldmVudCBsaXN0ZW5lcnMgYW5kIGRvZXMgc29tZSBub24tYmxvY2tpbmcgd29yaywgdXNlZnVsIGZvciBgcHJvZ3Jlc3NpbmRpY2F0b3JgLFxuICAgIC8vIGBydW5gIHdhaXRzIGZvciB0aGUgcHJldmlvdXMgc3RlcCB0byBmaW5pc2ggKHVzZXIgc2VsZWN0cyBmaWxlcykgYmVmb3JlIHByb2NlZWRpbmdcbiAgICAvLyBbJ2luc3RhbGwnLCAncnVuJ10uZm9yRWFjaCgobWV0aG9kKSA9PiB7XG4gICAgLy8gICAvLyBGaXJzdCB3ZSBzZWxlY3Qgb25seSBwbHVnaW5zIG9mIGN1cnJlbnQgdHlwZSxcbiAgICAvLyAgIC8vIHRoZW4gY3JlYXRlIGFuIGFycmF5IG9mIHJ1blR5cGUgbWV0aG9kcyBvZiB0aGlzIHBsdWdpbnNcbiAgICAvLyAgIGNvbnN0IHR5cGVNZXRob2RzID0gdGhpcy50eXBlcy5maWx0ZXIoKHR5cGUpID0+IHRoaXMucGx1Z2luc1t0eXBlXSlcbiAgICAvLyAgICAgLm1hcCgodHlwZSkgPT4gdGhpcy5ydW5UeXBlLmJpbmQodGhpcywgdHlwZSwgbWV0aG9kKSlcbiAgICAvLyAgIC8vIFJ1biB3YXRlcmZhbGwgb2YgdHlwZU1ldGhvZHNcbiAgICAvLyAgIHJldHVybiBVdGlscy5wcm9taXNlV2F0ZXJmYWxsKHR5cGVNZXRob2RzKVxuICAgIC8vICAgICAudGhlbigocmVzdWx0KSA9PiB7XG4gICAgLy8gICAgICAgLy8gSWYgcmVzdWx0cyBhcmUgZW1wdHksIGRvbid0IGxvZyB1cGxvYWQgcmVzdWx0cy4gSGFzbid0IHJ1biB5ZXQuXG4gICAgLy8gICAgICAgaWYgKHJlc3VsdFswXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gICAgICAgICB0aGlzLmxvZyhyZXN1bHQpXG4gICAgLy8gICAgICAgICB0aGlzLmxvZygnVXBsb2FkIHJlc3VsdCAtPiBzdWNjZXNzIScpXG4gICAgLy8gICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgLy8gICAgICAgfVxuICAgIC8vICAgICB9KVxuICAgIC8vICAgICAuY2F0Y2goKGVycm9yKSA9PiB0aGlzLmxvZygnVXBsb2FkIHJlc3VsdCAtPiBmYWlsZWQ6JywgZXJyb3IpKVxuICAgIC8vIH0pXG4gIH1cblxuICBpbml0U29ja2V0IChvcHRzKSB7XG4gICAgaWYgKCF0aGlzLnNvY2tldCkge1xuICAgICAgdGhpcy5zb2NrZXQgPSBuZXcgVXBweVNvY2tldChvcHRzKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnNvY2tldFxuICB9XG59XG4iLCIvKipcbiAqIFRyYW5zbGF0ZXMgc3RyaW5ncyB3aXRoIGludGVycG9sYXRpb24gJiBwbHVyYWxpemF0aW9uIHN1cHBvcnQuRXh0ZW5zaWJsZSB3aXRoIGN1c3RvbSBkaWN0aW9uYXJpZXNcbiAqIGFuZCBwbHVyYWxpemF0aW9uIGZ1bmN0aW9ucy5cbiAqXG4gKiBCb3Jyb3dzIGhlYXZpbHkgZnJvbSBhbmQgaW5zcGlyZWQgYnkgUG9seWdsb3QgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcyxcbiAqIGJhc2ljYWxseSBhIHN0cmlwcGVkLWRvd24gdmVyc2lvbiBvZiBpdC4gRGlmZmVyZW5jZXM6IHBsdXJhbGl6YXRpb24gZnVuY3Rpb25zIGFyZSBub3QgaGFyZGNvZGVkXG4gKiBhbmQgY2FuIGJlIGVhc2lseSBhZGRlZCBhbW9uZyB3aXRoIGRpY3Rpb25hcmllcywgbmVzdGVkIG9iamVjdHMgYXJlIHVzZWQgZm9yIHBsdXJhbGl6YXRpb25cbiAqIGFzIG9wcG9zZWQgdG8gYHx8fHxgIGRlbGltZXRlclxuICpcbiAqIFVzYWdlIGV4YW1wbGU6IGB0cmFuc2xhdG9yLnRyYW5zbGF0ZSgnZmlsZXNfY2hvc2VuJywge3NtYXJ0X2NvdW50OiAzfSlgXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9wdHNcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHJhbnNsYXRvciB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7fVxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuICB9XG5cbi8qKlxuICogVGFrZXMgYSBzdHJpbmcgd2l0aCBwbGFjZWhvbGRlciB2YXJpYWJsZXMgbGlrZSBgJXtzbWFydF9jb3VudH0gZmlsZSBzZWxlY3RlZGBcbiAqIGFuZCByZXBsYWNlcyBpdCB3aXRoIHZhbHVlcyBmcm9tIG9wdGlvbnMgYHtzbWFydF9jb3VudDogNX1gXG4gKlxuICogQGxpY2Vuc2UgaHR0cHM6Ly9naXRodWIuY29tL2FpcmJuYi9wb2x5Z2xvdC5qcy9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKiB0YWtlbiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9haXJibmIvcG9seWdsb3QuanMvYmxvYi9tYXN0ZXIvbGliL3BvbHlnbG90LmpzI0wyOTlcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gcGhyYXNlIHRoYXQgbmVlZHMgaW50ZXJwb2xhdGlvbiwgd2l0aCBwbGFjZWhvbGRlcnNcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHdpdGggdmFsdWVzIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHJlcGxhY2UgcGxhY2Vob2xkZXJzXG4gKiBAcmV0dXJuIHtzdHJpbmd9IGludGVycG9sYXRlZFxuICovXG4gIGludGVycG9sYXRlIChwaHJhc2UsIG9wdGlvbnMpIHtcbiAgICBjb25zdCByZXBsYWNlID0gU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlXG4gICAgY29uc3QgZG9sbGFyUmVnZXggPSAvXFwkL2dcbiAgICBjb25zdCBkb2xsYXJCaWxsc1lhbGwgPSAnJCQkJCdcblxuICAgIGZvciAobGV0IGFyZyBpbiBvcHRpb25zKSB7XG4gICAgICBpZiAoYXJnICE9PSAnXycgJiYgb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShhcmcpKSB7XG4gICAgICAgIC8vIEVuc3VyZSByZXBsYWNlbWVudCB2YWx1ZSBpcyBlc2NhcGVkIHRvIHByZXZlbnQgc3BlY2lhbCAkLXByZWZpeGVkXG4gICAgICAgIC8vIHJlZ2V4IHJlcGxhY2UgdG9rZW5zLiB0aGUgXCIkJCQkXCIgaXMgbmVlZGVkIGJlY2F1c2UgZWFjaCBcIiRcIiBuZWVkcyB0b1xuICAgICAgICAvLyBiZSBlc2NhcGVkIHdpdGggXCIkXCIgaXRzZWxmLCBhbmQgd2UgbmVlZCB0d28gaW4gdGhlIHJlc3VsdGluZyBvdXRwdXQuXG4gICAgICAgIHZhciByZXBsYWNlbWVudCA9IG9wdGlvbnNbYXJnXVxuICAgICAgICBpZiAodHlwZW9mIHJlcGxhY2VtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJlcGxhY2VtZW50ID0gcmVwbGFjZS5jYWxsKG9wdGlvbnNbYXJnXSwgZG9sbGFyUmVnZXgsIGRvbGxhckJpbGxzWWFsbClcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSBjcmVhdGUgYSBuZXcgYFJlZ0V4cGAgZWFjaCB0aW1lIGluc3RlYWQgb2YgdXNpbmcgYSBtb3JlLWVmZmljaWVudFxuICAgICAgICAvLyBzdHJpbmcgcmVwbGFjZSBzbyB0aGF0IHRoZSBzYW1lIGFyZ3VtZW50IGNhbiBiZSByZXBsYWNlZCBtdWx0aXBsZSB0aW1lc1xuICAgICAgICAvLyBpbiB0aGUgc2FtZSBwaHJhc2UuXG4gICAgICAgIHBocmFzZSA9IHJlcGxhY2UuY2FsbChwaHJhc2UsIG5ldyBSZWdFeHAoJyVcXFxceycgKyBhcmcgKyAnXFxcXH0nLCAnZycpLCByZXBsYWNlbWVudClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBocmFzZVxuICB9XG5cbi8qKlxuICogUHVibGljIHRyYW5zbGF0ZSBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyB3aXRoIHZhbHVlcyB0aGF0IHdpbGwgYmUgdXNlZCBsYXRlciB0byByZXBsYWNlIHBsYWNlaG9sZGVycyBpbiBzdHJpbmdcbiAqIEByZXR1cm4ge3N0cmluZ30gdHJhbnNsYXRlZCAoYW5kIGludGVycG9sYXRlZClcbiAqL1xuICB0cmFuc2xhdGUgKGtleSwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuc21hcnRfY291bnQpIHtcbiAgICAgIHZhciBwbHVyYWwgPSB0aGlzLm9wdHMubG9jYWxlcy5wbHVyYWxpemUob3B0aW9ucy5zbWFydF9jb3VudClcbiAgICAgIHJldHVybiB0aGlzLmludGVycG9sYXRlKHRoaXMub3B0cy5sb2NhbGVzLnN0cmluZ3Nba2V5XVtwbHVyYWxdLCBvcHRpb25zKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmludGVycG9sYXRlKHRoaXMub3B0cy5sb2NhbGVzLnN0cmluZ3Nba2V5XSwgb3B0aW9ucylcbiAgfVxufVxuIiwiaW1wb3J0IGVlIGZyb20gJ2V2ZW50cydcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVXBweVNvY2tldCB7XG4gIGNvbnN0cnVjdG9yIChvcHRzKSB7XG4gICAgdGhpcy5xdWV1ZWQgPSBbXVxuICAgIHRoaXMuaXNPcGVuID0gZmFsc2VcbiAgICB0aGlzLnNvY2tldCA9IG5ldyBXZWJTb2NrZXQob3B0cy50YXJnZXQpXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IGVlLkV2ZW50RW1pdHRlcigpXG5cbiAgICB0aGlzLnNvY2tldC5vbm9wZW4gPSAoZSkgPT4ge1xuICAgICAgdGhpcy5pc09wZW4gPSB0cnVlXG5cbiAgICAgIHdoaWxlICh0aGlzLnF1ZXVlZC5sZW5ndGggPiAwICYmIHRoaXMuaXNPcGVuKSB7XG4gICAgICAgIGNvbnN0IGZpcnN0ID0gdGhpcy5xdWV1ZWRbMF1cbiAgICAgICAgdGhpcy5zZW5kKGZpcnN0LmFjdGlvbiwgZmlyc3QucGF5bG9hZClcbiAgICAgICAgdGhpcy5xdWV1ZWQgPSB0aGlzLnF1ZXVlZC5zbGljZSgxKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc29ja2V0Lm9uY2xvc2UgPSAoZSkgPT4ge1xuICAgICAgdGhpcy5pc09wZW4gPSBmYWxzZVxuICAgIH1cblxuICAgIHRoaXMuX2hhbmRsZU1lc3NhZ2UgPSB0aGlzLl9oYW5kbGVNZXNzYWdlLmJpbmQodGhpcylcblxuICAgIHRoaXMuc29ja2V0Lm9ubWVzc2FnZSA9IHRoaXMuX2hhbmRsZU1lc3NhZ2VcblxuICAgIHRoaXMuZW1pdCA9IHRoaXMuZW1pdC5iaW5kKHRoaXMpXG4gICAgdGhpcy5vbiA9IHRoaXMub24uYmluZCh0aGlzKVxuICAgIHRoaXMub25jZSA9IHRoaXMub25jZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5zZW5kID0gdGhpcy5zZW5kLmJpbmQodGhpcylcbiAgfVxuXG4gIHNlbmQgKGFjdGlvbiwgcGF5bG9hZCkge1xuICAgIC8vIGF0dGFjaCB1dWlkXG5cbiAgICBpZiAoIXRoaXMuaXNPcGVuKSB7XG4gICAgICB0aGlzLnF1ZXVlZC5wdXNoKHthY3Rpb24sIHBheWxvYWR9KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdGhpcy5zb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICBhY3Rpb24sXG4gICAgICBwYXlsb2FkXG4gICAgfSkpXG4gIH1cblxuICBvbiAoYWN0aW9uLCBoYW5kbGVyKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9uKGFjdGlvbiwgaGFuZGxlcilcbiAgfVxuXG4gIGVtaXQgKGFjdGlvbiwgcGF5bG9hZCkge1xuICAgIHRoaXMuZW1pdHRlci5lbWl0KGFjdGlvbiwgcGF5bG9hZClcbiAgfVxuXG4gIG9uY2UgKGFjdGlvbiwgaGFuZGxlcikge1xuICAgIHRoaXMuZW1pdHRlci5vbmNlKGFjdGlvbiwgaGFuZGxlcilcbiAgfVxuXG4gIF9oYW5kbGVNZXNzYWdlIChlKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnBhcnNlKGUuZGF0YSlcbiAgICAgIHRoaXMuZW1pdChtZXNzYWdlLmFjdGlvbiwgbWVzc2FnZS5wYXlsb2FkKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2Ygc21hbGwgdXRpbGl0eSBmdW5jdGlvbnMgdGhhdCBoZWxwIHdpdGggZG9tIG1hbmlwdWxhdGlvbiwgYWRkaW5nIGxpc3RlbmVycyxcbiAqIHByb21pc2VzIGFuZCBvdGhlciBnb29kIHRoaW5ncy5cbiAqXG4gKiBAbW9kdWxlIFV0aWxzXG4gKi9cblxuLyoqXG4gKiBSdW5zIGEgd2F0ZXJmYWxsIG9mIHByb21pc2VzOiBjYWxscyBlYWNoIHRhc2ssIHBhc3NpbmcgdGhlIHJlc3VsdFxuICogZnJvbSB0aGUgcHJldmlvdXMgb25lIGFzIGFuIGFyZ3VtZW50LiBUaGUgZmlyc3QgdGFzayBpcyBydW4gd2l0aCBhbiBlbXB0eSBhcnJheS5cbiAqXG4gKiBAbWVtYmVyb2YgVXRpbHNcbiAqIEBwYXJhbSB7YXJyYXl9IG1ldGhvZHMgb2YgUHJvbWlzZXMgdG8gcnVuIHdhdGVyZmFsbCBvblxuICogQHJldHVybiB7UHJvbWlzZX0gb2YgdGhlIGZpbmFsIHRhc2tcbiAqL1xuZnVuY3Rpb24gcHJvbWlzZVdhdGVyZmFsbCAobWV0aG9kcykge1xuICBjb25zdCBbcmVzb2x2ZWRQcm9taXNlLCAuLi50YXNrc10gPSBtZXRob2RzXG4gIGNvbnN0IGZpbmFsVGFza1Byb21pc2UgPSB0YXNrcy5yZWR1Y2UoKHByZXZUYXNrUHJvbWlzZSwgdGFzaykgPT4ge1xuICAgIHJldHVybiBwcmV2VGFza1Byb21pc2UudGhlbih0YXNrKVxuICB9LCByZXNvbHZlZFByb21pc2UoW10pKSAvLyBpbml0aWFsIHZhbHVlXG5cbiAgcmV0dXJuIGZpbmFsVGFza1Byb21pc2Vcbn1cblxuLyoqXG4gKiBTaGFsbG93IGZsYXR0ZW4gbmVzdGVkIGFycmF5cy5cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbiAoYXJyKSB7XG4gIHJldHVybiBbXS5jb25jYXQuYXBwbHkoW10sIGFycilcbn1cblxuLyoqXG4gKiBgcXVlcnlTZWxlY3RvckFsbGAgdGhhdCByZXR1cm5zIGEgbm9ybWFsIGFycmF5IGluc3RlYWQgb2YgZmlsZUxpc3RcbiAqL1xuZnVuY3Rpb24gcXNhIChzZWxlY3RvciwgY29udGV4dCkge1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoKGNvbnRleHQgfHwgZG9jdW1lbnQpLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpIHx8IFtdKVxufVxuXG4vKipcbiAqIFBhcnRpdGlvbiBhcnJheSBieSBhIGdyb3VwaW5nIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7W3R5cGVdfSBhcnJheSAgICAgIElucHV0IGFycmF5XG4gKiBAcGFyYW0gIHtbdHlwZV19IGdyb3VwaW5nRm4gR3JvdXBpbmcgZnVuY3Rpb25cbiAqIEByZXR1cm4ge1t0eXBlXX0gICAgICAgICAgICBBcnJheSBvZiBhcnJheXNcbiAqL1xuZnVuY3Rpb24gZ3JvdXBCeSAoYXJyYXksIGdyb3VwaW5nRm4pIHtcbiAgcmV0dXJuIGFycmF5LnJlZHVjZSgocmVzdWx0LCBpdGVtKSA9PiB7XG4gICAgbGV0IGtleSA9IGdyb3VwaW5nRm4oaXRlbSlcbiAgICBsZXQgeHMgPSByZXN1bHQuZ2V0KGtleSkgfHwgW11cbiAgICB4cy5wdXNoKGl0ZW0pXG4gICAgcmVzdWx0LnNldChrZXksIHhzKVxuICAgIHJldHVybiByZXN1bHRcbiAgfSwgbmV3IE1hcCgpKVxufVxuXG4vKipcbiAqIFRlc3RzIGlmIGV2ZXJ5IGFycmF5IGVsZW1lbnQgcGFzc2VzIHByZWRpY2F0ZVxuICogQHBhcmFtICB7QXJyYXl9ICBhcnJheSAgICAgICBJbnB1dCBhcnJheVxuICogQHBhcmFtICB7T2JqZWN0fSBwcmVkaWNhdGVGbiBQcmVkaWNhdGVcbiAqIEByZXR1cm4ge2Jvb2x9ICAgICAgICAgICAgICAgRXZlcnkgZWxlbWVudCBwYXNzXG4gKi9cbmZ1bmN0aW9uIGV2ZXJ5IChhcnJheSwgcHJlZGljYXRlRm4pIHtcbiAgcmV0dXJuIGFycmF5LnJlZHVjZSgocmVzdWx0LCBpdGVtKSA9PiB7XG4gICAgaWYgKCFyZXN1bHQpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHJldHVybiBwcmVkaWNhdGVGbihpdGVtKVxuICB9LCB0cnVlKVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGxpc3QgaW50byBhcnJheVxuKi9cbmZ1bmN0aW9uIHRvQXJyYXkgKGxpc3QpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGxpc3QgfHwgW10sIDApXG59XG5cbi8qKlxuICogVGFrZXMgYSBmaWxlTmFtZSBhbmQgdHVybnMgaXQgaW50byBmaWxlSUQsIGJ5IGNvbnZlcnRpbmcgdG8gbG93ZXJjYXNlLFxuICogcmVtb3ZpbmcgZXh0cmEgY2hhcmFjdGVycyBhbmQgYWRkaW5nIHVuaXggdGltZXN0YW1wXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpbGVOYW1lXG4gKlxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbGVJRCAoZmlsZU5hbWUpIHtcbiAgbGV0IGZpbGVJRCA9IGZpbGVOYW1lLnRvTG93ZXJDYXNlKClcbiAgZmlsZUlEID0gZmlsZUlELnJlcGxhY2UoL1teQS1aMC05XS9pZywgJycpXG4gIGZpbGVJRCA9IGZpbGVJRCArIERhdGUubm93KClcbiAgcmV0dXJuIGZpbGVJRFxufVxuXG5mdW5jdGlvbiBleHRlbmQgKC4uLm9ianMpIHtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24uYXBwbHkodGhpcywgW3t9XS5jb25jYXQob2JqcykpXG59XG5cbi8qKlxuICogVGFrZXMgZnVuY3Rpb24gb3IgY2xhc3MsIHJldHVybnMgaXRzIG5hbWUuXG4gKiBCZWNhdXNlIElFIGRvZXNu4oCZdCBzdXBwb3J0IGBjb25zdHJ1Y3Rvci5uYW1lYC5cbiAqIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2Rma2F5ZS82Mzg0NDM5LCBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNTcxNDQ0NVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBmbiDigJQgZnVuY3Rpb25cbiAqXG4gKi9cbmZ1bmN0aW9uIGdldEZuTmFtZSAoZm4pIHtcbiAgdmFyIGYgPSB0eXBlb2YgZm4gPT09ICdmdW5jdGlvbidcbiAgdmFyIHMgPSBmICYmICgoZm4ubmFtZSAmJiBbJycsIGZuLm5hbWVdKSB8fCBmbi50b1N0cmluZygpLm1hdGNoKC9mdW5jdGlvbiAoW15cXChdKykvKSlcbiAgcmV0dXJuICghZiAmJiAnbm90IGEgZnVuY3Rpb24nKSB8fCAocyAmJiBzWzFdIHx8ICdhbm9ueW1vdXMnKVxufVxuXG4vKipcbiAqIFJlYWRzIGltYWdlIGFzIGRhdGEgVVJJIGZyb20gZmlsZSBvYmplY3QsXG4gKiB0aGUgb25lIHlvdSBnZXQgZnJvbSBpbnB1dFt0eXBlPWZpbGVdIG9yIGRyYWcgJiBkcm9wLlxuICogVGhpcyB3aWxsIG9ubHkgcmVhZCBpbWFnZSBmaWxlcywgc2tpcHBpbmcgb3RoZXJzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGltZ09iamVjdFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgY2FsbGJhY2sgdGhhdCB3aWxsIGJlIGNhbGxlZCBvbmNlIHRoZSBpbWFnZSBpcyByZWFkXG4gKlxuICovXG5mdW5jdGlvbiByZWFkSW1hZ2UgKGltZ09iamVjdCwgY2IpIHtcbiAgLy8gaWYgKCFpbWdPYmplY3QudHlwZS5tYXRjaCgvaW1hZ2UuKi8pKSB7XG4gIC8vICAgY29uc29sZS5sb2coJ1RoZSBmaWxlIGlzIG5vdCBhbiBpbWFnZTogJywgaW1nT2JqZWN0LnR5cGUpXG4gIC8vICAgcmV0dXJuXG4gIC8vIH1cblxuICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICByZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChldikge1xuICAgIHZhciBpbWdTcmNCYXNlNjQgPSBldi50YXJnZXQucmVzdWx0XG4gICAgdmFyIGltZyA9IG5ldyBJbWFnZSgpXG4gICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBjYihpbWcpXG4gICAgfVxuICAgIGltZy5zcmMgPSBpbWdTcmNCYXNlNjRcbiAgfSlcbiAgcmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgIGNvbnNvbGUubG9nKCdGaWxlUmVhZGVyIGVycm9yJyArIGVycilcbiAgfSlcbiAgcmVhZGVyLnJlYWRBc0RhdGFVUkwoaW1nT2JqZWN0KVxufVxuXG5mdW5jdGlvbiBnZXRQcm9wb3J0aW9uYWxJbWFnZUhlaWdodCAoaW1nLCBuZXdXaWR0aCkge1xuICB2YXIgYXNwZWN0ID0gaW1nLndpZHRoIC8gaW1nLmhlaWdodFxuICB2YXIgbmV3SGVpZ2h0ID0gTWF0aC5yb3VuZChuZXdXaWR0aCAvIGFzcGVjdClcbiAgcmV0dXJuIG5ld0hlaWdodFxufVxuXG4vKipcbiAqIFJlc2l6ZXMgYW4gaW1hZ2UgdG8gc3BlY2lmaWVkIHdpZHRoIGFuZCBoZWlnaHQsIHVzaW5nIGNhbnZhc1xuICogU2VlIGh0dHBzOi8vZGF2aWR3YWxzaC5uYW1lL3Jlc2l6ZS1pbWFnZS1jYW52YXNcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW1nIGVsZW1lbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSB3aWR0aCBvZiB0aGUgcmVzdWx0aW5nIGltYWdlXG4gKiBAcGFyYW0ge1N0cmluZ30gaGVpZ2h0IG9mIHRoZSByZXN1bHRpbmcgaW1hZ2VcbiAqIEByZXR1cm4ge1N0cmluZ30gZGF0YVVSTCBvZiB0aGUgcmVzaXplZCBpbWFnZVxuICovXG5mdW5jdGlvbiByZXNpemVJbWFnZSAoaW1nLCB3aWR0aCwgaGVpZ2h0KSB7XG4gIC8vIGNyZWF0ZSBhbiBvZmYtc2NyZWVuIGNhbnZhc1xuICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cbiAgLy8gc2V0IGl0cyBkaW1lbnNpb24gdG8gdGFyZ2V0IHNpemVcbiAgY2FudmFzLndpZHRoID0gd2lkdGhcbiAgY2FudmFzLmhlaWdodCA9IGhlaWdodFxuXG4gIC8vIGRyYXcgc291cmNlIGltYWdlIGludG8gdGhlIG9mZi1zY3JlZW4gY2FudmFzOlxuICBjdHguZHJhd0ltYWdlKGltZywgMCwgMCwgd2lkdGgsIGhlaWdodClcblxuICAvLyBlbmNvZGUgaW1hZ2UgdG8gZGF0YS11cmkgd2l0aCBiYXNlNjQgdmVyc2lvbiBvZiBjb21wcmVzc2VkIGltYWdlXG4gIC8vIGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL2pwZWcnLCBxdWFsaXR5KTsgIC8vIHF1YWxpdHkgPSBbMC4wLCAxLjBdXG4gIHJldHVybiBjYW52YXMudG9EYXRhVVJMKClcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBwcm9taXNlV2F0ZXJmYWxsLFxuICBnZW5lcmF0ZUZpbGVJRCxcbiAgZ2V0Rm5OYW1lLFxuICB0b0FycmF5LFxuICBldmVyeSxcbiAgZmxhdHRlbixcbiAgZ3JvdXBCeSxcbiAgcXNhLFxuICBleHRlbmQsXG4gIHJlYWRJbWFnZSxcbiAgcmVzaXplSW1hZ2UsXG4gIGdldFByb3BvcnRpb25hbEltYWdlSGVpZ2h0XG59XG4iLCJjb25zdCBlbl9VUyA9IHt9XG5cbmVuX1VTLnN0cmluZ3MgPSB7XG4gIGNob29zZUZpbGU6ICdDaG9vc2UgYSBmaWxlJyxcbiAgeW91SGF2ZUNob3NlbjogJ1lvdSBoYXZlIGNob3NlbjogJXtmaWxlTmFtZX0nLFxuICBvckRyYWdEcm9wOiAnb3IgZHJhZyBpdCBoZXJlJyxcbiAgZmlsZXNDaG9zZW46IHtcbiAgICAwOiAnJXtzbWFydF9jb3VudH0gZmlsZSBzZWxlY3RlZCcsXG4gICAgMTogJyV7c21hcnRfY291bnR9IGZpbGVzIHNlbGVjdGVkJ1xuICB9LFxuICBmaWxlc1VwbG9hZGVkOiB7XG4gICAgMDogJyV7c21hcnRfY291bnR9IGZpbGUgdXBsb2FkZWQnLFxuICAgIDE6ICcle3NtYXJ0X2NvdW50fSBmaWxlcyB1cGxvYWRlZCdcbiAgfSxcbiAgZmlsZXM6IHtcbiAgICAwOiAnJXtzbWFydF9jb3VudH0gZmlsZScsXG4gICAgMTogJyV7c21hcnRfY291bnR9IGZpbGVzJ1xuICB9LFxuICB1cGxvYWRGaWxlczoge1xuICAgIDA6ICdVcGxvYWQgJXtzbWFydF9jb3VudH0gZmlsZScsXG4gICAgMTogJ1VwbG9hZCAle3NtYXJ0X2NvdW50fSBmaWxlcydcbiAgfSxcbiAgc2VsZWN0VG9VcGxvYWQ6ICdTZWxlY3QgZmlsZXMgdG8gdXBsb2FkJyxcbiAgY2xvc2VNb2RhbDogJ0Nsb3NlIE1vZGFsJyxcbiAgdXBsb2FkOiAnVXBsb2FkJ1xufVxuXG5lbl9VUy5wbHVyYWxpemUgPSBmdW5jdGlvbiAobikge1xuICBpZiAobiA9PT0gMSkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgcmV0dXJuIDFcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cuVXBweSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgd2luZG93LlVwcHkubG9jYWxlcy5lbl9VUyA9IGVuX1VTXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZW5fVVNcbiIsImltcG9ydCBQbHVnaW4gZnJvbSAnLi9QbHVnaW4nXG5pbXBvcnQgVXRpbHMgZnJvbSAnLi4vY29yZS9VdGlscydcbmltcG9ydCBkcmFnRHJvcCBmcm9tICdkcmFnLWRyb3AnXG5pbXBvcnQgeW8gZnJvbSAneW8teW8nXG5cbi8qKlxuICogRHJhZyAmIERyb3AgcGx1Z2luXG4gKlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEcmFnRHJvcCBleHRlbmRzIFBsdWdpbiB7XG4gIGNvbnN0cnVjdG9yIChjb3JlLCBvcHRzKSB7XG4gICAgc3VwZXIoY29yZSwgb3B0cylcbiAgICB0aGlzLnR5cGUgPSAnYWNxdWlyZXInXG4gICAgdGhpcy5pZCA9ICdEcmFnRHJvcCdcbiAgICB0aGlzLnRpdGxlID0gJ0RyYWcgJiBEcm9wJ1xuICAgIHRoaXMuaWNvbiA9IHlvYFxuICAgICAgPHN2ZyBjbGFzcz1cIlVwcHlJY29uIFVwcHlNb2RhbFRhYi1pY29uXCIgd2lkdGg9XCIyOFwiIGhlaWdodD1cIjI4XCIgdmlld0JveD1cIjAgMCAxNiAxNlwiPlxuICAgICAgICA8cGF0aCBkPVwiTTE1Ljk4MiAyLjk3YzAtLjAyIDAtLjAyLS4wMTgtLjAzNyAwLS4wMTctLjAxNy0uMDM1LS4wMzUtLjA1MyAwIDAgMC0uMDE4LS4wMi0uMDE4LS4wMTctLjAxOC0uMDM0LS4wNTMtLjA1Mi0uMDdMMTMuMTkuMTIzYy0uMDE3LS4wMTctLjAzNC0uMDM1LS4wNy0uMDUzaC0uMDE4Yy0uMDE4LS4wMTctLjAzNS0uMDE3LS4wNTMtLjAzNGgtLjAyYy0uMDE3IDAtLjAzNC0uMDE4LS4wNTItLjAxOGgtNi4zMWEuNDE1LjQxNSAwIDAgMC0uNDQ2LjQyNlYxMS4xMWMwIC4yNS4xOTYuNDQ2LjQ0NS40NDZoOC44OUEuNDQuNDQgMCAwIDAgMTYgMTEuMTFWMy4wMjNjLS4wMTgtLjAxOC0uMDE4LS4wMzUtLjAxOC0uMDUzem0tMi42NS0xLjQ2bDEuMTU3IDEuMTU3aC0xLjE1N1YxLjUxem0xLjc4IDkuMTU3aC04Vi44OWg1LjMzMnYyLjIyYzAgLjI1LjE5Ni40NDYuNDQ1LjQ0NmgyLjIydjcuMTF6XCIvPlxuICAgICAgICA8cGF0aCBkPVwiTTkuNzc4IDEyLjg5SDRWMi42NjZhLjQ0LjQ0IDAgMCAwLS40NDQtLjQ0NS40NC40NCAwIDAgMC0uNDQ1LjQ0NXYxMC42NjZjMCAuMjUuMTk3LjQ0NS40NDYuNDQ1aDYuMjIyYS40NC40NCAwIDAgMCAuNDQ0LS40NDUuNDQuNDQgMCAwIDAtLjQ0NC0uNDQ0elwiLz5cbiAgICAgICAgPHBhdGggZD1cIk0uNDQ0IDE2aDYuMjIzYS40NC40NCAwIDAgMCAuNDQ0LS40NDQuNDQuNDQgMCAwIDAtLjQ0My0uNDQ1SC44OVY0Ljg5YS40NC40NCAwIDAgMC0uNDQ2LS40NDZBLjQ0LjQ0IDAgMCAwIDAgNC44OXYxMC42NjZjMCAuMjQ4LjE5Ni40NDQuNDQ0LjQ0NHpcIi8+XG4gICAgICA8L3N2Zz5cbiAgICBgXG5cbiAgICAvLyBEZWZhdWx0IG9wdGlvbnNcbiAgICBjb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgIHRhcmdldDogJy5VcHB5RHJhZ0Ryb3AnXG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIG9uZXMgc2V0IGJ5IHVzZXJcbiAgICB0aGlzLm9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIC8vIENoZWNrIGZvciBicm93c2VyIGRyYWdEcm9wIHN1cHBvcnRcbiAgICB0aGlzLmlzRHJhZ0Ryb3BTdXBwb3J0ZWQgPSB0aGlzLmNoZWNrRHJhZ0Ryb3BTdXBwb3J0KClcblxuICAgIC8vIEJpbmQgYHRoaXNgIHRvIGNsYXNzIG1ldGhvZHNcbiAgICB0aGlzLmhhbmRsZURyb3AgPSB0aGlzLmhhbmRsZURyb3AuYmluZCh0aGlzKVxuICAgIHRoaXMuY2hlY2tEcmFnRHJvcFN1cHBvcnQgPSB0aGlzLmNoZWNrRHJhZ0Ryb3BTdXBwb3J0LmJpbmQodGhpcylcbiAgICB0aGlzLmhhbmRsZUlucHV0Q2hhbmdlID0gdGhpcy5oYW5kbGVJbnB1dENoYW5nZS5iaW5kKHRoaXMpXG4gICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpXG4gIH1cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgRHJhZyAmIERyb3AgKG5vdCBzdXBwb3J0ZWQgb24gbW9iaWxlIGRldmljZXMsIGZvciBleGFtcGxlKS5cbiAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWUgaWYgc3VwcG9ydGVkLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuICBjaGVja0RyYWdEcm9wU3VwcG9ydCAoKSB7XG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcblxuICAgIGlmICghKCdkcmFnZ2FibGUnIGluIGRpdikgfHwgISgnb25kcmFnc3RhcnQnIGluIGRpdiAmJiAnb25kcm9wJyBpbiBkaXYpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICBpZiAoISgnRm9ybURhdGEnIGluIHdpbmRvdykpIHtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIGlmICghKCdGaWxlUmVhZGVyJyBpbiB3aW5kb3cpKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgaGFuZGxlRHJvcCAoZmlsZXMpIHtcbiAgICB0aGlzLmNvcmUubG9nKCdBbGwgcmlnaHQsIHNvbWVvbmUgZHJvcHBlZCBzb21ldGhpbmcuLi4nKVxuXG4gICAgLy8gdGhpcy5jb3JlLmVtaXR0ZXIuZW1pdCgnZmlsZS1hZGQnLCB7XG4gICAgLy8gICBwbHVnaW46IHRoaXMsXG4gICAgLy8gICBhY3F1aXJlZEZpbGVzOiBmaWxlc1xuICAgIC8vIH0pXG5cbiAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICB0aGlzLmNvcmUuZW1pdHRlci5lbWl0KCdmaWxlLWFkZCcsIHtcbiAgICAgICAgc291cmNlOiB0aGlzLmlkLFxuICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICAgIHR5cGU6IGZpbGUudHlwZSxcbiAgICAgICAgZGF0YTogZmlsZVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgdGhpcy5jb3JlLmFkZE1ldGEoe2JsYTogJ2JsYSd9KVxuICB9XG5cbiAgaGFuZGxlSW5wdXRDaGFuZ2UgKGV2KSB7XG4gICAgdGhpcy5jb3JlLmxvZygnQWxsIHJpZ2h0LCBzb21ldGhpbmcgc2VsZWN0ZWQgdGhyb3VnaCBpbnB1dC4uLicpXG5cbiAgICBjb25zdCBmaWxlcyA9IFV0aWxzLnRvQXJyYXkoZXYudGFyZ2V0LmZpbGVzKVxuXG4gICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgY29uc29sZS5sb2coZmlsZSlcbiAgICAgIHRoaXMuY29yZS5lbWl0dGVyLmVtaXQoJ2ZpbGUtYWRkJywge1xuICAgICAgICBzb3VyY2U6IHRoaXMuaWQsXG4gICAgICAgIG5hbWU6IGZpbGUubmFtZSxcbiAgICAgICAgdHlwZTogZmlsZS50eXBlLFxuICAgICAgICBkYXRhOiBmaWxlXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBmb2N1cyAoKSB7XG4gICAgY29uc3QgZmlyc3RJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCR7dGhpcy50YXJnZXR9IC5VcHB5RHJhZ0Ryb3AtZm9jdXNgKVxuXG4gICAgLy8gb25seSB3b3JrcyBmb3IgdGhlIGZpcnN0IHRpbWUgaWYgd3JhcHBlZCBpbiBzZXRUaW1lb3V0IGZvciBzb21lIHJlYXNvblxuICAgIC8vIGZpcnN0SW5wdXQuZm9jdXMoKVxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgZmlyc3RJbnB1dC5mb2N1cygpXG4gICAgfSwgMTApXG4gIH1cblxuICByZW5kZXIgKHN0YXRlKSB7XG4gICAgLy8gQW5vdGhlciB3YXkgbm90IHRvIHJlbmRlciBuZXh0L3VwbG9hZCBidXR0b24g4oCUIGlmIE1vZGFsIGlzIHVzZWQgYXMgYSB0YXJnZXRcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm9wdHMudGFyZ2V0Lm5hbWVcblxuICAgIGNvbnN0IG9uU2VsZWN0ID0gKGV2KSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYCR7dGhpcy50YXJnZXR9IC5VcHB5RHJhZ0Ryb3AtaW5wdXRgKVxuICAgICAgaW5wdXQuY2xpY2soKVxuICAgIH1cblxuICAgIGNvbnN0IG5leHQgPSAoZXYpID0+IHtcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICB0aGlzLmNvcmUuZW1pdHRlci5lbWl0KCduZXh0JylcbiAgICB9XG5cbiAgICBjb25zdCBvblN1Ym1pdCA9IChldikgPT4ge1xuICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuICAgIH1cblxuICAgIHJldHVybiB5b2BcbiAgICAgIDxkaXYgY2xhc3M9XCJVcHB5RHJhZ0Ryb3AtY29udGFpbmVyICR7dGhpcy5pc0RyYWdEcm9wU3VwcG9ydGVkID8gJ2lzLWRyYWdkcm9wLXN1cHBvcnRlZCcgOiAnJ31cIj5cbiAgICAgICAgPGZvcm0gY2xhc3M9XCJVcHB5RHJhZ0Ryb3AtaW5uZXJcIlxuICAgICAgICAgICAgICBvbnN1Ym1pdD0ke29uU3VibWl0fT5cbiAgICAgICAgICA8aW5wdXQgY2xhc3M9XCJVcHB5RHJhZ0Ryb3AtaW5wdXQgVXBweURyYWdEcm9wLWZvY3VzXCJcbiAgICAgICAgICAgICAgICAgdHlwZT1cImZpbGVcIlxuICAgICAgICAgICAgICAgICBuYW1lPVwiZmlsZXNbXVwiXG4gICAgICAgICAgICAgICAgIG11bHRpcGxlPVwidHJ1ZVwiXG4gICAgICAgICAgICAgICAgIHZhbHVlPVwiXCJcbiAgICAgICAgICAgICAgICAgb25jaGFuZ2U9JHt0aGlzLmhhbmRsZUlucHV0Q2hhbmdlLmJpbmQodGhpcyl9IC8+XG4gICAgICAgICAgPGxhYmVsIGNsYXNzPVwiVXBweURyYWdEcm9wLWxhYmVsXCIgb25jbGljaz0ke29uU2VsZWN0fT5cbiAgICAgICAgICAgIDxzdHJvbmc+JHt0aGlzLmNvcmUuaTE4bignY2hvb3NlRmlsZScpfTwvc3Ryb25nPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJVcHB5RHJhZ0Ryb3AtZHJhZ1RleHRcIj4ke3RoaXMuY29yZS5pMThuKCdvckRyYWdEcm9wJyl9PC9zcGFuPlxuICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICAgJHshdGhpcy5jb3JlLm9wdHMuYXV0b1Byb2NlZWQgJiYgdGFyZ2V0ICE9PSAnTW9kYWwnXG4gICAgICAgICAgICA/IHlvYDxidXR0b24gY2xhc3M9XCJVcHB5RHJhZ0Ryb3AtdXBsb2FkQnRuIFVwcHlOZXh0QnRuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwic3VibWl0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICBvbmNsaWNrPSR7bmV4dH0+XG4gICAgICAgICAgICAgICAgICAgICR7dGhpcy5jb3JlLmkxOG4oJ3VwbG9hZCcpfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5gXG4gICAgICAgICAgICA6ICcnfVxuICAgICAgICA8L2Zvcm0+XG4gICAgICA8L2Rpdj5cbiAgICBgXG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLm9wdHMudGFyZ2V0XG4gICAgY29uc3QgcGx1Z2luID0gdGhpc1xuICAgIHRoaXMudGFyZ2V0ID0gdGhpcy5tb3VudCh0YXJnZXQsIHBsdWdpbilcblxuICAgIGRyYWdEcm9wKGAke3RoaXMudGFyZ2V0fSAuVXBweURyYWdEcm9wLWNvbnRhaW5lcmAsIChmaWxlcykgPT4ge1xuICAgICAgdGhpcy5oYW5kbGVEcm9wKGZpbGVzKVxuICAgICAgdGhpcy5jb3JlLmxvZyhmaWxlcylcbiAgICB9KVxuICB9XG59XG4iLCJpbXBvcnQgeW8gZnJvbSAneW8teW8nXG5cbi8qKlxuICogQm9pbGVycGxhdGUgdGhhdCBhbGwgUGx1Z2lucyBzaGFyZSAtIGFuZCBzaG91bGQgbm90IGJlIHVzZWRcbiAqIGRpcmVjdGx5LiBJdCBhbHNvIHNob3dzIHdoaWNoIG1ldGhvZHMgZmluYWwgcGx1Z2lucyBzaG91bGQgaW1wbGVtZW50L292ZXJyaWRlLFxuICogdGhpcyBkZWNpZGluZyBvbiBzdHJ1Y3R1cmUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG1haW4gVXBweSBjb3JlIG9iamVjdFxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB3aXRoIHBsdWdpbiBvcHRpb25zXG4gKiBAcmV0dXJuIHthcnJheSB8IHN0cmluZ30gZmlsZXMgb3Igc3VjY2Vzcy9mYWlsIG1lc3NhZ2VcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGx1Z2luIHtcblxuICBjb25zdHJ1Y3RvciAoY29yZSwgb3B0cykge1xuICAgIHRoaXMuY29yZSA9IGNvcmVcbiAgICB0aGlzLm9wdHMgPSBvcHRzXG4gICAgdGhpcy50eXBlID0gJ25vbmUnXG5cbiAgICB0aGlzLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcylcbiAgICB0aGlzLm1vdW50ID0gdGhpcy5tb3VudC5iaW5kKHRoaXMpXG4gICAgdGhpcy5mb2N1cyA9IHRoaXMuZm9jdXMuYmluZCh0aGlzKVxuICAgIHRoaXMuaW5zdGFsbCA9IHRoaXMuaW5zdGFsbC5iaW5kKHRoaXMpXG4gIH1cblxuICB1cGRhdGUgKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5lbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IG5ld0VsID0gdGhpcy5yZW5kZXIodGhpcy5jb3JlLnN0YXRlKVxuICAgIHlvLnVwZGF0ZSh0aGlzLmVsLCBuZXdFbClcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBzdXBwbGllZCBgdGFyZ2V0YCBpcyBhIGBzdHJpbmdgIG9yIGFuIGBvYmplY3RgLlxuICAgKiBJZiBpdOKAmXMgYW4gb2JqZWN0IOKAlCB0YXJnZXQgaXMgYSBwbHVnaW4sIGFuZCB3ZSBzZWFyY2ggYHBsdWdpbnNgXG4gICAqIGZvciBhIHBsdWdpbiB3aXRoIHNhbWUgbmFtZSBhbmQgcmV0dXJuIGl0cyB0YXJnZXQuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gdGFyZ2V0XG4gICAqXG4gICAqL1xuICBtb3VudCAodGFyZ2V0LCBwbHVnaW4pIHtcbiAgICBjb25zdCBjYWxsZXJQbHVnaW5OYW1lID0gcGx1Z2luLmlkXG5cbiAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuY29yZS5sb2coYEluc3RhbGxpbmcgJHtjYWxsZXJQbHVnaW5OYW1lfSB0byAke3RhcmdldH1gKVxuXG4gICAgICAvLyBjbGVhciBldmVyeXRoaW5nIGluc2lkZSB0aGUgdGFyZ2V0IHNlbGVjdG9yXG4gICAgICAvLyBpZiAocmVwbGFjZVRhcmdldENvbnRlbnQpIHtcbiAgICAgIC8vICAgZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0YXJnZXQpLmlubmVySFRNTCA9ICcnXG4gICAgICAvLyB9XG4gICAgICB0aGlzLmVsID0gcGx1Z2luLnJlbmRlcih0aGlzLmNvcmUuc3RhdGUpXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCkuYXBwZW5kQ2hpbGQodGhpcy5lbClcblxuICAgICAgcmV0dXJuIHRhcmdldFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPOiBpcyBpbnN0YW50aWF0aW5nIHRoZSBwbHVnaW4gcmVhbGx5IHRoZSB3YXkgdG8gcm9sbFxuICAgICAgLy8ganVzdCB0byBnZXQgdGhlIHBsdWdpbiBuYW1lP1xuICAgICAgY29uc3QgVGFyZ2V0ID0gdGFyZ2V0XG4gICAgICBjb25zdCB0YXJnZXRQbHVnaW5OYW1lID0gbmV3IFRhcmdldCgpLmlkXG5cbiAgICAgIHRoaXMuY29yZS5sb2coYEluc3RhbGxpbmcgJHtjYWxsZXJQbHVnaW5OYW1lfSB0byAke3RhcmdldFBsdWdpbk5hbWV9YClcblxuICAgICAgY29uc3QgdGFyZ2V0UGx1Z2luID0gdGhpcy5jb3JlLmdldFBsdWdpbih0YXJnZXRQbHVnaW5OYW1lKVxuICAgICAgY29uc3Qgc2VsZWN0b3JUYXJnZXQgPSB0YXJnZXRQbHVnaW4uYWRkVGFyZ2V0KHBsdWdpbilcblxuICAgICAgcmV0dXJuIHNlbGVjdG9yVGFyZ2V0XG4gICAgfVxuICB9XG5cbiAgZm9jdXMgKCkge1xuICAgIHJldHVyblxuICB9XG5cbiAgaW5zdGFsbCAoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBydW4gKCkge1xuICAgIHJldHVyblxuICB9XG59XG4iLCJpbXBvcnQgUGx1Z2luIGZyb20gJy4vUGx1Z2luJ1xuaW1wb3J0IHlvIGZyb20gJ3lvLXlvJ1xuXG4vKipcbiAqIFByb2dyZXNzIGJhclxuICpcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUHJvZ3Jlc3NCYXIgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAoY29yZSwgb3B0cykge1xuICAgIHN1cGVyKGNvcmUsIG9wdHMpXG4gICAgdGhpcy5pZCA9ICdQcm9ncmVzc0JhcidcbiAgICB0aGlzLnRpdGxlID0gJ1Byb2dyZXNzIEJhcidcbiAgICB0aGlzLnR5cGUgPSAncHJvZ3Jlc3NpbmRpY2F0b3InXG5cbiAgICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gICAgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgICByZXBsYWNlVGFyZ2V0Q29udGVudDogZmFsc2VcbiAgICB9XG5cbiAgICAvLyBtZXJnZSBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgb25lcyBzZXQgYnkgdXNlclxuICAgIHRoaXMub3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBvcHRzKVxuXG4gICAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpXG4gIH1cblxuICByZW5kZXIgKHN0YXRlKSB7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBzdGF0ZS50b3RhbFByb2dyZXNzIHx8IDBcblxuICAgIHJldHVybiB5b2A8ZGl2IGNsYXNzPVwiVXBweVByb2dyZXNzQmFyXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiVXBweVByb2dyZXNzQmFyLWlubmVyXCIgc3R5bGU9XCJ3aWR0aDogJHtwcm9ncmVzc30lXCI+PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwiVXBweVByb2dyZXNzQmFyLXBlcmNlbnRhZ2VcIj4ke3Byb2dyZXNzfTwvZGl2PlxuICAgIDwvZGl2PmBcbiAgfVxuXG4gIGluc3RhbGwgKCkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMub3B0cy50YXJnZXRcbiAgICBjb25zdCBwbHVnaW4gPSB0aGlzXG4gICAgdGhpcy50YXJnZXQgPSB0aGlzLm1vdW50KHRhcmdldCwgcGx1Z2luKVxuICB9XG59XG4iLCJpbXBvcnQgUGx1Z2luIGZyb20gJy4vUGx1Z2luJ1xuaW1wb3J0IHR1cyBmcm9tICd0dXMtanMtY2xpZW50J1xuXG4vKipcbiAqIFR1cyByZXN1bWFibGUgZmlsZSB1cGxvYWRlclxuICpcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVHVzMTAgZXh0ZW5kcyBQbHVnaW4ge1xuICBjb25zdHJ1Y3RvciAoY29yZSwgb3B0cykge1xuICAgIHN1cGVyKGNvcmUsIG9wdHMpXG4gICAgdGhpcy50eXBlID0gJ3VwbG9hZGVyJ1xuICAgIHRoaXMuaWQgPSAnVHVzJ1xuICAgIHRoaXMudGl0bGUgPSAnVHVzJ1xuXG4gICAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICAgIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge31cblxuICAgIC8vIG1lcmdlIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBvbmVzIHNldCBieSB1c2VyXG4gICAgdGhpcy5vcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdHMpXG4gIH1cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgVHVzIHVwbG9hZFxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBmaWxlIGZvciB1c2Ugd2l0aCB1cGxvYWRcbiAqIEBwYXJhbSB7aW50ZWdlcn0gY3VycmVudCBmaWxlIGluIGEgcXVldWVcbiAqIEBwYXJhbSB7aW50ZWdlcn0gdG90YWwgbnVtYmVyIG9mIGZpbGVzIGluIGEgcXVldWVcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICovXG4gIHVwbG9hZCAoZmlsZSwgY3VycmVudCwgdG90YWwpIHtcbiAgICB0aGlzLmNvcmUubG9nKGB1cGxvYWRpbmcgJHtjdXJyZW50fSBvZiAke3RvdGFsfWApXG5cbiAgICAvLyBDcmVhdGUgYSBuZXcgdHVzIHVwbG9hZFxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB1cGxvYWQgPSBuZXcgdHVzLlVwbG9hZChmaWxlLmRhdGEsIHtcblxuICAgICAgICAvLyBUT0RPIG1lcmdlIHRoaXMub3B0cyBvciB0aGlzLm9wdHMudHVzIGhlcmVcbiAgICAgICAgcmVzdW1lOiBmYWxzZSxcbiAgICAgICAgZW5kcG9pbnQ6IHRoaXMub3B0cy5lbmRwb2ludCxcbiAgICAgICAgb25FcnJvcjogKGVycm9yKSA9PiB7XG4gICAgICAgICAgcmVqZWN0KCdGYWlsZWQgYmVjYXVzZTogJyArIGVycm9yKVxuICAgICAgICB9LFxuICAgICAgICBvblByb2dyZXNzOiAoYnl0ZXNVcGxvYWRlZCwgYnl0ZXNUb3RhbCkgPT4ge1xuICAgICAgICAgIC8vIERpc3BhdGNoIHByb2dyZXNzIGV2ZW50XG4gICAgICAgICAgdGhpcy5jb3JlLmVtaXR0ZXIuZW1pdCgndXBsb2FkLXByb2dyZXNzJywge1xuICAgICAgICAgICAgdXBsb2FkZXI6IHRoaXMsXG4gICAgICAgICAgICBpZDogZmlsZS5pZCxcbiAgICAgICAgICAgIGJ5dGVzVXBsb2FkZWQ6IGJ5dGVzVXBsb2FkZWQsXG4gICAgICAgICAgICBieXRlc1RvdGFsOiBieXRlc1RvdGFsXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgb25TdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgICAgZmlsZS51cGxvYWRVUkwgPSB1cGxvYWQudXJsXG4gICAgICAgICAgdGhpcy5jb3JlLmVtaXR0ZXIuZW1pdCgndXBsb2FkLXN1Y2Nlc3MnLCBmaWxlKVxuXG4gICAgICAgICAgdGhpcy5jb3JlLmxvZyhgRG93bmxvYWQgJHt1cGxvYWQuZmlsZS5uYW1lfSBmcm9tICR7dXBsb2FkLnVybH1gKVxuICAgICAgICAgIHJlc29sdmUodXBsb2FkKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgdGhpcy5jb3JlLmVtaXR0ZXIub24oJ2ZpbGUtcmVtb3ZlJywgKGZpbGVJRCkgPT4ge1xuICAgICAgICBpZiAoZmlsZUlEID09PSBmaWxlLmlkKSB7XG4gICAgICAgICAgdXBsb2FkLmFib3J0KClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHVwbG9hZC5zdGFydCgpXG4gICAgfSlcbiAgfVxuXG4gIHVwbG9hZEZpbGVzIChmaWxlcykge1xuICAgIGNvbnN0IHVwbG9hZGVycyA9IFtdXG4gICAgZmlsZXMuZm9yRWFjaCgoZmlsZSwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBwYXJzZUludChpbmRleCwgMTApICsgMVxuICAgICAgY29uc3QgdG90YWwgPSBmaWxlcy5sZW5ndGhcblxuICAgICAgaWYgKCFmaWxlLmlzUmVtb3RlKSB7XG4gICAgICAgIHVwbG9hZGVycy5wdXNoKHRoaXMudXBsb2FkKGZpbGUsIGN1cnJlbnQsIHRvdGFsKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwbG9hZGVycy5wdXNoKHRoaXMudXBsb2FkKGZpbGUsIGN1cnJlbnQsIHRvdGFsKSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHVwbG9hZGVycykudGhlbigoKSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB1cGxvYWRlZENvdW50OiBmaWxlcy5sZW5ndGhcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdXBsb2FkUmVtb3RlIChmaWxlLCBjdXJyZW50LCB0b3RhbCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBwYXlsb2FkID0gT2JqZWN0LmFzc2lnbih7fSwgZmlsZS5yZW1vdGUucGF5bG9hZCwge1xuICAgICAgICB0YXJnZXQ6IHRoaXMub3B0cy5lbmRwb2ludCxcbiAgICAgICAgcHJvdG9jb2w6ICd0dXMnXG4gICAgICB9KVxuICAgICAgdGhpcy5jb3JlLnNvY2tldC5zZW5kKGZpbGUucmVtb3RlLmFjdGlvbiwgcGF5bG9hZClcbiAgICAgIHRoaXMuY29yZS5zb2NrZXQub25jZSgndXBsb2FkLXN1Y2Nlc3MnLCAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzJylcbiAgICAgICAgdGhpcy5jb3JlLmVtaXR0ZXIuZW1pdCgndXBsb2FkLXN1Y2Nlc3MnLCBmaWxlKVxuXG4gICAgICAgIHRoaXMuY29yZS5lbWl0dGVyLmVtaXQoJ3VwbG9hZC1wcm9ncmVzcycsIHtcbiAgICAgICAgICBpZDogZmlsZS5pZCxcbiAgICAgICAgICBwZXJjZW50YWdlOiAxMDBcbiAgICAgICAgfSlcblxuICAgICAgICByZXNvbHZlKClcbiAgICAgIH0pXG4gICAgfSlcbiAgfVxuXG4gIHNlbGVjdEZvclVwbG9hZCAoZmlsZXMpIHtcbiAgICAvLyBUT0RPOiByZXBsYWNlIGZpbGVzW2ZpbGVdLmlzUmVtb3RlIHdpdGggc29tZSBsb2dpY1xuICAgIC8vXG4gICAgLy8gZmlsdGVyIGZpbGVzIHRoYXQgYXJlIG5vdyB5ZXQgYmVpbmcgdXBsb2FkZWQgLyBoYXZlbuKAmXQgYmVlbiB1cGxvYWRlZFxuICAgIC8vIGFuZCByZW1vdGUgdG9vXG4gICAgY29uc3QgZmlsZXNGb3JVcGxvYWQgPSBPYmplY3Qua2V5cyhmaWxlcykuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICBpZiAoZmlsZXNbZmlsZV0ucHJvZ3Jlc3MgPT09IDAgfHwgZmlsZXNbZmlsZV0uaXNSZW1vdGUpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIGZpbGVzW2ZpbGVdXG4gICAgfSlcblxuICAgIHRoaXMudXBsb2FkRmlsZXMoZmlsZXNGb3JVcGxvYWQpXG4gIH1cblxuICBpbnN0YWxsICgpIHtcbiAgICB0aGlzLmNvcmUuZW1pdHRlci5vbignbmV4dCcsICgpID0+IHtcbiAgICAgIHRoaXMuY29yZS5sb2coJ1R1cyBpcyB1cGxvYWRpbmcuLi4nKVxuICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmNvcmUuc3RhdGUuZmlsZXNcbiAgICAgIHRoaXMuc2VsZWN0Rm9yVXBsb2FkKGZpbGVzKVxuICAgIH0pXG4gIH1cbn1cbiIsIiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgICBpZiAoaXNGdW5jdGlvbihldmxpc3RlbmVyKSlcbiAgICAgIHJldHVybiAxO1xuICAgIGVsc2UgaWYgKGV2bGlzdGVuZXIpXG4gICAgICByZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIDA7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiaW1wb3J0IFVwcHkgZnJvbSAnLi4vLi4vLi4vLi4vc3JjL2NvcmUvQ29yZS5qcydcbmltcG9ydCBEcmFnRHJvcCBmcm9tICcuLi8uLi8uLi8uLi9zcmMvcGx1Z2lucy9EcmFnRHJvcC5qcydcbmltcG9ydCBQcm9ncmVzc0JhciBmcm9tICcuLi8uLi8uLi8uLi9zcmMvcGx1Z2lucy9Qcm9ncmVzc0Jhci5qcydcbmltcG9ydCBUdXMxMCBmcm9tICcuLi8uLi8uLi8uLi9zcmMvcGx1Z2lucy9UdXMxMC5qcydcblxuY29uc3QgdXBweU9uZSA9IG5ldyBVcHB5KHtkZWJ1ZzogdHJ1ZX0pXG51cHB5T25lXG4gIC51c2UoRHJhZ0Ryb3AsIHt0YXJnZXQ6ICcuVXBweURyYWdEcm9wLU9uZSd9KVxuICAudXNlKFR1czEwLCB7ZW5kcG9pbnQ6ICdodHRwOi8vbWFzdGVyLnR1cy5pbzo4MDgwL2ZpbGVzLyd9KVxuICAudXNlKFByb2dyZXNzQmFyLCB7dGFyZ2V0OiAnLlVwcHlEcmFnRHJvcC1PbmUtUHJvZ3Jlc3MnfSlcbiAgLnJ1bigpXG5cbmNvbnN0IHVwcHlUd28gPSBuZXcgVXBweSh7ZGVidWc6IHRydWUsIGF1dG9Qcm9jZWVkOiBmYWxzZX0pXG51cHB5VHdvXG4gIC51c2UoRHJhZ0Ryb3AsIHt0YXJnZXQ6ICcjVXBweURyYWdEcm9wLVR3byd9KVxuICAudXNlKFR1czEwLCB7ZW5kcG9pbnQ6ICdodHRwOi8vbWFzdGVyLnR1cy5pbzo4MDgwL2ZpbGVzLyd9KVxuICAudXNlKFByb2dyZXNzQmFyLCB7dGFyZ2V0OiAnLlVwcHlEcmFnRHJvcC1Ud28tUHJvZ3Jlc3MnfSlcbiAgLnJ1bigpXG4iXX0=
