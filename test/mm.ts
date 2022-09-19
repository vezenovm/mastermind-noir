import { ethers } from "hardhat";
// import { SinglePedersen } from '@aztec/barretenberg/crypto/pedersen';
// import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto/pedersen';
import { compile, acir_from_bytes, acir_to_bytes } from '@noir-lang/noir_wasm';
import { setup_generic_prover_and_verifier, create_proof, verify_proof, create_proof_with_witness } from '@noir-lang/barretenberg/dest/client_proofs';
import { packed_witness_to_witness, serialise_public_inputs, compute_witnesses } from '@noir-lang/aztec_backend';
import path from 'path';
import { readFileSync } from 'fs';
import { expect } from 'chai';
import { Contract, ContractFactory, utils } from 'ethers';

const numPublicInputs = 6; // Need this to deconstruct proof for Solidity verifier

describe('Mastermind tests using typescript wrapper', function() {
    let barretenberg: BarretenbergWasm;
    let pedersen: SinglePedersen;

    before(async () => {
        barretenberg = await BarretenbergWasm.new();
        await barretenberg.init()
        pedersen = new SinglePedersen(barretenberg);
    });

    it("Code breaker wins", async () => {
      let [hit, blow] = calculateHB([1, 2, 3, 4], [1, 2, 3, 4]);

      let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
      let acir = acir_from_bytes(acirByteArray);

      let abi = {
          guessA: "0x01", // Must have even number of digits for hex representation to work
          guessB: "0x02",
          guessC: "0x03",
          guessD: "0x04",
          numHit: "0x0" + hit.toString(), // We will snot hits or blows > 16, thus we know we will have an uneven number of digits in the hex representation
          numBlow: "0x0" + blow.toString(),
          solnA: "0x01",
          solnB: "0x02",
          solnC: "0x03",
          solnD: "0x04",
      }

      let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
      console.log('created prover and verifier');

      const proof = await create_proof(prover, acir, abi);
      console.log('proof: ' + proof.toString('hex'));

      const verified = await verify_proof(verifier, proof);
    
      console.log(verified);

      expect(verified).eq(true)
  });

    it("Code breaker has hits, but without a win", async () => {
        let [hit, blow] = calculateHB([1, 2, 3, 4], [1, 3, 5, 4]);

        let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
        let acir = acir_from_bytes(acirByteArray);

        let abi = {
            guessA: "0x01", // Must have even number of digits for hex representation to work
            guessB: "0x02",
            guessC: "0x03",
            guessD: "0x04",
            numHit: "0x0" + hit.toString(),
            numBlow: "0x0" + blow.toString(),
            solnA: "0x01",
            solnB: "0x03",
            solnC: "0x05",
            solnD: "0x04",
        }

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
        console.log('created prover and verifier');
 
        const proof = await create_proof(prover, acir, abi);
        console.log('proof: ' + proof.toString('hex'));

        const verified = await verify_proof(verifier, proof);
      
        console.log(verified);

        expect(verified).eq(true)
    });

    it("Code breaker has no hits, but has a blow", async () => {
        let [hit, blow] = calculateHB([4, 5, 6, 7], [1, 2, 3, 4]);

        let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
        let acir = acir_from_bytes(acirByteArray);

        let abi = {
            guessA: "0x04", // Must have even number of digits for hex representation to work
            guessB: "0x05",
            guessC: "0x06",
            guessD: "0x07",
            numHit: "0x0" + hit.toString(),
            numBlow: "0x0" + blow.toString(),
            solnA: "0x01",
            solnB: "0x02",
            solnC: "0x03",
            solnD: "0x04",
        }

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
        console.log('created prover and verifier');
 
        const proof = await create_proof(prover, acir, abi);
        console.log('proof: ' + proof.toString('hex'));

        const verified = await verify_proof(verifier, proof);
      
        console.log(verified);

        expect(verified).eq(true)
    });

    // TODO: The comments in this test are all further work to get the typescript wrapper pedersen matching
    // up with the results calculated by pedersen in the wasm prover 
    // it("Code breaker wins", async () => {
    //     // TODO: hash currently fails with wasm prover, most likely some serialization err 
    //     // let salt = Buffer.from('32', 'hex');
    //     // console.log('salt: ' + salt);
    //     let preimage = [
    //         Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex'), 
    //         Buffer.from('0000000000000000000000000000000000000000000000000000000000000002', 'hex'), 
    //         Buffer.from('0000000000000000000000000000000000000000000000000000000000000003', 'hex'), 
    //         Buffer.from('0000000000000000000000000000000000000000000000000000000000000004', 'hex'), 
    //     ];
    //     console.log('guess: ' + Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex').toString('hex'));
    //     console.dir(preimage);
    //     let salt = Buffer.from("0000000000000000000000000000000000000000000000000000000000000032", "hex");
    //     let solnHash = pedersen.compressInputs([salt, preimage[0], preimage[1], preimage[2], preimage[3]]);
    //     let solnHashString = `0x` + solnHash.toString('hex');
    //     console.log('solnHash: ' + solnHashString); 

    //     let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
    //     let acir = acir_from_bytes(acirByteArray);

    //     // let initial_js_witness = [
    //     //     "0x01", // Must have even number of digits for hex representation to work
    //     //     "0x02",
    //     //     "0x03",
    //     //     "0x04",
    //     //     "0x04",
    //     //     "0x00",
    //     //     "0x000000000", 
    //     //     "0x01",
    //     //     "0x02",
    //     //     "0x03",
    //     //     "0x04",
    //     //     "0x32"
    //     // ]
    //     // TODO: this gives Unreachable err in wasm when using 
    //     // const barretenberg_witness_arr = compute_witnesses(acir, initial_js_witness); 

    //     // let witnessByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.tr'));
    //     // const barretenberg_witness_arr = await packed_witness_to_witness(acir, witnessByteArray);
    //     // console.log('barretenberg_witness_arr: {:?} ', barretenberg_witness_arr);

    //     let abi = {
    //         guessA: "0x01", // Must have even number of digits for hex representation to work
    //         guessB: "0x02",
    //         guessC: "0x03",
    //         guessD: "0x04",
    //         numHit: "0x04",
    //         numBlow: "0x00",
    //         // solnHash: "0x109243",
    //         // solnHash: solnHashString,
    //         solnA: "0x01",
    //         solnB: "0x02",
    //         solnC: "0x03",
    //         solnD: "0x04",
    //         salt: "0x32",
    //     }
    //     console.dir(abi);

    //     let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
    //     console.log('created prover and verifier');
    
    //     // const proof = await create_proof_with_witness(prover, barretenberg_witness_arr);
    //     const proof = await create_proof(prover, acir, abi);
    //     console.log('proof: ' + proof.toString('hex'));

    //     const verified = await verify_proof(verifier, proof);
      
    //     console.log(verified);

    //     expect(verified).eq(true)
    // });

});

