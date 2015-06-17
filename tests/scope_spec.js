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
  });
});
