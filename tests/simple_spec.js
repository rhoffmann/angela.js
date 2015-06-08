describe("my module", function() {

  var sayHello;

  beforeEach(function(){
    sayHello = require('../src/sayHello');
  });

  it("should say hello to me", function() {
    expect(sayHello('Richard')).toEqual('Hello, Richard');
  })
});
