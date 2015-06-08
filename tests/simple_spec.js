describe("some object", function() {

  var myModule;

  beforeEach(function(){
    myModule = require('../src/module');
  });

  it("should exist", function() {
    expect(myModule()).toEqual('myModule');
  })
});
