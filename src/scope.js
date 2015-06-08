'use strict';

export default class Scope {
  constructor() {
    this.$$watchers = [];
  }

  $watch(watchFn, listenerFn) {
    let watcher = {
      watchFn: watchFn,
      listenerFn: listenerFn
    };
    this.$$watchers.push(watcher);
  }

  $digest() {
    this.$$watchers.forEach((watcher) => {
      watcher.watchFn(this);
      watcher.listenerFn();
    });
  }
}
