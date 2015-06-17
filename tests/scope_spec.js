'use strict';

import Scope from '../src/scope';
let _ = require('lodash');

describe('Scope', function() {
  it('can be constructed and used as an object', function() {
    var scope = new Scope();
    scope.aProperty = 1;
    expect(scope.aProperty).toBe(1);
  });

  describe('digest', function() {
    var scope;

    beforeEach(function() {
      scope = new Scope();
    });

    it('calls the listener function of a watch on first $digest', function() {
      var watchFn = function() { return 'wat'; };
      var listenerFn = jasmine.createSpy();

      scope.$watch(watchFn, listenerFn);
      scope.$digest();

      expect(listenerFn).toHaveBeenCalled();
    });

    it('calls the watch function with the scope as the argument', function() {
      var watchFn = jasmine.createSpy();
      var listenerFn = function() {};

      scope.$watch(watchFn, listenerFn);
      scope.$digest();

      expect(watchFn).toHaveBeenCalledWith(scope);
    });

    it('calls the listener function when the whatched value changes', function() {

      scope.someValue = 'a';
      scope.counter = 0;

      scope.$watch(
        function(scope) { return scope.someValue; },
        function(newValue, oldValue, scope) { scope.counter++; }
      );

      expect(scope.counter).toBe(0);

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.someValue = 'b';
      expect(scope.counter).toBe(1);

      scope.$digest();
      expect(scope.counter).toBe(2);
    });

    it('calls the listener when watch value is first undefined', function() {
      scope.counter = 0;

      scope.$watch(
        function (scope) { return scope.someValue; },
        function (newValue, oldValue, scope) { scope.counter++; }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

    });

    it('calls the listener with new value as old value the first time', function() {
      scope.someValue = 123;
      var oldValueGiven;

      scope.$watch(
        function (scope) {
          return scope.someValue;
        },
        function (newValue, oldValue, scope) {
          oldValueGiven = oldValue;
        }
      );

      scope.$digest();
      expect(oldValueGiven).toBe(123);
    });

    it('may have watchers that omit the listener function', function() {
      var watchFn = jasmine.createSpy().and.returnValue('something');
      scope.$watch(watchFn);

      scope.$digest();
      expect(watchFn).toHaveBeenCalled();
    });

    it('triggers chained watchers in the same digest', function() {
      scope.name = 'Jane';

      scope.$watch(
        (scope) => { return scope.nameUpper; },
        (newValue, oldValue, scope) => {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + '.';
          }
        }
      );

      scope.$watch(
        (scope) => { return scope.name; },
        (newValue, oldValue, scope) => {
          if (newValue) {
            scope.nameUpper = newValue.toUpperCase();
          }
        }
      );

      scope.$digest();
      expect(scope.initial).toBe('J.');

      scope.name = 'Bob';
      scope.$digest();
      expect(scope.initial).toBe('B.');

    });

    it('gives up on the watches after 10 iterations', function() {
      scope.counterA = 0;
      scope.counterB = 0;

      scope.$watch(
        (scope) => { return scope.counterA; },
        (newValue, oldValue, scope) => { scope.counterB++; }
      );

      scope.$watch(
        (scope) => {return scope.counterB; },
        (newValue, oldValue, scope) => { scope.counterA++; }
      );

      expect(() => { scope.$digest(); }).toThrow();

    });

    it('ends the digest when the last watch is clean', function() {
      scope.array = _.range(100);
      var watchExecutions = 0;

      _.times(100, function(i) {
        scope.$watch(
          (scope) => {
            watchExecutions++;
            return scope.array[i];
          },
          (newValue, oldValue, scope) => {}
        );
      });

      scope.$digest();
      expect(watchExecutions).toBe(200);

      scope.array[0] = 234;
      scope.$digest();

      expect(watchExecutions).toBe(301);
    });

    it('does not end digest so that new watches are not run', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        (scope) => { return scope.aValue; },
        (newValue, oldValue, scope) => {
          scope.$watch(
            (scope) => { return scope.aValue; },
            (newValue, oldValue, scope) => {
              scope.counter++;
            }
          );
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it('compares based on value if enabled', function() {
      scope.aValue = [1, 2, 3];
      scope.counter = 0;

      scope.$watch(
        (scope) => { return scope.aValue; },
        (newValue, oldValue, scope) => {
          scope.counter++;
        },
        true
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.aValue.push(4);
      scope.$digest();
      expect(scope.counter).toBe(2);
    });

    it('correcty handles NaNs', function(){
      scope.number = 0/0;
      scope.counter = 0;

      scope.$watch(
        (scope) => { return scope.number; },
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it('executes eval`d function and returns result', function() {
      scope.aValue = 42;
      var result = scope.$eval( (scope) => scope.aValue );
      expect(result).toBe(42);
    });

    it('passes the second $eval argument through', function() {
      scope.aValue = 42;
      var result = scope.$eval( (scope, arg) => { return scope.aValue + arg }, 2 );
      expect(result).toBe(44);
    });

    it('executres apply´d function and starts the digest', function() {
      scope.aValue = 'someValue';
      scope.counter = 0;

      scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$apply( (scope) => {
        scope.aValue = 'someOtherValue'
      });

      expect(scope.counter).toBe(2);

    });

    it('executes $evalAsync´ed function lates in the same cycle', function() {
      scope.aValue = [1, 2, 3];
      scope.asyncEvaluated = false;
      scope.asyncEvaluatedImmediately = false;

      scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.$evalAsync( (scope) => {
            scope.asyncEvaluated = true;
          });
          scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
        }
      );

      scope.$digest();
      expect(scope.asyncEvaluated).toBe(true);
      expect(scope.asyncEvaluatedImmediately).toBe(false);
    });

    it('eventually halts $evalAsyncs added by watches', function() {
      scope.aValue = [1, 2, 3];
      scope.$watch(
        (scope) => {
          scope.$evalAsync( (scope) => {} );
          return scope.aValue;
        },
        (newValue, oldValue, scope) => {}
      );

      expect( () => { scope.$digest(); }).toThrow();
    });

    it('has a $$phase field with the current digest phase as value', function() {
      scope.aValue = [1,2,3];
      scope.phaseInWatchFunction = undefined;
      scope.phaseInListenerFunction = undefined;
      scope.phaseInApplyFunction = undefined;

      scope.$watch(
        (scope) => {
          scope.phaseInWatchFunction = scope.$$phase;
          return scope.aValue;
        },
        (newValue, oldValue, scope) => {
          scope.phaseInListenerFunction = scope.$$phase;
        }
      );

      scope.$apply((scope) => {
        scope.phaseInApplyFunction = scope.$$phase;
      });

      expect(scope.phaseInWatchFunction).toBe('$digest');
      expect(scope.phaseInListenerFunction).toBe('$digest');
      expect(scope.phaseInApplyFunction).toBe('$apply');
    });

    it('schedules a digest in $evalAsync', function (done) {
      scope.aValue = "abc";
      scope.counter = 0;

      scope.$watch(
        (scope) => { return scope.aValue; },
        (newValue, oldValue, scope) => { scope.counter++; }
      );

      scope.$evalAsync((scope) => {});
      expect(scope.counter).toBe(0);

      setTimeout(() => {
        expect(scope.counter).toBe(1);
        done();
      }, 50);
    });

    it('allows async $apply with $applyAsync', function(done) {
      scope.counter = 0;

      scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => { scope.counter++; }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$applyAsync(
        (scope) => { scope.aValue = 'abc'; }
      );

      expect(scope.counter).toBe(1);

      setTimeout(() => {
        expect(scope.counter).toBe(2);
        done();
      }, 50);
    });

    it('never executes $applyAsnyc`ed funciton in the same cycle', function(done) {
      scope.aValue = [1, 2, 3];
      scope.asyncApplied = false;

      scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.$applyAsync( (scope) => {
              scope.asyncApplied = true;
          });
        }
      );

      scope.$digest();
      expect(scope.asyncApplied).toBe(false);

      setTimeout(() => {
        expect(scope.asyncApplied).toBe(true);
        done();
      }, 50);
    });

    it('coalesces many calls to $applyAsync', function(done) {
      scope.counter = 0;

      scope.$watch(
        (scope) => {
          scope.counter++;
          return scope.aValue;
        },
        (oldValue, newValue, scope) => {}
      );

      scope.$applyAsync((scope) => {
        scope.aValue = 'abc';
      });

      scope.$applyAsync((scope) => {
        scope.aValue = 'def';
      });

      setTimeout(() => {
        expect(scope.counter).toBe(2);
        done();
      }, 50);
    });

    it('cancels and flushes $applyAsync if digested first', function(done) {
      scope.counter = 0;

      scope.$watch(
        (scope) => {
          scope.counter++;
          return scope.aValue;
        },
        (oldValue, newValue, scope) => {}
      );

      scope.$applyAsync((scope) => {
        scope.aValue = 'abc';
      });

      scope.$applyAsync((scope) => {
        scope.aValue = 'def';
      });

      scope.$digest();
      expect(scope.counter).toBe(2);
      expect(scope.aValue).toEqual('def');

      setTimeout(() => {
        expect(scope.counter).toBe(2);
        done();
      }, 50);
    });

    it('runs a $$postDigest function after each digest', function() {
      scope.counter = 0;
      scope.$$postDigest(() => { scope.counter++; });

      expect(scope.counter).toBe(0);

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it('does not include $$postDigest in the digest', function() {
      scope.aValue = 'original';

      scope.$$postDigest(
        () => { scope.aValue = 'changed'; }
      );

      scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.watchedValue = newValue;
        }
      );

      scope.$digest();
      expect(scope.watchedValue).toBe('original');

      scope.$digest();
      expect(scope.watchedValue).toBe('changed');
    });

    it('catches exceptions in watch functions and continues', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        (scope) => { throw 'error'; },
        (newValue, oldValue, scope) => {}
      );

      scope.$watch(
        (scope) => { return scope.aValue; },
        (newValue, oldValue, scope) => { scope.counter++; }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it('catches exceptions in listener functions and continues', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        (scope) => { return scope.aValue },
        (newValue, oldValue, scope) => {
          throw 'error';
        }
      );

      scope.$watch(
        (scope) => { return scope.aValue; },
        (newValue, oldValue, scope) => { scope.counter++; }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it('catches exceptions in $evalAsync', function(done) {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        (scope) => { return scope.aValue },
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$evalAsync(() => { throw 'error'; });

      setTimeout(() => {
        expect(scope.counter).toBe(1);
        done();
      }, 50);

    });

    it('catches exceptions in $applyAsync', function(done) {
      scope.$applyAsync((scope) => { throw 'error'; });
      scope.$applyAsync((scope) => { throw 'error'; });
      scope.$applyAsync((scope) => { scope.applied = true });

      setTimeout(() => {
        expect(scope.applied).toBe(true);
        done();
      }, 50);
    });

    it('catches exceptions in $$postDigest', function() {
      var didRun = false;

      scope.$$postDigest(() => { throw 'error'; });
      scope.$$postDigest(() => { didRun = true; });
      scope.$digest();
      expect(didRun).toBe(true);
    });

    it('allows destroying a $watch with a removal function', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      let destroyWatch = scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.aValue = 'def';
      scope.$digest();
      expect(scope.counter).toBe(2);

      scope.aValue = 'ghi';
      destroyWatch();
      scope.$digest();

      expect(scope.counter).toBe(2);

    });

    it('allows destroying a $watch during digest', function() {
      scope.aValue = 'abc';

      let watchCalls = [];

      scope.$watch(
        (scope) => {
          watchCalls.push('first');
          return scope.aValue;
        }
      );

      var destroyWatch = scope.$watch(
        (scope) => {
          watchCalls.push('second');
          destroyWatch();
        }
      );

      scope.$watch(
        (scope) => {
          watchCalls.push('third');
          return scope.aValue;
        }
      );

      scope.$digest();
      expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);

    });

    it('allows a $watch to destroy another during digest', function(){
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          destroyWatch();
        }
      );

      let destroyWatch = scope.$watch(
        (scope) => {},
        (newValue, oldValue, scope) => {}
      );

      scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

    });

    it('allows destroying several $watches during digest', function() {
      scope.aValue = 'abc';
      scope.counter = 0;

      let destroyWatch1 = scope.$watch(
        (scope) => {
          destroyWatch1();
          destroyWatch2();
        }
      );

      let destroyWatch2 = scope.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      scope.$digest()
      expect(scope.counter).toBe(0);

    });
  });



  describe('$watchGroup', function() {
    var scope;

    beforeEach(function() {
      scope = new Scope();
    });

    it('takes watches as an array and calls listener with arrays', function() {
      let gotNewValues,
          gotOldValues;

      scope.aValue = 1;
      scope.anotherValue = 2;

      scope.$watchGroup([
        (scope) => scope.aValue,
        (scope) => scope.anotherValue
      ], (newValues, oldValues, scope) => {
        gotNewValues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();

      expect(gotNewValues).toEqual([1, 2]);
      expect(gotOldValues).toEqual([1, 2]);
    });

    it('only calls listener once per digest', function(){
      let counter = 0;
      scope.aValue = 1;
      scope.anotherValue = 2;

      scope.$watchGroup([
        (scope) => scope.aValue,
        (scope) => scope.anotherValue
      ], (newValues, oldValues, scope) => {
        counter++;
      });

      scope.$digest();

      expect(counter).toEqual(1);
    });

    it('uses the same array of old an new values on first run', function() {
      let gotNewValues,
          gotOldValues;

      scope.aValue = 1;
      scope.anotherValue = 2;

      scope.$watchGroup([
        (scope) => scope.aValue,
        (scope) => scope.anotherValue
      ], (newValues, oldValues, scope) => {
        gotNewValues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();

      expect(gotNewValues).toBe(gotOldValues);
    });

    it('uses different arrays for old and new values on subsequent runs', function() {
      let gotNewValues,
        gotOldValues;

      scope.aValue = 1;
      scope.anotherValue = 2;

      scope.$watchGroup([
        (scope) => scope.aValue,
        (scope) => scope.anotherValue
      ], (newValues, oldValues, scope) => {
        gotNewValues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();

      scope.anotherValue = 3;
      scope.$digest();

      expect(gotNewValues).toEqual([1, 3]);
      expect(gotOldValues).toEqual([1, 2]);
    });

    it('calls the listener once when the watch array is empty', function() {
      let gotNewValues,
        gotOldValues;

      scope.$watchGroup([], (newValues, oldValues, scope) => {
        gotNewValues = newValues;
        gotOldValues = oldValues;
      });

      scope.$digest();
      expect(gotNewValues).toEqual([]);
      expect(gotOldValues).toEqual([]);
    });

    it('can be deregistered', function() {
      var counter = 0;

      scope.aValue = 1;
      scope.anotherValue = 2;

      var destroyGroup = scope.$watchGroup([
        (scope) => scope.aValue,
        (scope) => scope.anotherValue
      ], (newValues, oldValues, scope) => {
        counter++;
      });

      scope.$digest();

      scope.anoutherValue = 3;
      destroyGroup();
      scope.$digest();

      expect(counter).toBe(1);
    });

    it('does not call the zero-watch listener when deregistered first', function() {
      var counter = 0;
      var destroyGroup = scope.$watchGroup([], (newValues, oldValues, scope) => {
        counter++;
      });

      destroyGroup();
      scope.$digest();

      expect(counter).toEqual(0);
    });
  });



  describe('inheritance', function() {

    it('inherits the parent`s properties', function() {
      var parent = new Scope();
      parent.aValue = [1, 2, 3];

      var child = parent.$new();

      expect(child.aValue).toEqual([1, 2, 3]);
    });

    it('does not cause a parent to inherit its properties', function(){
      var parent = new Scope();
      var child = parent.$new();
      child.aValue = 1;
      expect(parent.aValue).toBeUndefined();
    });

    it('inherits the parent scope whenever they are defined', function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = 1;
      expect(child.aValue).toBe(1);
    });

    it('can manipulate a parent scope`s property', function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = [1, 2, 3];
      child.aValue.push(4);

      expect(parent.aValue).toEqual([1, 2, 3, 4]);
      expect(child.aValue).toEqual([1, 2, 3, 4]);
    });

    it('can watch a property in the parent', function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = [1, 2, 3];
      child.counter = 0;

      child.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++
        },
        true
      );

      child.$digest();
      expect(child.counter).toBe(1);

      parent.aValue.push(4);
      child.$digest();
      expect(child.counter).toBe(2);
    });

    it('can be nested at any depth', function() {
      var a   = new Scope();
      var aa  = a.$new();
      var aaa = aa.$new();
      var aab = aa.$new();
      var ab  = a.$new();
      var abb = ab.$new();

      a.value = 1;

      expect(aa.value).toBe(1);
      expect(aaa.value).toBe(1);
      expect(aab.value).toBe(1);
      expect(ab.value).toBe(1);
      expect(abb.value).toBe(1);

      ab.anotherValue = 2;

      expect(abb.anotherValue).toBe(2);
      expect(aa.anotherValue).toBeUndefined();
      expect(aaa.anotherValue).toBeUndefined();
    });

    it('shadows a parent´s property with the same name', function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.name = 'Joe';
      child.name = 'Jill';

      expect(child.name).toBe('Jill');
      expect(parent.name).toBe('Joe');

    });

    it('does not shadow members of parent scope attributes', function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.user = { name: 'Joe' };
      child.user.name = 'Jill';

      expect(child.user.name).toBe('Jill');
      expect(parent.user.name).toBe('Jill');

    });

    it('does not digest its parent(s)', function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = 'abc';
      parent.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.aValueWas = newValue
        }
      );

      child.$digest();
      expect(child.aValueWas).toBeUndefined();
    });

    it('keeps a record of its children', function() {
      var parent = new Scope();
      var child1 = parent.$new();
      var child2 = parent.$new();
      var child2_1 = child2.$new();

      expect(parent.$$children.length).toBe(2);
      expect(parent.$$children[0]).toBe(child1);
      expect(parent.$$children[1]).toBe(child2);

      expect(child1.$$children.length).toBe(0);

      expect(child2.$$children.length).toBe(1);
      expect(child2.$$children[0]).toBe(child2_1);
    });

    it('digests its children', function() {
      var parent = new Scope();
      var child = parent.$new();

      parent.aValue = 'abc';

      child.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.aValueWas = newValue
        }
      );

      parent.$digest();
      expect(child.aValueWas).toBe('abc');
    });

    it('digests from root on $apply', function() {
      var parent = new Scope();
      var child = parent.$new();
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;

      parent.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      child2.$apply((scope) => {});
      expect(parent.counter).toBe(1);
    });

    it('schedules a digests from root on $evalAsync', function(done) {
      var parent = new Scope();
      var child = parent.$new();
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;

      parent.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      child2.$evalAsync((scope) => {});

      setTimeout(() => {
        expect(parent.counter).toBe(1);
        done();
      });

    });

    it('does not have access to parent attributes when isolated', function() {
      var parent = new Scope();
      var child = parent.$new(true);
      parent.aValue = 'abc';
      expect(child.aValue).toBeUndefined();
    });

    it('cannot watch parent attributes when isolated', function() {
      var parent = new Scope();
      var child = parent.$new(true);
      parent.aValue = 'abc';

      child.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.aValueWas = newValue;
        }
      );

      child.$digest();
      expect(child.aValueWas).toBeUndefined();
    });

    it('digests its isolated children', function() {
      var parent = new Scope();
      var child = parent.$new(true);

      child.aValue = 'abc';

      child.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.aValueWas = newValue
        }
      );

      parent.$digest();
      expect(child.aValueWas).toBe('abc');
    });

    it('digests from root on $apply when isolated', function() {
      var parent = new Scope();
      var child = parent.$new(true);
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;

      parent.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      child2.$apply((scope) => {});

      expect(parent.counter).toBe(1);
    });

    it('schedules a digest from root on $evalAsync when isolated', function(done) {
      var parent = new Scope();
      var child = parent.$new(true);
      var child2 = child.$new();

      parent.aValue = 'abc';
      parent.counter = 0;

      parent.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => {
          scope.counter++;
        }
      );

      child2.$evalAsync((scope) => {});

      setTimeout(() => {
        expect(parent.counter).toBe(1);
        done();
      }, 50);
    });

    it('executes $evalAsync function on isolated scopes', function(done) {
      var parent = new Scope();
      var child = parent.$new(true);

      child.$evalAsync((scope) => {
        scope.didEvalAsync = true;
      });

      setTimeout(() => {
        expect(child.didEvalAsync).toBe(true);
        done();
      }, 50);
    });

    it('executes $$postDigest function on isolated scopes', function() {
      var parent = new Scope();
      var child = parent.$new(true);

      child.$$postDigest(() => {
        child.didPostDigest = true;
      });

      parent.$digest();
      expect(child.didPostDigest).toBe(true);
    });

    it('can take some other scope as the parent', function() {
      var prototypeParent = new Scope();
      var hierarchyParent = new Scope();
      var child = prototypeParent.$new(false, hierarchyParent);

      prototypeParent.a = 44;
      expect(child.a).toBe(44);

      child.counter = 0;
      child.$watch(
        (scope) => {
          scope.counter++;
        }
      );

      prototypeParent.$digest();
      expect(child.counter).toBe(0);

      hierarchyParent.$digest();
      expect(child.counter).toBe(2);
    });

    it('is no longer digested when $destroy has been called', function() {
      var parent = new Scope();
      var child = parent.$new();

      child.aValue = [1, 2, 3];
      child.counter = 0;

      child.$watch(
        (scope) => scope.aValue,
        (newValue, oldValue, scope) => { scope.counter++; },
        true
      );

      parent.$digest();
      expect(child.counter).toBe(1);

      child.aValue.push(4);
      parent.$digest();
      expect(child.counter).toBe(2);

      child.$destroy();
      child.aValue.push(5);
      parent.$digest();
      expect(child.counter).toBe(2);
    });
  });
});
