/** @type {import('jest').Config} */
const crypto = require('crypto');
const { Buffer } = require('buffer');

const { Crypto } = require('@peculiar/webcrypto');

const webCrypto = new Crypto();
const config = {
  verbose: true,
  setupFiles: ["./setupTests"],
  resetMocks: true,
  globals: {
    crypto: {
      getRandomValues: (array) => crypto.randomBytes(array.length),
      subtle: {
        importKey: (...args) => webCrypto.subtle.importKey(...args),
        deriveKey: (...args) => webCrypto.subtle.deriveKey(...args),
        encrypt: (...args) => webCrypto.subtle.encrypt(...args),
        decrypt: (...args) => webCrypto.subtle.decrypt(...args),
      },
    },
    btoa: (str) => Buffer.from(str).toString('base64'),
  },
  moduleNameMapper: {
    './keyRing/SingleHDKeyRingController.js':'./keyRing/SingleHDKeyRingController'
  },
};

module.exports = config;
