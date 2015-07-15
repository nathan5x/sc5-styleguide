var requireModule = require('requirefrom')('lib/modules'),
    chai = require('chai'),
    expect = chai.expect,
    multiline = require('multiline'),
    parser = requireModule('parsers/less.js');

describe('LESS parser', function() {

  describe('finding used variables', function() {

    it('should return all used variables', function() {
      var str = multiline(function() {
        /*
        color: @mycolor1;
        .testStyle {
          border: 1px solid @mycolor2;
        }
        .testStyle2 {
          background-color: @mycolor3;
        }
        */
      }),
      result = ['mycolor1', 'mycolor2', 'mycolor3'];
      expect(parser.findVariables(str)).eql(result);
    });

    it('should not return new variable definitions', function() {
      var str = multiline(function() {
        /*
        @mycolor: #00ff00;
        .testStyle {
          color: @mycolor2;
        }
        */
      }),
      result = ['mycolor2'];
      expect(parser.findVariables(str)).eql(result);
    });

    it('should find variables that are used as function arguments', function() {
      var str = multiline(function() {
        /*
        .testStyle {
          color: rgba(@mycolor, @myopacity);
        }
        */
      }),
      result = ['mycolor', 'myopacity'];
      expect(parser.findVariables(str)).eql(result);
    });

    it('should not find variables from variable declarations', function() {
      var str = multiline(function() {
        /*
        .testStyle {
          @sum: @var1 + @var2;
        }
        */
      }),
      result = [];
      expect(parser.findVariables(str)).eql(result);
    });
  });

  describe('finding variable declarations', function() {

    it('should parse basic variables', function() {
      var str = multiline(function() {
        /*
        @mycolor: #00ff00;
        @mypadding: 3px;
        @myfont:   "Helvetica Neue", Helvetica, Arial, sans-serif;
        */
      }),
      result = [
        {name: 'mycolor', value: '#00ff00', line: 1},
        {name: 'mypadding', value: '3px', line: 2},
        {name: 'myfont', value: '"Helvetica Neue", Helvetica, Arial, sans-serif', line: 3}
      ];
      expect(parser.parseVariableDeclarations(str)).eql(result);
    });

    it('should not detect variables that are only used not declarared', function() {
      var str = multiline(function() {
        /*
        .testStyle {
          color: @myvar;
        }
        */
      });
      expect(parser.parseVariableDeclarations(str)).eql([]);
    });

    it('should not return variables that are used as function arguments', function() {
      var str = multiline(function() {
        /*
        .testStyle {
          color: rgba(@mycolor, @myopacity);
        }
        */
      });
      expect(parser.parseVariableDeclarations(str)).eql([]);
    });

    it('should handle cases when variable value is another variable', function() {
      var str = multiline(function() {
        /*
        @var1: @another;
        */
      }),
      result = [{
        name: 'var1',
        value: '@another',
        line: 1
      }];
      expect(parser.parseVariableDeclarations(str)).eql(result);
    });

    it('should parse variables from file with containing comments and intended lines', function() {
      var str = multiline(function() {
        /*
        @mycolor: #00ff00;
        // Test comment
          @mypadding: 3px; // Test comment 2
        @myfont: "Helvetica Neue", Helvetica, Arial, sans-serif;
        */
      }),
      result = [
        {name: 'mycolor', value: '#00ff00', line: 1},
        {name: 'mypadding', value: '3px', line: 3},
        {name: 'myfont', value: '"Helvetica Neue", Helvetica, Arial, sans-serif', line: 4}
      ];
      expect(parser.parseVariableDeclarations(str)).eql(result);
    });

    it('should parse variables correct when there are multiple variables in a single line', function() {
      var str = '@color1: #ff0000; @color2: #00ff00; @color3: #0000ff;',
        result = [
          {name: 'color1', value: '#ff0000', line: 1},
          {name: 'color2', value: '#00ff00', line: 1},
          {name: 'color3', value: '#0000ff', line: 1}
        ];
      expect(parser.parseVariableDeclarations(str)).eql(result);
    });

    it('should not take commented variables', function() {
      var str = multiline(function() {
        /*
        @color1: #ff0000;
        // @color2: #00ff00;
        @color3: #0000ff;
        // @color4: #0f0f0f;
        */
      }),
      result = [
        {name: 'color1', value: '#ff0000', line: 1},
        {name: 'color3', value: '#0000ff', line: 3}
      ];
      expect(parser.parseVariableDeclarations(str)).eql(result);
    });

    it('should not detect @import as a variable', function() {
      var str = multiline(function() {
        /*
        @import 'file';
        */
      }),
      result = [];
      expect(parser.parseVariableDeclarations(str)).eql(result);
    });

    it('should accept variables named @import', function() {
      var str = multiline(function() {
        /*
        @import: 3px;
        */
      }),
      result = [
        {name: 'import', value: '3px', line: 1}
      ];
      expect(parser.parseVariableDeclarations(str)).eql(result);
    });
  });

  describe('settings variables', function() {

    it('should only change variable declaration', function() {
      var str = multiline(function() {
          /*
           @primary-color: #fdf70a;
           .foo {
             background-color: @primary-color;
           }
          */
        }),
        variables = [
          {name: 'primary-color', value: '#00ff00'}
        ],
        result = multiline(function() {
          /*
           @primary-color: #00ff00;
           .foo {
             background-color: @primary-color;
           }
           */
        }),
        changed = parser.setVariables(str, variables);
      expect(changed).eql(result);
    });

    it('should change single value variable', function() {
      var str = multiline(function() {
          /*
           @mycolor: #00ff00;
           @mypadding: 3px;
           @myfont:   "Helvetica Neue", Helvetica, Arial, sans-serif;
           */
        }),
        variables = [
          {name: 'mycolor', value: '#0000ff'},
          {name: 'mypadding', value: '5px'}
        ],
        result = multiline(function() {
          /*
           @mycolor: #0000ff;
           @mypadding: 5px;
           @myfont:   "Helvetica Neue", Helvetica, Arial, sans-serif;
           */
        }),
        changed = parser.setVariables(str, variables);
      expect(changed).eql(result);
    });

    it('should change complex value variable', function() {
      var str = multiline(function() {
          /*
           @mycolor: #00ff00;
           @mypadding: 3px;
           @myfont:   "Helvetica Neue", Helvetica, Arial, sans-serif;
           */
        }),
        variables = [
          {name: 'myfont', value: '"Helvetica Neue", Tahoma'}
        ],
        result = multiline(function() {
          /*
           @mycolor: #00ff00;
           @mypadding: 3px;
           @myfont:   "Helvetica Neue", Tahoma;
           */
        }),
        changed = parser.setVariables(str, variables);
      expect(changed).eql(result);
    });

    it('should not change variable when declaration contains the same variable in the function', function() {
      var str = multiline(function() {
          /*
           @mycolor: #0000ff;
           @another: lighten(@mycolor, 10%);
           */
        }),
        variables = [
          {name: 'mycolor', value: '#ffffff'}
        ],
        result = multiline(function() {
          /*
           @mycolor: #ffffff;
           @another: lighten(@mycolor, 10%);
           */
        }),
        changed = parser.setVariables(str, variables);
      expect(changed).eql(result);
    });

    it('should preserve indents', function() {
      var str = multiline(function() {
          /*

           @mycolor: #00ff00;

           @mypadding:   3px;
           */
        }),
        variables = [
          {name: 'mypadding', value: '5px'}
        ],
        result = multiline(function() {
          /*

           @mycolor: #00ff00;

           @mypadding:   5px;
           */
        }),
        changed = parser.setVariables(str, variables);
      expect(changed).eql(result);
    });

    it('should preserve multiline comments', function() {
      var str = '' +
          '@mycolor: #00ff00;\n' +
          '/* Comment */\n' +
          '@mypadding: 3px;',
        variables = [
          {name: 'mypadding', value: '0'}
        ],
        result = '' +
          '@mycolor: #00ff00;\n' +
          '/* Comment */\n' +
          '@mypadding: 0;',
        changed = parser.setVariables(str, variables);
      expect(changed).eql(result);
    });

  });
});
