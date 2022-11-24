function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;
  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }
  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);
  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }
  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }
  return desc;
}

// make PromiseIndex a nominal typing
var PromiseIndexBrand;
(function (PromiseIndexBrand) {
  PromiseIndexBrand[PromiseIndexBrand["_"] = -1] = "_";
})(PromiseIndexBrand || (PromiseIndexBrand = {}));
const TYPE_KEY = "typeInfo";
var TypeBrand;
(function (TypeBrand) {
  TypeBrand["BIGINT"] = "bigint";
  TypeBrand["DATE"] = "date";
})(TypeBrand || (TypeBrand = {}));
const ERR_INCONSISTENT_STATE = "The collection is an inconsistent state. Did previous smart contract execution terminate unexpectedly?";
const ERR_INDEX_OUT_OF_BOUNDS = "Index out of bounds";
function u8ArrayToBytes(array) {
  return array.reduce((result, value) => `${result}${String.fromCharCode(value)}`, "");
}
// TODO this function is a bit broken and the type can't be string
// TODO for more info: https://github.com/near/near-sdk-js/issues/78
function bytesToU8Array(bytes) {
  return Uint8Array.from([...bytes].map(byte => byte.charCodeAt(0)));
}
/**
 * Accepts a string or Uint8Array and either checks for the validity of the string or converts the Uint8Array to Bytes.
 *
 * @param stringOrU8Array - The string or Uint8Array to be checked/transformed
 * @returns Safe Bytes to be used in NEAR calls.
 */
function bytes(stringOrU8Array) {
  if (typeof stringOrU8Array === "string") {
    return checkStringIsBytes(stringOrU8Array);
  }
  if (stringOrU8Array instanceof Uint8Array) {
    return u8ArrayToBytes(stringOrU8Array);
  }
  throw new Error("bytes: expected string or Uint8Array");
}
function checkStringIsBytes(value) {
  [...value].forEach((character, index) => {
    assert(character.charCodeAt(0) <= 255, `string ${value} at index ${index}: ${character} is not a valid byte`);
  });
  return value;
}
/**
 * Asserts that the expression passed to the function is truthy, otherwise throws a new Error with the provided message.
 *
 * @param expression - The expression to be asserted.
 * @param message - The error message to be printed.
 */
function assert(expression, message) {
  if (!expression) {
    throw new Error("assertion failed: " + message);
  }
}
function getValueWithOptions(value, options = {
  deserializer: deserialize
}) {
  const deserialized = deserialize(value);
  if (deserialized === undefined || deserialized === null) {
    return options?.defaultValue ?? null;
  }
  if (options?.reconstructor) {
    return options.reconstructor(deserialized);
  }
  return deserialized;
}
function serializeValueWithOptions(value, {
  serializer
} = {
  serializer: serialize
}) {
  return serializer(value);
}
function serialize(valueToSerialize) {
  return JSON.stringify(valueToSerialize, function (key, value) {
    if (typeof value === "bigint") {
      return {
        value: value.toString(),
        [TYPE_KEY]: TypeBrand.BIGINT
      };
    }
    if (typeof this[key] === "object" && this[key] !== null && this[key] instanceof Date) {
      return {
        value: this[key].toISOString(),
        [TYPE_KEY]: TypeBrand.DATE
      };
    }
    return value;
  });
}
function deserialize(valueToDeserialize) {
  return JSON.parse(valueToDeserialize, (_, value) => {
    if (value !== null && typeof value === "object" && Object.keys(value).length === 2 && Object.keys(value).every(key => ["value", TYPE_KEY].includes(key))) {
      switch (value[TYPE_KEY]) {
        case TypeBrand.BIGINT:
          return BigInt(value["value"]);
        case TypeBrand.DATE:
          return new Date(value["value"]);
      }
    }
    return value;
  });
}

/**
 * A Promise result in near can be one of:
 * - NotReady = 0 - the promise you are specifying is still not ready, not yet failed nor successful.
 * - Successful = 1 - the promise has been successfully executed and you can retrieve the resulting value.
 * - Failed = 2 - the promise execution has failed.
 */
var PromiseResult;
(function (PromiseResult) {
  PromiseResult[PromiseResult["NotReady"] = 0] = "NotReady";
  PromiseResult[PromiseResult["Successful"] = 1] = "Successful";
  PromiseResult[PromiseResult["Failed"] = 2] = "Failed";
})(PromiseResult || (PromiseResult = {}));
/**
 * A promise error can either be due to the promise failing or not yet being ready.
 */
var PromiseError;
(function (PromiseError) {
  PromiseError[PromiseError["Failed"] = 0] = "Failed";
  PromiseError[PromiseError["NotReady"] = 1] = "NotReady";
})(PromiseError || (PromiseError = {}));