// TODO: Currently can only use proof generated by nargo to test solidity verifier
// working on adding contract command to typescript wrapper as this is not ideal for development 
describe('Mastermind tests using solidity verifier', function() {
    let Verifier: ContractFactory;
    let verifierContract: Contract;

    before(async () => {
        Verifier = await ethers.getContractFactory("TurboVerifier");
        verifierContract = await Verifier.deploy();
    });

    it("Code breaker wins", async () => {
        let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
        let acir = acir_from_bytes(acirByteArray);

        let abi = {
            guessA: "0x01", // Must have even number of digits for hex representation to work
            guessB: "0x02",
            guessC: "0x03",
            guessD: "0x04",
            numHit: "0x04",
            numBlow: "0x00",
            // solnHash: "0x109243bde5fa6c2fe3f231697447a7e45853eade6727ca11faa5a935e434a703",
            // solnHash: solnHashString,
            solnA: "0x01",
            solnB: "0x02",
            solnC: "0x03",
            solnD: "0x04",
            // salt: "0x32",
        }
        console.dir(abi);
        
        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
        console.log('created prover and verifier');
 
        const proof: Buffer = await create_proof(prover, acir, abi);
        const publicInputs: Buffer = proof.subarray(0, (numPublicInputs*32));
        console.log('public inputs: ', publicInputs.toString('hex'));
        console.log('proof: ' + proof.toString('hex'));

        console.log('public inputs buffer: ' + utils.arrayify(publicInputs));
        let chunkedPublicInputs = [];
        for (let i = 0; i < (numPublicInputs*32); i+=32) {
            let input = publicInputs.subarray(i, i + 32).toString('hex');
            chunkedPublicInputs.push(utils.arrayify(`0x` + input));
        }
        console.log('chunked public inputs: ' + chunkedPublicInputs);
        console.dir(chunkedPublicInputs);

        const verified = await verify_proof(verifier, proof);
        console.log(verified);

        //TODO: currently broken, getting malformed G1 point, check if verifier contract generated by nargo has mismatch with proof generated by JS wrapper
        let proofNoPubInputs = proof.subarray(numPublicInputs*32);
        console.log('proof no pub inputs: ' + utils.arrayify(`0x` + proofNoPubInputs.toString('hex')));

        // let args = [[...proofNoPubInputs], [...publicInputs]]
        const verifyResult = await verifierContract.verify(proofNoPubInputs, publicInputs);
        console.log('verify result: ' + verifyResult);

        expect(verified).eq(true)
    });

});

function path_to_uint8array(path: string) {
    let buffer = readFileSync(path);
    return new Uint8Array(buffer);
}

function calculateHB(guess: number[], solution: number[]) {
    const hit = solution.filter((sol, i) => {
      return sol === guess[i];
    }).length;
  
    const blow = solution.filter((sol, i) => {
      return sol !== guess[i] && guess.some((g) => g === sol);
    }).length;
  
    return [hit, blow];
}

function hexListToBytes(list: string[]) {
    let rawPubInputs = [];
    for (let i = 0; i < list.length; i++) {
      let rawPubInput = utils.arrayify(list[i]);
      rawPubInputs.push(rawPubInput)
    }
    // Get the total length of all arrays.
    let length = 0;
    rawPubInputs.forEach(item => {
      length += item.length;
    });
  
    // Create a new array with total length and merge all source arrays.
    let mergedRawPubInputs = new Uint8Array(length);
    let offset = 0;
    rawPubInputs.forEach(item => {
      mergedRawPubInputs.set(item, offset);
      offset += item.length;
    });
    return mergedRawPubInputs
}

// Convert a hex string to a byte array
function hexToBytes(hex: string) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}
