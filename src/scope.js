'use strict';

let _ = require('lodash');

function initWatchVal() {} // function reference type

export default class Scope {

  constructor() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
  }

  $watch(watchFn, listenerFn) {
    let watcher = {
      watchFn: watchFn,
      listenerFn: listenerFn || function() {},
      last: initWatchVal
    };
    this.$$watchers.push(watcher);
    this.$$lastDirtyWatch = null;
  }

  $digest() {
    let ttl = 10;
    let dirty;
    this.$$lastDirtyWatch = null;

    do {
      dirty = this.$$digestOnce();
      if (dirty && !(ttl--)) {
        throw "10 digest iterations reached";
      }
    } while (dirty);
  }

  $$digestOnce() {
    let newValue, oldValue, dirty;

    _.forEach(this.$$watchers, (watcher) => {
      newValue = watcher.watchFn(this);
      oldValue = watcher.last;

      if (newValue !== oldValue) {
        this.$$lastDirtyWatch = watcher;
        watcher.last = newValue;
        watcher.listenerFn(newValue,
          (oldValue === initWatchVal ? newValue : oldValue),
          this);
        dirty = true;
      } else if (this.$$lastDirtyWatch === watcher) {
        return false;
      }
    });

    return dirty;
  }
}
