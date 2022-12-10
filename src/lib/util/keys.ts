import * as secp256k1 from '@noble/secp256k1'
import {Buffer} from 'buffer'
/**
 * @see https://www.npmjs.com/package/@noble/secp256k1
 */
// Supports both async and sync methods, see docs
export async function getKeys() {
    // keys, messages & other inputs can be Uint8Arrays or hex strings
    // Uint8Array.from([0xde, 0xad, 0xbe, 0xef]) === 'deadbeef'
    const privKey = Buffer.from(secp256k1.utils.randomPrivateKey()).toString('hex');
    const pubKey = Buffer.from(secp256k1.schnorr.getPublicKey(privKey)).toString('hex');

    //const keyPair = bitcoinjs.ECPair.makeRandom();

    return {priv: privKey, pub: pubKey}
};
