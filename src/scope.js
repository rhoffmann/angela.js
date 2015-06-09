'use strict';

let _ = require('lodash');

function initWatchVal() {} // function reference type

export default class Scope {

  constructor() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
  }

  $watch(watchFn, listenerFn, valueEq) {
    let watcher = {
      watchFn: watchFn,
      listenerFn: listenerFn || function() {},
      valueEq: !!valueEq,
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

  $eval(expr, locals) {
    return expr(this, locals);
  }

  $$digestOnce() {
    let newValue, oldValue, dirty;

    _.forEach(this.$$watchers, (watcher) => {
      newValue = watcher.watchFn(this);
      oldValue = watcher.last;

      if (!this.$$areEqual(newValue, oldValue, watcher.valueEq)) {
        this.$$lastDirtyWatch = watcher;
        watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
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

  $$areEqual(newValue, oldValue, valueEq) {
    if (valueEq) {
      return _.isEqual(newValue, oldValue);
    } else {
      return newValue === oldValue ||
        (typeof newValue === 'number' && typeof oldValue === 'number' &&
         isNaN(newValue) && isNaN(oldValue));
    }
  }
}
