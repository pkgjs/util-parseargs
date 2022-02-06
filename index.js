'use strict';

const {
  ArrayPrototypeConcat,
  ArrayPrototypeIncludes,
  ArrayPrototypeSlice,
  ArrayPrototypeSplice,
  ArrayPrototypePush,
  ObjectHasOwn,
  StringPrototypeCharAt,
  StringPrototypeIncludes,
  StringPrototypeIndexOf,
  StringPrototypeMatch,
  StringPrototypeSlice,
  StringPrototypeStartsWith,
} = require('./primordials');

const {
  validateArray,
  validateObject
} = require('./validators');

const TOKENS = {
  FLAG: 1,
  NUMERIC: 2
};

function getMainArgs() {
  // This function is a placeholder for proposed process.mainArgs.
  // Work out where to slice process.argv for user supplied arguments.

  // Electron is an interested example, with work-arounds implemented in
  // Commander and Yargs. Hopefully Electron would support process.mainArgs
  // itself and render this work-around moot.
  //
  // In a bundled Electron app, the user CLI args directly
  // follow executable. (No special processing required for unbundled.)
  // 1) process.versions.electron is either set by electron, or undefined
  //    see https://github.com/electron/electron/blob/master/docs/api/process.md#processversionselectron-readonly
  // 2) process.defaultApp is undefined in a bundled Electron app, and set
  //    in an unbundled Electron app
  //    see https://github.com/electron/electron/blob/master/docs/api/process.md#processversionselectron-readonly
  // (Not included in tests as hopefully temporary example.)
  /* c8 ignore next 3 */
  if (process.versions && process.versions.electron && !process.defaultApp) {
    return ArrayPrototypeSlice(process.argv, 1);
  }

  // Check node options for scenarios where user CLI args follow executable.
  const execArgv = process.execArgv;
  if (StringPrototypeIncludes(execArgv, '-e') ||
      StringPrototypeIncludes(execArgv, '--eval') ||
      StringPrototypeIncludes(execArgv, '-p') ||
      StringPrototypeIncludes(execArgv, '--print')) {
    return ArrayPrototypeSlice(process.argv, 1);
  }

  // Normally first two arguments are executable and script, then CLI arguments
  return ArrayPrototypeSlice(process.argv, 2);
}

function storeOptionValue(parseOptions, option, value, result) {
  const multiple = parseOptions.multiples &&
    ArrayPrototypeIncludes(parseOptions.multiples, option);

  // Flags
  result.flags[option] = true;

  // Values
  if (multiple) {
    // Always store value in array, including for flags.
    // result.values[option] starts out not present,
    // first value is added as new array [newValue],
    // subsequent values are pushed to existing array.
    const usedAsFlag = value === undefined;
    const newValue = usedAsFlag ? true : value;
    if (result.values[option] !== undefined)
      ArrayPrototypePush(result.values[option], newValue);
    else
      result.values[option] = [newValue];
  } else {
    result.values[option] = value;
  }
}

const parseArgs = (
  argv = getMainArgs(),
  options = {}
) => {
  validateArray(argv, 'argv');
  validateObject(options, 'options');
  for (const key of ['withValue', 'multiples']) {
    if (ObjectHasOwn(options, key)) {
      validateArray(options[key], `options.${key}`);
    }
  }

  const result = {
    flags: {},
    values: {},
    positionals: []
  };

  let pos = 0;
  while (pos < argv.length) {
    let arg = argv[pos];
    if (StringPrototypeStartsWith(arg, '-')) {
      if (token(arg) === TOKENS.NUMERIC) {
        // Positional numerics, e.g., 33, 9995, -33.
        result.positionals = ArrayPrototypeConcat(result.positionals, arg);
        ++pos;
        continue;
      } else if (arg === '-') {
        // '-' commonly used to represent stdin/stdout, treat as positional
        result.positionals = ArrayPrototypeConcat(result.positionals, '-');
        ++pos;
        continue;
      } else if (arg === '--') {
        // Everything after a bare '--' is considered a positional argument
        // and is returned verbatim
        result.positionals = ArrayPrototypeConcat(
          result.positionals,
          ArrayPrototypeSlice(argv, ++pos)
        );
        return result;
      } else if (StringPrototypeCharAt(arg, 1) !== '-') {
        // Look for shortcodes: -fXzy and expand them to -f -X -z -y:
        if (arg.length > 2) {
          for (let i = 2; i < arg.length; i++) {
            const short = StringPrototypeCharAt(arg, i);
            // Case of `-o=foo`:
            if (short === '=') break;
            // Add 'i' to 'pos' such that short options are parsed in order
            // of definition:
            ArrayPrototypeSplice(argv, pos + (i - 1), 0, `-${short}`);
          }
        }
        const suffix = StringPrototypeSlice(arg, 2); // maybe -f=bar.
        arg = StringPrototypeCharAt(arg, 1); // short
        // Alias a short option to its long name.
        if (options.short && options.short[arg])
          arg = options.short[arg]; // now long!
        if (suffix.startsWith('='))
          arg += suffix; // Add =bar back to arg.
      } else {
        arg = StringPrototypeSlice(arg, 2); // remove leading --
      }
      if (StringPrototypeIncludes(arg, '=')) {
        // Store option=value same way independent of `withValue` as:
        // - looks like a value, store as a value
        // - match the intention of the user
        // - preserve information for author to process further
        const index = StringPrototypeIndexOf(arg, '=');
        storeOptionValue(
          options,
          StringPrototypeSlice(arg, 0, index),
          StringPrototypeSlice(arg, index + 1),
          result);
      } else if (peek(argv, pos) !== TOKENS.FLAG) {
        // withValue option should also support setting values when '=
        // isn't used ie. both --foo=b and --foo b should work

        // If withValue option is specified, take next position argument as
        // value and then increment pos so that we don't re-evaluate that
        // arg, else set value as undefined ie. --foo b --bar c, after setting
        // b as the value for foo, evaluate --bar next and skip 'b'
        const val = options.withValue &&
          (ArrayPrototypeIncludes(options.withValue, arg) ||
           ArrayPrototypeIncludes(options.multiples, arg)) ? argv[++pos] :
          undefined;
        storeOptionValue(options, arg, val, result);
      } else {
        // Cases when an arg is specified without a value, example
        // '--foo --bar' <- 'foo' and 'bar' flags should be set to true and
        // shave value as undefined
        storeOptionValue(options, arg, undefined, result);
      }

    } else {
      // Arguements without a dash prefix are considered "positional"
      ArrayPrototypePush(result.positionals, arg);
    }

    pos++;
  }

  return result;
};

// Look ahead to next token in argv array:
function peek(argv, pos) {
  if (pos + 1 >= argv.length) {
    return 0;
  }
  return token(argv[pos + 1]);
}

// Guess token type based on individual string from argv:
function token(arg) {
  const chr = StringPrototypeCharAt(arg, 0);
  const nextChr = StringPrototypeCharAt(arg, 1);
  if (StringPrototypeMatch(chr, /^[0-9]$/)) {
    return TOKENS.NUMERIC;
  } else if (chr === '-' && StringPrototypeMatch(nextChr, /^[0-9]$/)) {
    return TOKENS.NUMERIC;
  } else if (chr === '-') {
    return TOKENS.FLAG;
  }
  return 0;
}

module.exports = {
  parseArgs
};