/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function assertNumber(n) {
  if (!Number.isSafeInteger(n)) throw new Error(`Wrong integer: ${n}`);
}
function chain(...args) {
  const wrap = (a, b) => c => a(b(c));
  const encode = Array.from(args).reverse().reduce((acc, i) => acc ? wrap(acc, i.encode) : i.encode, undefined);
  const decode = args.reduce((acc, i) => acc ? wrap(acc, i.decode) : i.decode, undefined);
  return {
    encode,
    decode
  };
}
function alphabet(alphabet) {
  return {
    encode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('alphabet.encode input should be an array of numbers');
      return digits.map(i => {
        assertNumber(i);
        if (i < 0 || i >= alphabet.length) throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
        return alphabet[i];
      });
    },
    decode: input => {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('alphabet.decode input should be array of strings');
      return input.map(letter => {
        if (typeof letter !== 'string') throw new Error(`alphabet.decode: not string element=${letter}`);
        const index = alphabet.indexOf(letter);
        if (index === -1) throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet}`);
        return index;
      });
    }
  };
}
function join(separator = '') {
  if (typeof separator !== 'string') throw new Error('join separator should be string');
  return {
    encode: from => {
      if (!Array.isArray(from) || from.length && typeof from[0] !== 'string') throw new Error('join.encode input should be array of strings');
      for (let i of from) if (typeof i !== 'string') throw new Error(`join.encode: non-string input=${i}`);
      return from.join(separator);
    },
    decode: to => {
      if (typeof to !== 'string') throw new Error('join.decode input should be string');
      return to.split(separator);
    }
  };
}
function padding(bits, chr = '=') {
  assertNumber(bits);
  if (typeof chr !== 'string') throw new Error('padding chr should be string');
  return {
    encode(data) {
      if (!Array.isArray(data) || data.length && typeof data[0] !== 'string') throw new Error('padding.encode input should be array of strings');
      for (let i of data) if (typeof i !== 'string') throw new Error(`padding.encode: non-string input=${i}`);
      while (data.length * bits % 8) data.push(chr);
      return data;
    },
    decode(input) {
      if (!Array.isArray(input) || input.length && typeof input[0] !== 'string') throw new Error('padding.encode input should be array of strings');
      for (let i of input) if (typeof i !== 'string') throw new Error(`padding.decode: non-string input=${i}`);
      let end = input.length;
      if (end * bits % 8) throw new Error('Invalid padding: string should have whole number of bytes');
      for (; end > 0 && input[end - 1] === chr; end--) {
        if (!((end - 1) * bits % 8)) throw new Error('Invalid padding: string has too much padding');
      }
      return input.slice(0, end);
    }
  };
}
function normalize(fn) {
  if (typeof fn !== 'function') throw new Error('normalize fn should be function');
  return {
    encode: from => from,
    decode: to => fn(to)
  };
}
function convertRadix(data, from, to) {
  if (from < 2) throw new Error(`convertRadix: wrong from=${from}, base cannot be less than 2`);
  if (to < 2) throw new Error(`convertRadix: wrong to=${to}, base cannot be less than 2`);
  if (!Array.isArray(data)) throw new Error('convertRadix: data should be array');
  if (!data.length) return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data);
  digits.forEach(d => {
    assertNumber(d);
    if (d < 0 || d >= from) throw new Error(`Wrong integer: ${d}`);
  });
  while (true) {
    let carry = 0;
    let done = true;
    for (let i = pos; i < digits.length; i++) {
      const digit = digits[i];
      const digitBase = from * carry + digit;
      if (!Number.isSafeInteger(digitBase) || from * carry / from !== carry || digitBase - digit !== from * carry) {
        throw new Error('convertRadix: carry overflow');
      }
      carry = digitBase % to;
      digits[i] = Math.floor(digitBase / to);
      if (!Number.isSafeInteger(digits[i]) || digits[i] * to + carry !== digitBase) throw new Error('convertRadix: carry overflow');
      if (!done) continue;else if (!digits[i]) pos = i;else done = false;
    }
    res.push(carry);
    if (done) break;
  }
  for (let i = 0; i < data.length - 1 && data[i] === 0; i++) res.push(0);
  return res.reverse();
}
const gcd = (a, b) => !b ? a : gcd(b, a % b);
const radix2carry = (from, to) => from + (to - gcd(from, to));
function convertRadix2(data, from, to, padding) {
  if (!Array.isArray(data)) throw new Error('convertRadix2: data should be array');
  if (from <= 0 || from > 32) throw new Error(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 32) throw new Error(`convertRadix2: wrong to=${to}`);
  if (radix2carry(from, to) > 32) {
    throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
  }
  let carry = 0;
  let pos = 0;
  const mask = 2 ** to - 1;
  const res = [];
  for (const n of data) {
    assertNumber(n);
    if (n >= 2 ** from) throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
    carry = carry << from | n;
    if (pos + from > 32) throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
    pos += from;
    for (; pos >= to; pos -= to) res.push((carry >> pos - to & mask) >>> 0);
    carry &= 2 ** pos - 1;
  }
  carry = carry << to - pos & mask;
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res.push(carry >>> 0);
  return res;
}
function radix(num) {
  assertNumber(num);
  return {
    encode: bytes => {
      if (!(bytes instanceof Uint8Array)) throw new Error('radix.encode input should be Uint8Array');
      return convertRadix(Array.from(bytes), 2 ** 8, num);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix.decode input should be array of strings');
      return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
    }
  };
}
function radix2(bits, revPadding = false) {
  assertNumber(bits);
  if (bits <= 0 || bits > 32) throw new Error('radix2: bits should be in (0..32]');
  if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32) throw new Error('radix2: carry overflow');
  return {
    encode: bytes => {
      if (!(bytes instanceof Uint8Array)) throw new Error('radix2.encode input should be Uint8Array');
      return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
    },
    decode: digits => {
      if (!Array.isArray(digits) || digits.length && typeof digits[0] !== 'number') throw new Error('radix2.decode input should be array of strings');
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    }
  };
}
function unsafeWrapper(fn) {
  if (typeof fn !== 'function') throw new Error('unsafeWrapper fn should be function');
  return function (...args) {
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}
const base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
const base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize(s => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
const base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
const base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));
const genBase58 = abc => chain(radix(58), alphabet(abc), join(''));
const base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const base58xmr = {
  encode(data) {
    let res = '';
    for (let i = 0; i < data.length; i += 8) {
      const block = data.subarray(i, i + 8);
      res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
    }
    return res;
  },
  decode(str) {
    let res = [];
    for (let i = 0; i < str.length; i += 11) {
      const slice = str.slice(i, i + 11);
      const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
      const block = base58.decode(slice);
      for (let j = 0; j < block.length - blockLen; j++) {
        if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
      }
      res = res.concat(Array.from(block.slice(block.length - blockLen)));
    }
    return Uint8Array.from(res);
  }
};
const BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(pre) {
  const b = pre >> 25;
  let chk = (pre & 0x1ffffff) << 5;
  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if ((b >> i & 1) === 1) chk ^= POLYMOD_GENERATORS[i];
  }
  return chk;
}
function bechChecksum(prefix, words, encodingConst = 1) {
  const len = prefix.length;
  let chk = 1;
  for (let i = 0; i < len; i++) {
    const c = prefix.charCodeAt(i);
    if (c < 33 || c > 126) throw new Error(`Invalid prefix (${prefix})`);
    chk = bech32Polymod(chk) ^ c >> 5;
  }
  chk = bech32Polymod(chk);
  for (let i = 0; i < len; i++) chk = bech32Polymod(chk) ^ prefix.charCodeAt(i) & 0x1f;
  for (let v of words) chk = bech32Polymod(chk) ^ v;
  for (let i = 0; i < 6; i++) chk = bech32Polymod(chk);
  chk ^= encodingConst;
  return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}
function genBech32(encoding) {
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
  const _words = radix2(5);
  const fromWords = _words.decode;
  const toWords = _words.encode;
  const fromWordsUnsafe = unsafeWrapper(fromWords);
  function encode(prefix, words, limit = 90) {
    if (typeof prefix !== 'string') throw new Error(`bech32.encode prefix should be string, not ${typeof prefix}`);
    if (!Array.isArray(words) || words.length && typeof words[0] !== 'number') throw new Error(`bech32.encode words should be array of numbers, not ${typeof words}`);
    const actualLength = prefix.length + 7 + words.length;
    if (limit !== false && actualLength > limit) throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    prefix = prefix.toLowerCase();
    return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
  }
  function decode(str, limit = 90) {
    if (typeof str !== 'string') throw new Error(`bech32.decode input should be string, not ${typeof str}`);
    if (str.length < 8 || limit !== false && str.length > limit) throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
    const lowered = str.toLowerCase();
    if (str !== lowered && str !== str.toUpperCase()) throw new Error(`String must be lowercase or uppercase`);
    str = lowered;
    const sepIndex = str.lastIndexOf('1');
    if (sepIndex === 0 || sepIndex === -1) throw new Error(`Letter "1" must be present between prefix and data only`);
    const prefix = str.slice(0, sepIndex);
    const _words = str.slice(sepIndex + 1);
    if (_words.length < 6) throw new Error('Data must be at least 6 characters long');
    const words = BECH_ALPHABET.decode(_words).slice(0, -6);
    const sum = bechChecksum(prefix, words, ENCODING_CONST);
    if (!_words.endsWith(sum)) throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
    return {
      prefix,
      words
    };
  }
  const decodeUnsafe = unsafeWrapper(decode);
  function decodeToBytes(str) {
    const {
      prefix,
      words
    } = decode(str, false);
    return {
      prefix,
      words,
      bytes: fromWords(words)
    };
  }
  return {
    encode,
    decode,
    decodeToBytes,
    decodeUnsafe,
    fromWords,
    fromWordsUnsafe,
    toWords
  };
}
genBech32('bech32');
genBech32('bech32m');
const utf8 = {
  encode: data => new TextDecoder().decode(data),
  decode: str => new TextEncoder().encode(str)
};
const hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize(s => {
  if (typeof s !== 'string' || s.length % 2) throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
  return s.toLowerCase();
}));
const CODERS = {
  utf8,
  hex,
  base16,
  base32,
  base64,
  base64url,
  base58,
  base58xmr
};
`Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`;

var CurveType;
(function (CurveType) {
  CurveType[CurveType["ED25519"] = 0] = "ED25519";
  CurveType[CurveType["SECP256K1"] = 1] = "SECP256K1";
})(CurveType || (CurveType = {}));
var DataLength;
(function (DataLength) {
  DataLength[DataLength["ED25519"] = 32] = "ED25519";
  DataLength[DataLength["SECP256K1"] = 64] = "SECP256K1";
})(DataLength || (DataLength = {}));

const U64_MAX = 2n ** 64n - 1n;
const EVICTED_REGISTER = U64_MAX - 1n;
/**
 * Logs parameters in the NEAR WASM virtual machine.
 *
 * @param params - Parameters to log.
 */
function log(...params) {
  env.log(params.reduce((accumulated, parameter, index) => {
    // Stringify undefined
    const param = parameter === undefined ? "undefined" : parameter;
    // Convert Objects to strings and convert to string
    const stringified = typeof param === "object" ? JSON.stringify(param) : `${param}`;
    if (index === 0) {
      return stringified;
    }
    return `${accumulated} ${stringified}`;
  }, ""));
}
/**
 * Returns the account ID of the account that signed the transaction.
 * Can only be called in a call or initialize function.
 */
function signerAccountId() {
  env.signer_account_id(0);
  return env.read_register(0);
}
/**
 * Returns the account ID of the account that called the function.
 * Can only be called in a call or initialize function.
 */
function predecessorAccountId() {
  env.predecessor_account_id(0);
  return env.read_register(0);
}
/**
 * Returns the account ID of the current contract - the contract that is being executed.
 */
function currentAccountId() {
  env.current_account_id(0);
  return env.read_register(0);
}
/**
 * Returns the amount of NEAR attached to this function call.
 * Can only be called in payable functions.
 */
function attachedDeposit() {
  return env.attached_deposit();
}
/**
 * Returns the current account's account balance.
 */
function accountBalance() {
  return env.account_balance();
}
/**
 * Reads the value from NEAR storage that is stored under the provided key.
 *
 * @param key - The key to read from storage.
 */
function storageRead(key) {
  const returnValue = env.storage_read(key, 0);
  if (returnValue !== 1n) {
    return null;
  }
  return env.read_register(0);
}
/**
 * Checks for the existance of a value under the provided key in NEAR storage.
 *
 * @param key - The key to check for in storage.
 */
function storageHasKey(key) {
  return env.storage_has_key(key) === 1n;
}
/**
 * Get the last written or removed value from NEAR storage.
 */
function storageGetEvicted() {
  return env.read_register(EVICTED_REGISTER);
}
/**
 * Returns the current accounts NEAR storage usage.
 */
function storageUsage() {
  return env.storage_usage();
}
/**
 * Writes the provided bytes to NEAR storage under the provided key.
 *
 * @param key - The key under which to store the value.
 * @param value - The value to store.
 */
function storageWrite(key, value) {
  return env.storage_write(key, value, EVICTED_REGISTER) === 1n;
}
/**
 * Removes the value of the provided key from NEAR storage.
 *
 * @param key - The key to be removed.
 */
function storageRemove(key) {
  return env.storage_remove(key, EVICTED_REGISTER) === 1n;
}
/**
 * Returns the cost of storing 0 Byte on NEAR storage.
 */
function storageByteCost() {
  return 10000000000000000000n;
}
/**
 * Returns the arguments passed to the current smart contract call.
 */
function input() {
  env.input(0);
  return env.read_register(0);
}
/**
 * Attach a callback NEAR promise to be executed after a provided promise.
 *
 * @param promiseIndex - The promise after which to call the callback.
 * @param accountId - The account ID of the contract to perform the callback on.
 * @param methodName - The name of the method to call.
 * @param args - The arguments to call the method with.
 * @param amount - The amount of NEAR to attach to the call.
 * @param gas - The amount of Gas to attach to the call.
 */
function promiseThen(promiseIndex, accountId, methodName, args, amount, gas) {
  return env.promise_then(promiseIndex, accountId, methodName, args, amount, gas);
}
/**
 * Create a NEAR promise which will have multiple promise actions inside.
 *
 * @param accountId - The account ID of the target contract.
 */
function promiseBatchCreate(accountId) {
  return env.promise_batch_create(accountId);
}
/**
 * Attach a function call promise action to the NEAR promise index with the provided promise index.
 *
 * @param promiseIndex - The index of the promise to attach a function call action to.
 * @param methodName - The name of the method to be called.
 * @param args - The arguments to call the method with.
 * @param amount - The amount of NEAR to attach to the call.
 * @param gas - The amount of Gas to attach to the call.
 */
function promiseBatchActionFunctionCall(promiseIndex, methodName, args, amount, gas) {
  env.promise_batch_action_function_call(promiseIndex, methodName, args, amount, gas);
}
/**
 * Attach a transfer promise action to the NEAR promise index with the provided promise index.
 *
 * @param promiseIndex - The index of the promise to attach a transfer action to.
 * @param amount - The amount of NEAR to transfer.
 */
function promiseBatchActionTransfer(promiseIndex, amount) {
  env.promise_batch_action_transfer(promiseIndex, amount);
}
/**
 * Returns the result of the NEAR promise for the passed promise index.
 *
 * @param promiseIndex - The index of the promise to return the result for.
 */
function promiseResult(promiseIndex) {
  const status = env.promise_result(promiseIndex, 0);
  assert(Number(status) === PromiseResult.Successful, `Promise result ${status == PromiseResult.Failed ? "Failed" : status == PromiseResult.NotReady ? "NotReady" : status}`);
  return env.read_register(0);
}
/**
 * Executes the promise in the NEAR WASM virtual machine.
 *
 * @param promiseIndex - The index of the promise to execute.
 */
function promiseReturn(promiseIndex) {
  env.promise_return(promiseIndex);
}

/**
 * Tells the SDK to use this function as the initialization function of the contract.
 *
 * @param _empty - An empty object.
 */
function initialize(_empty) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_target, _key, _descriptor
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) {};
}
/**
 * Tells the SDK to expose this function as a view function.
 *
 * @param _empty - An empty object.
 */
function view(_empty) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_target, _key, _descriptor
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) {};
}
function call({
  privateFunction = false,
  payableFunction = false
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_target, _key, descriptor) {
    const originalMethod = descriptor.value;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    descriptor.value = function (...args) {
      if (privateFunction && predecessorAccountId() !== currentAccountId()) {
        throw new Error("Function is private");
      }
      if (!payableFunction && attachedDeposit() > 0n) {
        throw new Error("Function is not payable");
      }
      return originalMethod.apply(this, args);
    };
  };
}
function NearBindgen({
  requireInit = false,
  serializer = serialize,
  deserializer = deserialize
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return target => {
    return class extends target {
      static _create() {
        return new target();
      }
      static _getState() {
        const rawState = storageRead("STATE");
        return rawState ? this._deserialize(rawState) : null;
      }
      static _saveToStorage(objectToSave) {
        storageWrite("STATE", this._serialize(objectToSave));
      }
      static _getArgs() {
        return JSON.parse(input() || "{}");
      }
      static _serialize(value, forReturn = false) {
        if (forReturn) {
          return JSON.stringify(value, (_, value) => typeof value === "bigint" ? `${value}` : value);
        }
        return serializer(value);
      }
      static _deserialize(value) {
        return deserializer(value);
      }
      static _reconstruct(classObject, plainObject) {
        for (const item in classObject) {
          const reconstructor = classObject[item].constructor?.reconstruct;
          classObject[item] = reconstructor ? reconstructor(plainObject[item]) : plainObject[item];
        }
        return classObject;
      }
      static _requireInit() {
        return requireInit;
      }
    };
  };
}

/**
 * A lookup map that stores data in NEAR storage.
 */
class LookupMap {
  /**
   * @param keyPrefix - The byte prefix to use when storing elements inside this collection.
   */
  constructor(keyPrefix) {
    this.keyPrefix = keyPrefix;
  }
  /**
   * Checks whether the collection contains the value.
   *
   * @param key - The value for which to check the presence.
   */
  containsKey(key) {
    const storageKey = this.keyPrefix + key;
    return storageHasKey(storageKey);
  }
  /**
   * Get the data stored at the provided key.
   *
   * @param key - The key at which to look for the data.
   * @param options - Options for retrieving the data.
   */
  get(key, options) {
    const storageKey = this.keyPrefix + key;
    const value = storageRead(storageKey);
    return getValueWithOptions(value, options);
  }
  /**
   * Removes and retrieves the element with the provided key.
   *
   * @param key - The key at which to remove data.
   * @param options - Options for retrieving the data.
   */
  remove(key, options) {
    const storageKey = this.keyPrefix + key;
    if (!storageRemove(storageKey)) {
      return options?.defaultValue ?? null;
    }
    const value = storageGetEvicted();
    return getValueWithOptions(value, options);
  }
  /**
   * Store a new value at the provided key.
   *
   * @param key - The key at which to store in the collection.
   * @param newValue - The value to store in the collection.
   * @param options - Options for retrieving and storing the data.
   */
  set(key, newValue, options) {
    const storageKey = this.keyPrefix + key;
    const storageValue = serializeValueWithOptions(newValue, options);
    if (!storageWrite(storageKey, storageValue)) {
      return options?.defaultValue ?? null;
    }
    const value = storageGetEvicted();
    return getValueWithOptions(value, options);
  }
  /**
   * Extends the current collection with the passed in array of key-value pairs.
   *
   * @param keyValuePairs - The key-value pairs to extend the collection with.
   * @param options - Options for storing the data.
   */
  extend(keyValuePairs, options) {
    for (const [key, value] of keyValuePairs) {
      this.set(key, value, options);
    }
  }
  /**
   * Serialize the collection.
   *
   * @param options - Options for storing the data.
   */
  serialize(options) {
    return serializeValueWithOptions(this, options);
  }
  /**
   * Converts the deserialized data from storage to a JavaScript instance of the collection.
   *
   * @param data - The deserialized data to create an instance from.
   */
  static reconstruct(data) {
    return new LookupMap(data.keyPrefix);
  }
}

function indexToKey(prefix, index) {
  const data = new Uint32Array([index]);
  const array = new Uint8Array(data.buffer);
  const key = u8ArrayToBytes(array);
  return prefix + key;
}
/**
 * An iterable implementation of vector that stores its content on the trie.
 * Uses the following map: index -> element
 */
class Vector {
  /**
   * @param prefix - The byte prefix to use when storing elements inside this collection.
   * @param length - The initial length of the collection. By default 0.
   */
  constructor(prefix, length = 0) {
    this.prefix = prefix;
    this.length = length;
  }
  /**
   * Checks whether the collection is empty.
   */
  isEmpty() {
    return this.length === 0;
  }
  /**
   * Get the data stored at the provided index.
   *
   * @param index - The index at which to look for the data.
   * @param options - Options for retrieving the data.
   */
  get(index, options) {
    if (index >= this.length) {
      return options?.defaultValue ?? null;
    }
    const storageKey = indexToKey(this.prefix, index);
    const value = storageRead(storageKey);
    return getValueWithOptions(value, options);
  }
  /**
   * Removes an element from the vector and returns it in serialized form.
   * The removed element is replaced by the last element of the vector.
   * Does not preserve ordering, but is `O(1)`.
   *
   * @param index - The index at which to remove the element.
   * @param options - Options for retrieving and storing the data.
   */
  swapRemove(index, options) {
    assert(index < this.length, ERR_INDEX_OUT_OF_BOUNDS);
    if (index + 1 === this.length) {
      return this.pop(options);
    }
    const key = indexToKey(this.prefix, index);
    const last = this.pop(options);
    assert(storageWrite(key, serializeValueWithOptions(last, options)), ERR_INCONSISTENT_STATE);
    const value = storageGetEvicted();
    return getValueWithOptions(value, options);
  }
  /**
   * Adds data to the collection.
   *
   * @param element - The data to store.
   * @param options - Options for storing the data.
   */
  push(element, options) {
    const key = indexToKey(this.prefix, this.length);
    this.length += 1;
    storageWrite(key, serializeValueWithOptions(element, options));
  }
  /**
   * Removes and retrieves the element with the highest index.
   *
   * @param options - Options for retrieving the data.
   */
  pop(options) {
    if (this.isEmpty()) {
      return options?.defaultValue ?? null;
    }
    const lastIndex = this.length - 1;
    const lastKey = indexToKey(this.prefix, lastIndex);
    this.length -= 1;
    assert(storageRemove(lastKey), ERR_INCONSISTENT_STATE);
    const value = storageGetEvicted();
    return getValueWithOptions(value, options);
  }
  /**
   * Replaces the data stored at the provided index with the provided data and returns the previously stored data.
   *
   * @param index - The index at which to replace the data.
   * @param element - The data to replace with.
   * @param options - Options for retrieving and storing the data.
   */
  replace(index, element, options) {
    assert(index < this.length, ERR_INDEX_OUT_OF_BOUNDS);
    const key = indexToKey(this.prefix, index);
    assert(storageWrite(key, serializeValueWithOptions(element, options)), ERR_INCONSISTENT_STATE);
    const value = storageGetEvicted();
    return getValueWithOptions(value, options);
  }
  /**
   * Extends the current collection with the passed in array of elements.
   *
   * @param elements - The elements to extend the collection with.
   */
  extend(elements) {
    for (const element of elements) {
      this.push(element);
    }
  }
  [Symbol.iterator]() {
    return new VectorIterator(this);
  }
  /**
   * Create a iterator on top of the default collection iterator using custom options.
   *
   * @param options - Options for retrieving and storing the data.
   */
  createIteratorWithOptions(options) {
    return {
      [Symbol.iterator]: () => new VectorIterator(this, options)
    };
  }
  /**
   * Return a JavaScript array of the data stored within the collection.
   *
   * @param options - Options for retrieving and storing the data.
   */
  toArray(options) {
    const array = [];
    const iterator = options ? this.createIteratorWithOptions(options) : this;
    for (const value of iterator) {
      array.push(value);
    }
    return array;
  }
  /**
   * Remove all of the elements stored within the collection.
   */
  clear() {
    for (let index = 0; index < this.length; index++) {
      const key = indexToKey(this.prefix, index);
      storageRemove(key);
    }
    this.length = 0;
  }
  /**
   * Serialize the collection.
   *
   * @param options - Options for storing the data.
   */
  serialize(options) {
    return serializeValueWithOptions(this, options);
  }
  /**
   * Converts the deserialized data from storage to a JavaScript instance of the collection.
   *
   * @param data - The deserialized data to create an instance from.
   */
  static reconstruct(data) {
    const vector = new Vector(data.prefix, data.length);
    return vector;
  }
}
/**
 * An iterator for the Vector collection.
 */
class VectorIterator {
  /**
   * @param vector - The vector collection to create an iterator for.
   * @param options - Options for retrieving and storing data.
   */
  constructor(vector, options) {
    this.vector = vector;
    this.options = options;
    this.current = 0;
  }
  next() {
    if (this.current >= this.vector.length) {
      return {
        value: null,
        done: true
      };
    }
    const value = this.vector.get(this.current, this.options);
    this.current += 1;
    return {
      value,
      done: false
    };
  }
}

/**
 * An unordered map that stores data in NEAR storage.
 */
class UnorderedMap {
  /**
   * @param prefix - The byte prefix to use when storing elements inside this collection.
   */
  constructor(prefix) {
    this.prefix = prefix;
    this.keys = new Vector(`${prefix}u`); // intentional different prefix with old UnorderedMap
    this.values = new LookupMap(`${prefix}m`);
  }
  /**
   * The number of elements stored in the collection.
   */
  get length() {
    return this.keys.length;
  }
  /**
   * Checks whether the collection is empty.
   */
  isEmpty() {
    return this.keys.isEmpty();
  }
  /**
   * Get the data stored at the provided key.
   *
   * @param key - The key at which to look for the data.
   * @param options - Options for retrieving the data.
   */
  get(key, options) {
    const valueAndIndex = this.values.get(key);
    if (valueAndIndex === null) {
      return options?.defaultValue ?? null;
    }
    const [value] = valueAndIndex;
    return getValueWithOptions(value, options);
  }
  /**
   * Store a new value at the provided key.
   *
   * @param key - The key at which to store in the collection.
   * @param value - The value to store in the collection.
   * @param options - Options for retrieving and storing the data.
   */
  set(key, value, options) {
    const valueAndIndex = this.values.get(key);
    const serialized = serializeValueWithOptions(value, options);
    if (valueAndIndex === null) {
      const newElementIndex = this.length;
      this.keys.push(key);
      this.values.set(key, [serialized, newElementIndex]);
      return null;
    }
    const [oldValue, oldIndex] = valueAndIndex;
    this.values.set(key, [serialized, oldIndex]);
    return getValueWithOptions(oldValue, options);
  }
  /**
   * Removes and retrieves the element with the provided key.
   *
   * @param key - The key at which to remove data.
   * @param options - Options for retrieving the data.
   */
  remove(key, options) {
    const oldValueAndIndex = this.values.remove(key);
    if (oldValueAndIndex === null) {
      return options?.defaultValue ?? null;
    }
    const [value, index] = oldValueAndIndex;
    assert(this.keys.swapRemove(index) !== null, ERR_INCONSISTENT_STATE);
    // the last key is swapped to key[index], the corresponding [value, index] need update
    if (!this.keys.isEmpty() && index !== this.keys.length) {
      // if there is still elements and it was not the last element
      const swappedKey = this.keys.get(index);
      const swappedValueAndIndex = this.values.get(swappedKey);
      assert(swappedValueAndIndex !== null, ERR_INCONSISTENT_STATE);
      this.values.set(swappedKey, [swappedValueAndIndex[0], index]);
    }
    return getValueWithOptions(value, options);
  }
  /**
   * Remove all of the elements stored within the collection.
   */
  clear() {
    for (const key of this.keys) {
      // Set instead of remove to avoid loading the value from storage.
      this.values.set(key, null);
    }
    this.keys.clear();
  }
  [Symbol.iterator]() {
    return new UnorderedMapIterator(this);
  }
  /**
   * Create a iterator on top of the default collection iterator using custom options.
   *
   * @param options - Options for retrieving and storing the data.
   */
  createIteratorWithOptions(options) {
    return {
      [Symbol.iterator]: () => new UnorderedMapIterator(this, options)
    };
  }
  /**
   * Return a JavaScript array of the data stored within the collection.
   *
   * @param options - Options for retrieving and storing the data.
   */
  toArray(options) {
    const array = [];
    const iterator = options ? this.createIteratorWithOptions(options) : this;
    for (const value of iterator) {
      array.push(value);
    }
    return array;
  }
  /**
   * Extends the current collection with the passed in array of key-value pairs.
   *
   * @param keyValuePairs - The key-value pairs to extend the collection with.
   */
  extend(keyValuePairs) {
    for (const [key, value] of keyValuePairs) {
      this.set(key, value);
    }
  }
  /**
   * Serialize the collection.
   *
   * @param options - Options for storing the data.
   */
  serialize(options) {
    return serializeValueWithOptions(this, options);
  }
  /**
   * Converts the deserialized data from storage to a JavaScript instance of the collection.
   *
   * @param data - The deserialized data to create an instance from.
   */
  static reconstruct(data) {
    const map = new UnorderedMap(data.prefix);
    // reconstruct keys Vector
    map.keys = new Vector(`${data.prefix}u`);
    map.keys.length = data.keys.length;
    // reconstruct values LookupMap
    map.values = new LookupMap(`${data.prefix}m`);
    return map;
  }
}
/**
 * An iterator for the UnorderedMap collection.
 */
class UnorderedMapIterator {
  /**
   * @param unorderedMap - The unordered map collection to create an iterator for.
   * @param options - Options for retrieving and storing data.
   */
  constructor(unorderedMap, options) {
    this.options = options;
    this.keys = new VectorIterator(unorderedMap.keys);
    this.map = unorderedMap.values;
  }
  next() {
    const key = this.keys.next();
    if (key.done) {
      return {
        value: [key.value, null],
        done: key.done
      };
    }
    const valueAndIndex = this.map.get(key.value);
    assert(valueAndIndex !== null, ERR_INCONSISTENT_STATE);
    return {
      done: key.done,
      value: [key.value, getValueWithOptions(valueAndIndex[0], this.options)]
    };
  }
}

function serializeIndex(index) {
  const data = new Uint32Array([index]);
  const array = new Uint8Array(data.buffer);
  return u8ArrayToBytes(array);
}
function deserializeIndex(rawIndex) {
  const array = bytesToU8Array(rawIndex);
  const [data] = new Uint32Array(array.buffer);
  return data;
}
/**
 * An unordered set that stores data in NEAR storage.
 */
class UnorderedSet {
  /**
   * @param prefix - The byte prefix to use when storing elements inside this collection.
   */
  constructor(prefix) {
    this.prefix = prefix;
    this.elementIndexPrefix = `${prefix}i`;
    this.elements = new Vector(`${prefix}e`);
  }
  /**
   * The number of elements stored in the collection.
   */
  get length() {
    return this.elements.length;
  }
  /**
   * Checks whether the collection is empty.
   */
  isEmpty() {
    return this.elements.isEmpty();
  }
  /**
   * Checks whether the collection contains the value.
   *
   * @param element - The value for which to check the presence.
   * @param options - Options for storing data.
   */
  contains(element, options) {
    const indexLookup = this.elementIndexPrefix + serializeValueWithOptions(element, options);
    return storageHasKey(indexLookup);
  }
  /**
   * If the set did not have this value present, `true` is returned.
   * If the set did have this value present, `false` is returned.
   *
   * @param element - The value to store in the collection.
   * @param options - Options for storing the data.
   */
  set(element, options) {
    const indexLookup = this.elementIndexPrefix + serializeValueWithOptions(element, options);
    if (storageRead(indexLookup)) {
      return false;
    }
    const nextIndex = this.length;
    const nextIndexRaw = serializeIndex(nextIndex);
    storageWrite(indexLookup, nextIndexRaw);
    this.elements.push(element, options);
    return true;
  }
  /**
   * Returns true if the element was present in the set.
   *
   * @param element - The entry to remove.
   * @param options - Options for retrieving and storing data.
   */
  remove(element, options) {
    const indexLookup = this.elementIndexPrefix + serializeValueWithOptions(element, options);
    const indexRaw = storageRead(indexLookup);
    if (!indexRaw) {
      return false;
    }
    // If there is only one element then swap remove simply removes it without
    // swapping with the last element.
    if (this.length === 1) {
      storageRemove(indexLookup);
      const index = deserializeIndex(indexRaw);
      this.elements.swapRemove(index);
      return true;
    }
    // If there is more than one element then swap remove swaps it with the last
    // element.
    const lastElement = this.elements.get(this.length - 1, options);
    assert(!!lastElement, ERR_INCONSISTENT_STATE);
    storageRemove(indexLookup);
    // If the removed element was the last element from keys, then we don't need to
    // reinsert the lookup back.
    if (lastElement !== element) {
      const lastLookupElement = this.elementIndexPrefix + serializeValueWithOptions(lastElement, options);
      storageWrite(lastLookupElement, indexRaw);
    }
    const index = deserializeIndex(indexRaw);
    this.elements.swapRemove(index);
    return true;
  }
  /**
   * Remove all of the elements stored within the collection.
   */
  clear(options) {
    for (const element of this.elements) {
      const indexLookup = this.elementIndexPrefix + serializeValueWithOptions(element, options);
      storageRemove(indexLookup);
    }
    this.elements.clear();
  }
  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }
  /**
   * Create a iterator on top of the default collection iterator using custom options.
   *
   * @param options - Options for retrieving and storing the data.
   */
  createIteratorWithOptions(options) {
    return {
      [Symbol.iterator]: () => new VectorIterator(this.elements, options)
    };
  }
  /**
   * Return a JavaScript array of the data stored within the collection.
   *
   * @param options - Options for retrieving and storing the data.
   */
  toArray(options) {
    const array = [];
    const iterator = options ? this.createIteratorWithOptions(options) : this;
    for (const value of iterator) {
      array.push(value);
    }
    return array;
  }
  /**
   * Extends the current collection with the passed in array of elements.
   *
   * @param elements - The elements to extend the collection with.
   */
  extend(elements) {
    for (const element of elements) {
      this.set(element);
    }
  }
  /**
   * Serialize the collection.
   *
   * @param options - Options for storing the data.
   */
  serialize(options) {
    return serializeValueWithOptions(this, options);
  }
  /**
   * Converts the deserialized data from storage to a JavaScript instance of the collection.
   *
   * @param data - The deserialized data to create an instance from.
   */
  static reconstruct(data) {
    const set = new UnorderedSet(data.prefix);
    // reconstruct Vector
    const elementsPrefix = data.prefix + "e";
    set.elements = new Vector(elementsPrefix);
    set.elements.length = data.elements.length;
    return set;
  }
}

function assertOneYocto() {
  const deposited = attachedDeposit();
  assert(deposited == BigInt(1), "Requires 1 yoctoNEAR");
}
function getPromiseResults() {
  try {
    const result = promiseResult(0);
    log("Promise returns: " + result);
    if (!result) throw "Transaction failed";
    return true;
  } catch (e) {
    log("Fail");
    return false;
  }
}
function restoreTransactionIds(collection) {
  if (collection == null) return null;
  return UnorderedSet.reconstruct(collection);
}

function internalSetProduct(contract, productId, quantity, unitPrice) {
  assert(quantity >= 0 && BigInt(unitPrice) >= 0, "Invalid product data");
  const productData = {
    quantity: quantity.toString(),
    unitPrice
  };
  contract.products.set(productId, productData);
}
function internalAddProduct(contract, productId, quantity, unitPrice) {
  assert(!contract.products.get(productId), "Product already exists");
  internalSetProduct(contract, productId, quantity, unitPrice);
  log(`Product ${productId} added`);
}
function internalUpdateProduct(contract, productId, quantity, unitPrice) {
  assert(contract.products.get(productId), "Product not found");
  internalSetProduct(contract, productId, quantity, unitPrice);
  log(`Product ${productId} updated`);
}
function internalRemoveProduct(contract, productId) {
  assert(contract.products.get(productId), "Product not found");
  contract.products.remove(productId);
  log(`Product ${productId} removed`);
}
function internalGetProduct(contract, productId) {
  const data = contract.products.get(productId);
  assert(data, "Product not found");
  return {
    id: productId,
    data
  };
}
function internalGetAllProducts(contract) {
  const products = contract.products.toArray().map(([id, data]) => ({
    id,
    data
  }));
  return products;
}
function internalSendNEAR(receiverId, amount) {
  assert(amount > 0, "Sending amount must greater than 0");
  assert(accountBalance() > amount, `Not enough balance ${accountBalance()} to send ${amount}`);
  const promise = promiseBatchCreate(receiverId);
  promiseBatchActionTransfer(promise, amount);
  promiseReturn(promise);
}
function internalGetTx(contract, txId, accountId) {
  if (accountId) {
    assert(contract.accounts.containsKey(accountId), "Account not found");
    assert(contract.accounts.get(accountId).contains(txId), "Account does not have the transaction");
  }
  const tx = contract.transactionById.get(txId);
  assert(tx, "Transaction not found");
  return tx;
}
function internalGetTxsByAccountId(contract, accountId) {
  assert(contract.accounts.containsKey(accountId), "Account not found");
  const txIds = restoreTransactionIds(contract.accounts.get(accountId)).toArray();
  const txs = txIds.map(id => internalGetTx(contract, id));
  return txs;
}
function internalUpdateTx(contract, txId, oldStatus, newStatus, accountId) {
  const tx = internalGetTx(contract, txId, accountId);
  assert(tx.status === oldStatus, `Transaction status must be ${oldStatus}`);
  tx.status = newStatus;
  tx.updatedAt = new Date().toISOString();
  contract.transactionById.set(txId, tx);
  log(`Transaction status ${txId} has been updated to ${newStatus}`);
  return tx;
}

let TX_STATUS;
(function (TX_STATUS) {
  TX_STATUS["UNPAID"] = "0";
  TX_STATUS["PENDING"] = "1";
  TX_STATUS["TRANSFERRING"] = "2";
  TX_STATUS["SUCCESS"] = "3";
  TX_STATUS["CANCELED"] = "4";
  TX_STATUS["REFUNDING"] = "5";
  TX_STATUS["REFUNDED"] = "6";
})(TX_STATUS || (TX_STATUS = {}));
let GAS;
(function (GAS) {
  GAS[GAS["FT_ON_PURCHASE"] = 100000000000000] = "FT_ON_PURCHASE";
  GAS[GAS["FT_ON_REFUND"] = 100000000000000] = "FT_ON_REFUND";
  GAS[GAS["FT_ON_TRANSFER"] = 100000000000000] = "FT_ON_TRANSFER";
  GAS[GAS["FT_ON_REGISTER"] = 100000000000000] = "FT_ON_REGISTER";
  GAS[GAS["RESOLVE_BUY_TOKEN"] = 100000000000000] = "RESOLVE_BUY_TOKEN";
  GAS[GAS["RESOLVE_REGISTER"] = 100000000000000] = "RESOLVE_REGISTER";
  GAS[GAS["RESOLVE_CREATE_ORDER"] = 100000000000000] = "RESOLVE_CREATE_ORDER";
  GAS[GAS["RESOLVE_CANCEL_ORDER"] = 100000000000000] = "RESOLVE_CANCEL_ORDER";
})(GAS || (GAS = {}));

function internalRegister(contract) {
  const accountId = predecessorAccountId();
  assert(!contract.accounts.containsKey(accountId), "Account is already registered");
  const attachedDeposit$1 = attachedDeposit();
  const initialStorage = storageUsage();
  let transactions = new UnorderedSet("t" + accountId);
  contract.accounts.set(accountId, transactions);
  contract.depositById.set(accountId, BigInt(0));
  const requiredDeposit = (storageUsage() - initialStorage) * storageByteCost();
  contract.depositById.set(accountId, BigInt(requiredDeposit));
  assert(attachedDeposit$1 > requiredDeposit, "Not enough deposit for register_call");
  const promise = promiseBatchCreate(contract.ft_contract);
  promiseBatchActionFunctionCall(promise, "ft_on_register", bytes(JSON.stringify({})), attachedDeposit$1 - requiredDeposit, GAS.FT_ON_REGISTER);
  promiseThen(promise, currentAccountId(), "resolve_register", bytes(JSON.stringify({
    deposited: attachedDeposit$1.toString()
  })), 0, GAS.RESOLVE_REGISTER);
  return promiseReturn(promise);
}
function internalResolveRegister(contract, deposited) {
  const response = getPromiseResults();
  if (!response) {
    //Revert and refund
    const accountId = signerAccountId();
    if (contract.accounts.containsKey(accountId)) {
      contract.accounts.remove(accountId);
      contract.depositById.remove(accountId);
      internalSendNEAR(accountId, BigInt(deposited));
    }
    return false;
  }
  return true;
}

function internalBuyToken(contract) {
  const promise = promiseBatchCreate(contract.ft_contract);
  const nearAmount = attachedDeposit();
  promiseBatchActionFunctionCall(promise, "on_buy_ft", bytes(JSON.stringify({})), nearAmount, GAS.FT_ON_PURCHASE);
  promiseThen(promise, currentAccountId(), "resolve_buy_token", bytes(JSON.stringify({
    amount: nearAmount.toString()
  })), 0, GAS.RESOLVE_BUY_TOKEN);
  return promiseReturn(promise);
}
function internalResolveBuyToken(
// contract: ShopContract,
amount) {
  const response = getPromiseResults();
  if (!response) {
    //Revert
    internalSendNEAR(signerAccountId(), BigInt(amount));
    return false;
  }
  return true;
}
function internalCreateOrder(contract, items, shippingPrice) {
  const buyer = predecessorAccountId();
  assert(contract.accounts.containsKey(buyer), "Account not found");
  //Check order details and calculate total price
  let totalPrice = BigInt(shippingPrice);
  items.forEach(item => {
    //Check product exists
    const productId = item.product_id;
    const productStock = contract.products.get(productId);
    assert(productStock, "Product not found");
    //Check ordered quantity
    assert(item.quantity > 0, "Invalid item quantity");
    assert(Number(productStock.quantity) >= item.quantity, `Not enough product ${productId} in stock`);
    //Check price is changed or not
    assert(productStock.unitPrice === item.unit_price, `Product ${productId}'s price has been changed`);
    //Add to total price
    totalPrice += BigInt(item.quantity) * BigInt(item.unit_price);
    //Update stock
    productStock.quantity = (Number(productStock.quantity) - item.quantity).toString();
    contract.products.set(productId, productStock);
  });
  const promise = promiseBatchCreate(contract.ft_contract);
  promiseBatchActionFunctionCall(promise, "ft_on_purchase", bytes(JSON.stringify({
    amount: totalPrice.toString(),
    memo: `Transfer for transaction ${contract.nextTransactionId} of ${currentAccountId()}'s contract`
  })), 1, GAS.FT_ON_TRANSFER);
  promiseThen(promise, currentAccountId(), "resolve_create_order", bytes(JSON.stringify({
    items,
    shipping_price: shippingPrice,
    total_price: totalPrice.toString()
  })), 0, GAS.RESOLVE_CREATE_ORDER);
  return promiseReturn(promise);
}
function internalResolveCreateOrder(contract, items, shippingPrice, totalPrice) {
  const response = getPromiseResults();
  if (!response) {
    //Revert
    items.forEach(item => {
      const productId = item.product_id;
      const productStock = contract.products.get(productId);
      productStock.quantity = (Number(productStock.quantity) + item.quantity).toString();
      contract.products.set(productId, productStock);
    });
    return false;
  }
  const buyer = signerAccountId();
  //Insert new transaction to transactionById
  const txId = contract.nextTransactionId.toString();
  const itemSet = new UnorderedMap("i" + txId.toString());
  items.forEach(item => {
    const itemData = {
      quantity: item.quantity.toString(),
      unitPrice: item.unit_price
    };
    itemSet.set(item.product_id, itemData);
  });
  const tx = {
    status: TX_STATUS.PENDING,
    buyer,
    items: itemSet,
    shippingPrice,
    totalPrice,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  contract.transactionById.set(txId, tx);
  //Insert txId to accounts
  const buyerTxList = restoreTransactionIds(contract.accounts.get(buyer));
  buyerTxList.set(txId);
  contract.accounts.set(buyer, buyerTxList);
  //Update nextTransactionId
  contract.nextTransactionId += 1;
  return true;
}
function internalCancelOrder(contract, txId) {
  const buyerId = predecessorAccountId();
  const tx = internalUpdateTx(contract, txId, TX_STATUS.PENDING, TX_STATUS.CANCELED, buyerId);
  const promise = promiseBatchCreate(contract.ft_contract);
  promiseBatchActionFunctionCall(promise, "ft_on_refund", bytes(JSON.stringify({
    amount: tx.totalPrice,
    memo: `Refund for transaction ${txId} of ${currentAccountId()}'s contract`
  })), 1, GAS.FT_ON_REFUND);
  promiseThen(promise, currentAccountId(), "resolve_cancel_order", bytes(JSON.stringify({
    tx_id: txId
  })), 0, GAS.RESOLVE_CANCEL_ORDER);
  return promiseReturn(promise);
}
function internalResolveCancelOrder(contract, txId) {
  const response = getPromiseResults();
  if (!response) {
    //Revert
    internalUpdateTx(contract, txId, TX_STATUS.CANCELED, TX_STATUS.PENDING);
    return false;
  }
  return true;
}
function internalConfirmOrder(contract, txId) {
  internalUpdateTx(contract, txId, TX_STATUS.PENDING, TX_STATUS.TRANSFERRING);
}
function internalConfirmComplete(contract, txId) {
  const buyerId = predecessorAccountId();
  internalUpdateTx(contract, txId, TX_STATUS.TRANSFERRING, TX_STATUS.SUCCESS, buyerId);
}

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _dec15, _dec16, _dec17, _dec18, _class, _class2;
let ShopContract = (_dec = NearBindgen({}), _dec2 = initialize(), _dec3 = call({
  privateFunction: true
}), _dec4 = call({
  privateFunction: true
}), _dec5 = call({
  privateFunction: true
}), _dec6 = view(), _dec7 = view(), _dec8 = call({
  payableFunction: true
}), _dec9 = call({
  privateFunction: true
}), _dec10 = call({
  payableFunction: true
}), _dec11 = call({
  privateFunction: true
}), _dec12 = call({
  payableFunction: true
}), _dec13 = call({
  privateFunction: true
}), _dec14 = call({
  payableFunction: true
}), _dec15 = call({
  privateFunction: true
}), _dec16 = call({
  privateFunction: true
}), _dec17 = call({
  payableFunction: true
}), _dec18 = view(), _dec(_class = (_class2 = class ShopContract {
  //<ProductId, ProductData>
  //<AccountId, TransactionId[]>
  //<AccountId, depositAmount>
  // <TX_ID, Transaction>

  constructor() {
    this.ft_contract = "";
    this.owner_id = "";
    this.products = new UnorderedMap("p");
    this.accounts = new LookupMap("a");
    this.transactionById = new UnorderedMap("t");
    this.depositById = new LookupMap("d");
    this.nextTransactionId = 0;
  }
  init({
    owner_id,
    ft_contract
  }) {
    this.owner_id = owner_id;
    this.ft_contract = ft_contract;
  }

  //Product management
  add_product({
    product_id,
    quantity,
    unit_price
  }) {
    internalAddProduct(this, product_id, quantity, unit_price);
  }
  update_product({
    product_id,
    quantity,
    unit_price
  }) {
    internalUpdateProduct(this, product_id, quantity, unit_price);
  }
  remove_product({
    product_id
  }) {
    internalRemoveProduct(this, product_id);
  }

  //Product view methods
  get_product({
    product_id
  }) {
    return JSON.stringify(internalGetProduct(this, product_id));
  }
  get_all_products() {
    return JSON.stringify(internalGetAllProducts(this));
  }

  //Registration
  register_call() {
    internalRegister(this);
  }
  resolve_register({
    deposited
  }) {
    internalResolveRegister(this, deposited);
  }

  // @call({ payableFunction: true })
  // unregister({ id }: { id: string }) {
  //     this.accounts.remove(id);
  // }

  //Buy ft
  buy_token_call() {
    internalBuyToken(this);
  }
  resolve_buy_token({
    amount
  }) {
    internalResolveBuyToken(amount);
  }

  //Create order
  create_order_call({
    items,
    shipping_price
  }) {
    assertOneYocto();
    internalCreateOrder(this, items, shipping_price);
  }
  resolve_create_order({
    items,
    shipping_price,
    total_price
  }) {
    internalResolveCreateOrder(this, items, shipping_price, total_price);
  }

  //Cancel order
  cancel_order_call({
    tx_id
  }) {
    assertOneYocto();
    internalCancelOrder(this, tx_id);
  }
  resolve_cancel_order({
    tx_id
  }) {
    internalResolveCancelOrder(this, tx_id);
  }

  //Transfer order to buyer
  confirm_order({
    tx_id
  }) {
    internalConfirmOrder(this, tx_id);
  }

  //Buyer confirms to receive ordered items
  confirm_complete({
    tx_id
  }) {
    assertOneYocto();
    internalConfirmComplete(this, tx_id);
  }
  get_txs_of({
    account_id
  }) {
    return JSON.stringify(internalGetTxsByAccountId(this, account_id));
  }

  // @view({})
  // get_ft_rate() {
  //     return internalGetFtRate(this);
  // }

  // @view({})
  // get_ft_balance() {
  //     return internalGetWallet(this);
  // }
}, (_applyDecoratedDescriptor(_class2.prototype, "init", [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, "init"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "add_product", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "add_product"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "update_product", [_dec4], Object.getOwnPropertyDescriptor(_class2.prototype, "update_product"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "remove_product", [_dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "remove_product"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_product", [_dec6], Object.getOwnPropertyDescriptor(_class2.prototype, "get_product"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_all_products", [_dec7], Object.getOwnPropertyDescriptor(_class2.prototype, "get_all_products"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "register_call", [_dec8], Object.getOwnPropertyDescriptor(_class2.prototype, "register_call"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "resolve_register", [_dec9], Object.getOwnPropertyDescriptor(_class2.prototype, "resolve_register"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "buy_token_call", [_dec10], Object.getOwnPropertyDescriptor(_class2.prototype, "buy_token_call"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "resolve_buy_token", [_dec11], Object.getOwnPropertyDescriptor(_class2.prototype, "resolve_buy_token"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "create_order_call", [_dec12], Object.getOwnPropertyDescriptor(_class2.prototype, "create_order_call"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "resolve_create_order", [_dec13], Object.getOwnPropertyDescriptor(_class2.prototype, "resolve_create_order"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "cancel_order_call", [_dec14], Object.getOwnPropertyDescriptor(_class2.prototype, "cancel_order_call"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "resolve_cancel_order", [_dec15], Object.getOwnPropertyDescriptor(_class2.prototype, "resolve_cancel_order"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "confirm_order", [_dec16], Object.getOwnPropertyDescriptor(_class2.prototype, "confirm_order"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "confirm_complete", [_dec17], Object.getOwnPropertyDescriptor(_class2.prototype, "confirm_complete"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "get_txs_of", [_dec18], Object.getOwnPropertyDescriptor(_class2.prototype, "get_txs_of"), _class2.prototype)), _class2)) || _class);
function get_txs_of() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.get_txs_of(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function confirm_complete() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.confirm_complete(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function confirm_order() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.confirm_order(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function resolve_cancel_order() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.resolve_cancel_order(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function cancel_order_call() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.cancel_order_call(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function resolve_create_order() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.resolve_create_order(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function create_order_call() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.create_order_call(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function resolve_buy_token() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.resolve_buy_token(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function buy_token_call() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.buy_token_call(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function resolve_register() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.resolve_register(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function register_call() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.register_call(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function get_all_products() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.get_all_products(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function get_product() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.get_product(_args);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function remove_product() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.remove_product(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function update_product() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.update_product(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function add_product() {
  const _state = ShopContract._getState();
  if (!_state && ShopContract._requireInit()) {
    throw new Error("Contract must be initialized");
  }
  const _contract = ShopContract._create();
  if (_state) {
    ShopContract._reconstruct(_contract, _state);
  }
  const _args = ShopContract._getArgs();
  const _result = _contract.add_product(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}
function init() {
  const _state = ShopContract._getState();
  if (_state) {
    throw new Error("Contract already initialized");
  }
  const _contract = ShopContract._create();
  const _args = ShopContract._getArgs();
  const _result = _contract.init(_args);
  ShopContract._saveToStorage(_contract);
  if (_result !== undefined) if (_result && _result.constructor && _result.constructor.name === "NearPromise") _result.onReturn();else env.value_return(ShopContract._serialize(_result, true));
}

export { ShopContract, add_product, buy_token_call, cancel_order_call, confirm_complete, confirm_order, create_order_call, get_all_products, get_product, get_txs_of, init, register_call, remove_product, resolve_buy_token, resolve_cancel_order, resolve_create_order, resolve_register, update_product };
//# sourceMappingURL=hello_near.js.map
