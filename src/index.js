import Scope from './scope';

let sayHello = require('./sayHello');

function init() {
  var scope = new Scope();
  scope.name = 'Richard';
  let text = sayHello(scope.name);
  console.log(text);
}

init();

module.exports = init;
