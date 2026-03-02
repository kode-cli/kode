#!/usr/bin/env node

const oclif = require('@oclif/core');

oclif.run(process.argv.slice(2), require('../package.json'))
  .then(oclif.flush)
  .catch(oclif.Errors.handle);
