'use strict';
/* eslint max-len: 0 */

const test = require('tape');
const { parseArgs } = require('../index.js');

test('when pass zero-config group of booleans then parsed as booleans', (t) => {
  const passedArgs = ['-rf', 'p'];
  const passedOptions = { };

  const result = parseArgs({ args: passedArgs, options: passedOptions });
  const expected = { flags: { r: true, f: true }, values: { r: undefined, f: undefined }, positionals: ['p'] };

  t.deepEqual(result, expected);

  t.end();
});

test('when pass low-config group of booleans then parsed as booleans', (t) => {
  const passedArgs = ['-rf', 'p'];
  const passedOptions = { r: {}, f: {} };

  const result = parseArgs({ args: passedArgs, options: passedOptions });
  const expected = { flags: { r: true, f: true }, values: { r: undefined, f: undefined }, positionals: ['p'] };

  t.deepEqual(result, expected);

  t.end();
});

test('when pass full-config group of booleans then parsed as booleans', (t) => {
  const passedArgs = ['-rf', 'p'];
  const passedOptions = { r: { type: 'boolean' }, f: { type: 'boolean' } };

  const result = parseArgs({ args: passedArgs, options: passedOptions });
  const expected = { flags: { r: true, f: true }, values: { r: undefined, f: undefined }, positionals: ['p'] };

  t.deepEqual(result, expected);

  t.end();
});

test('when pass group with string option on end then parsed as booleans and string option', (t) => {
  const passedArgs = ['-rf', 'p'];
  const passedOptions = { r: { type: 'boolean' }, f: { type: 'string' } };

  const result = parseArgs({ args: passedArgs, options: passedOptions });
  const expected = { flags: { r: true, f: true }, values: { r: undefined, f: 'p' }, positionals: [] };

  t.deepEqual(result, expected);

  t.end();
});

test('when pass group with string option in middle and strict:false then parsed as booleans and string option with trailing value', (t) => {
  const passedArgs = ['-afb', 'p'];
  const passedOptions = { f: { type: 'string' } };

  const result = parseArgs({ args: passedArgs, options: passedOptions, strict: false });
  const expected = { flags: { a: true, f: true }, values: { a: undefined, f: 'b' }, positionals: ['p'] };

  t.deepEqual(result, expected);

  t.end();
});

// Hopefully coming:
// test('when pass group with string option in middle and strict:true then error', (t) => {
//   const passedArgs = ['-afb', 'p'];
//   const passedOptions = { f: { type: 'string' } };
//
//   t.throws(() => {
//     parseArgs({ args: passedArgs, options: passedOptions, strict: true });
//   });
//
//   t.end();
// });