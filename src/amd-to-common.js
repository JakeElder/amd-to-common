var fs = require('fs');
var _ = require('underscore');
var esprima = require('esprima-fb');
var traverse = require('traverse');

var AMDNode = require('./lib/AMDNode');
var requireConverter = require('./lib/require-converter');
var exportConverter = require('./lib/export-converter');
var strictConverter = require('./lib/strict-converter');

var AMDToCommon = (function(){
  'use strict';

  /**
   * Constructor function for the Human library
   * @param {Object} [options]
   * @private
   */
  var _convert = function(options){
    options = options || {};
    this.files = options.files;
    this.parseOptions = { range: true, comment: true };
  };

  /**
   * Read each file and analyse the content
   */
  _convert.prototype.analyse = function(){
    _.each(this.files, _.bind(function(filename){
      var content = fs.readFileSync(filename, 'utf-8');
      console.log('Analysing file ' + filename);
      var newContent = this.convertToCommon(content);
      if(newContent === content){
        console.log('Nothing to do.');
        return;
      }
      console.log('Converting file to commonJS style require');
      fs.writeFileSync(filename, newContent);
    }, this));
  };

  _convert.prototype.getDefineNode = function(content) {
    var code = esprima.parse(content, this.parseOptions);
    var amdNodes = traverse(code).reduce(function(memo, node){
      var amdNode = new AMDNode(node);
      if(amdNode.isDefine()){
        memo.push(amdNode);
      }
      return memo;
    }, []);
    return _.first(amdNodes).node;
  },

  _convert.prototype.removeWrapper = function(content, defineNode) {
    var defineLines = content.substring(defineNode.range[0], defineNode.range[1]).split('\n');
    defineLines = defineLines.slice(1, -1);
    defineLines = defineLines.map(l => l.replace(/^  /, ''));
    return content.substring(0, defineNode.range[0]) + defineLines.join('\n') + content.substring(defineNode.range[1], content.length);
  },

  /**
   * Given the contents of a JS source file, parse the source
   * with esprima, then traverse the AST. Convert to common and
   * and output the new source.
   * @param {String} content The source content
   * @returns {String} The converted source, or the same source if nothing changed.
   */
  _convert.prototype.convertToCommon = function(content){
    var code = esprima.parse(content, this.parseOptions);
    // Filter the nodes to find all AMD style defines
    var amdNodes = traverse(code).reduce(function(memo, node){
      var amdNode = new AMDNode(node);
      if(amdNode.isAMDStyle()){
        memo.push(amdNode);
      }
      return memo;
    }, []);

    // For now, let's operate with a 1 per file assumption.
    var validNode = _.first(amdNodes);
    if(!validNode){
      return content;
    }

    var withRequire = requireConverter(content, validNode);

    var withExport = exportConverter(withRequire, this.getDefineNode(withRequire));
    var withoutWrapper = this.removeWrapper(withExport, this.getDefineNode(withExport));

    return withoutWrapper;
  };

  return _convert;
})();

module.exports = AMDToCommon;
