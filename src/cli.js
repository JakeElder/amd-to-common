'use strict';

const AMDToCommon = require('./amd-to-common');
const files = process.argv.slice(2).filter(f => !/\/(vendor|misc)\//.test(f));
const converter = new AMDToCommon({ files });

converter.analyse();
