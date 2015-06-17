'use strict';

let _ = require('lodash');

function initWatchVal() {} // function reference type

export default class Scope {

  constructor() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$$phase = null;
  }

  $watch(watchFn, listenerFn, valueEq) {
    let watcher = {
      watchFn: watchFn,
      listenerFn: listenerFn || function() {},
      valueEq: !!valueEq,
      last: initWatchVal
    };

    this.$$watchers.unshift(watcher);
    this.$$lastDirtyWatch = null;

    return () => {
      let index = this.$$watchers.indexOf(watcher);
      if (index >= 0) {
        this.$$watchers.splice(index, 1);
        this.$$lastDirtyWatch = null;
      }
    }
  }

  $watchGroup(watchFns, listenerFn) {

    let newValues = new Array(watchFns.length);
    let oldValues = new Array(watchFns.length);
    let changeReactionScheduled = false;
    let firstRun = true;

    if (watchFns.length === 0) {
      var shouldCall = true;
      this.$evalAsync(() => {
        if (shouldCall) {
          listenerFn(newValues, newValues, this);
        }
      });
      return () => {
        shouldCall = false;
      };
    }

    function watchGroupListener() {
      if (firstRun) {
        firstRun = false;
        listenerFn(newValues, newValues, self);
      } else {
        listenerFn(newValues, oldValues, self);
      }
      changeReactionScheduled = false;
    }

    var destroyFunctions =_.map(watchFns, (watchFn, i) => {
      return this.$watch(watchFn, (newValue, oldValue) => {
        newValues[i] = newValue;
        oldValues[i] = oldValue;
        if(!changeReactionScheduled) {
          changeReactionScheduled = true;
          this.$evalAsync(watchGroupListener);
        }
      });
    });

    return () => {
      _.forEach(destroyFunctions, (destroyFn) => {
        destroyFn();
      });
    };
  }

  $digest() {
    let ttl = 10;
    let dirty;
    this.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');

    if (this.$$applyAsyncId) {
      clearTimeout(this.$$applyAsyncId);
      this.$$flushApplyAsync();
    }

    do {
      while(this.$$asyncQueue.length) {
        try {
          let asyncTask = this.$$asyncQueue.shift();
          asyncTask.scope.$eval(asyncTask.expression);
        } catch(e) {
          console.error(e);
        }
      }
      dirty = this.$$digestOnce();
      if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
        this.$clearPhase();
        throw '10 digest iterations reached';
      }
    } while (dirty || this.$$asyncQueue.length);

    this.$clearPhase();

    while(this.$$postDigestQueue.length) {
      try {
        this.$$postDigestQueue.shift()();
      } catch(e) {
        console.error(e);
      }
    }
  }

  $apply(expr) {
    try {
      this.$beginPhase('$apply');
      return this.$eval(expr);
    } finally {
      this.$clearPhase();
      this.$digest();
    }
  }

  $applyAsync(expr) {

    this.$$applyAsyncQueue.push(
      () => { this.$eval(expr); }
    );

    if (this.$$applyAsyncId === null) {
      this.$$applyAsyncId = setTimeout(() => {
        this.$apply( _.bind(this.$$flushApplyAsync, this) );
      }, 0);
    }
  }

  $eval(expr, locals) {
    return expr(this, locals);
  }

  $evalAsync(expr) {

    if (!this.$$phase && !this.$$asyncQueue.length) {
      setTimeout(() => {
        if(this.$$asyncQueue.length) {
          this.$digest();
        }
      }, 0);
    }

    this.$$asyncQueue.push({
      scope: this,
      expression: expr
    });
  }

  $beginPhase(phase) {
    if (this.$$phase) {
      throw this.$$phase + ' already in progress';
    }
    this.$$phase = phase;
  }

  $clearPhase() {
    this.$$phase = null;
  }

  $$digestOnce() {
    let newValue, oldValue, dirty;

    _.forEachRight(this.$$watchers, (watcher) => {
      try {
        if (watcher) {
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
        }
      } catch (e) {
        console.error(e);
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

  $$flushApplyAsync() {
    while(this.$$applyAsyncQueue.length) {
      try {
        this.$$applyAsyncQueue.shift()();
      } catch (e) {
        console.error(e);
      }
    }
    this.$$applyAsyncId = null;
  }

  $$postDigest(fn) {
    this.$$postDigestQueue.push(fn);
  }
}
