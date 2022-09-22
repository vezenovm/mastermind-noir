import { ethers } from "hardhat";
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto/pedersen';
import { compile, acir_from_bytes } from '@noir-lang/noir_wasm';
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

    it("Code breaker wins, compiled using noir wasm", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 2, 3, 4];
        let salt = 50;
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let solution_hash_preimage = serialise_inputs([salt, ...solution]);
        let solnHash = pedersen.compressInputs(solution_hash_preimage);
        let solnHashString = `0x` + solnHash.toString('hex');
        console.log('solnHash: ' + solnHashString); 

        let compiled_program = compile(path.resolve(__dirname, '../circuits/src/main.nr'));
        const acir = compiled_program.circuit;

        let abi = {
            guessA: guesses[0],
            guessB: guesses[1],
            guessC: guesses[2],
            guessD: guesses[3],
            numHit: hit,
            numBlow: blow,
            solnHash: solnHashString,
            solnA: solution[0],
            solnB: solution[1],
            solnC: solution[2],
            solnD: solution[3],
            salt: salt,
        }

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);

        const proof = await create_proof(prover, acir, abi);
        console.log('proof: ' + proof.toString('hex'));

        const verified = await verify_proof(verifier, proof);
    
        console.log(verified);

        expect(verified).eq(true)
    });

    it("Code breaker wins, compiled using nargo", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 2, 3, 4];
        let salt = 50;
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let solution_hash_preimage = serialise_inputs([salt, ...solution]);
        let solnHash = pedersen.compressInputs(solution_hash_preimage);
        let solnHashString = `0x` + solnHash.toString('hex');
        console.log('solnHash: ' + solnHashString); 

        let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
        let acir = acir_from_bytes(acirByteArray);

        let abi = {
            guessA: guesses[0], 
            guessB: guesses[1],
            guessC: guesses[2],
            guessD: guesses[3],
            numHit: hit,
            numBlow: blow,
            solnHash: solnHashString,
            solnA: solution[0],
            solnB: solution[1],
            solnC: solution[2],
            solnD: solution[3],
            salt: salt,
        }

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);

        const proof = await create_proof(prover, acir, abi);
        console.log('proof: ' + proof.toString('hex'));

        const verified = await verify_proof(verifier, proof);
    
        console.log(verified);

        expect(verified).eq(true)
    });

    it("Code breaker has hits, but without a win", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 3, 5, 4];
        let salt = 50;
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let solution_hash_preimage = serialise_inputs([salt, ...solution]);
        let solnHash = pedersen.compressInputs(solution_hash_preimage);
        let solnHashString = `0x` + solnHash.toString('hex');
        console.log('solnHash: ' + solnHashString); 

        let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
        let acir = acir_from_bytes(acirByteArray);

        let abi = {
            guessA: guesses[0],
            guessB: guesses[1],
            guessC: guesses[2],
            guessD: guesses[3],
            numHit: hit,
            numBlow: blow,
            solnHash: solnHashString,
            solnA: solution[0],
            solnB: solution[1],
            solnC: solution[2],
            solnD: solution[3],
            salt: salt,
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
        let guesses = [4, 5, 6, 7];
        let solution = [1, 2, 3, 4];
        let salt = 50;
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let solution_hash_preimage = serialise_inputs([salt, ...solution]);
        let solnHash = pedersen.compressInputs(solution_hash_preimage);
        let solnHashString = `0x` + solnHash.toString('hex');
        console.log('solnHash: ' + solnHashString); 

        let acirByteArray = path_to_uint8array(path.resolve(__dirname, '../circuits/build/p.acir'));
        let acir = acir_from_bytes(acirByteArray);

        let abi = {
            guessA: guesses[0], 
            guessB: guesses[1],
            guessC: guesses[2],
            guessD: guesses[3],
            numHit: hit,
            numBlow: blow,
            solnHash: solnHashString,
            solnA: solution[0],
            solnB: solution[1],
            solnC: solution[2],
            solnD: solution[3],
            salt: salt,
        }

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
        console.log('created prover and verifier');
 
        const proof = await create_proof(prover, acir, abi);
        console.log('proof: ' + proof.toString('hex'));

        const verified = await verify_proof(verifier, proof);
      
        console.log(verified);

        expect(verified).eq(true)
    });

});

// TODO: Currently can only use proof generated by nargo to test solidity verifier
// working on adding contract command to typescript wrapper as this is not ideal for development 
describe('Mastermind tests using solidity verifier', function() {
    let Verifier: ContractFactory;
    let verifierContract: Contract;

    let barretenberg: BarretenbergWasm;
    let pedersen: SinglePedersen;

    before(async () => {
        Verifier = await ethers.getContractFactory("TurboVerifier");
        verifierContract = await Verifier.deploy();

        barretenberg = await BarretenbergWasm.new();
        await barretenberg.init()
        pedersen = new SinglePedersen(barretenberg);
    });

    it("Code breaker wins", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 2, 3, 4];
        let salt = 50;
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let solution_hash_preimage = serialise_inputs([salt, ...solution]);
        let solnHash = pedersen.compressInputs(solution_hash_preimage);
        let solnHashString = `0x` + solnHash.toString('hex');
        console.log('solnHash: ' + solnHashString); 

        let compiled_program = compile(path.resolve(__dirname, '../circuits/src/main.nr'));
        const acir = compiled_program.circuit;

        let abi = {
            guessA: guesses[0],
            guessB: guesses[1],
            guessC: guesses[2],
            guessD: guesses[3],
            numHit: hit,
            numBlow: blow,
            solnHash: solnHashString,
            solnA: solution[0],
            solnB: solution[1],
            solnC: solution[2],
            solnD: solution[3],
            salt: salt,
        }
        console.dir(abi);

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
        console.log('created prover and verifier');
 
        const proof: Buffer = await create_proof(prover, acir, abi);
        const publicInputs: Buffer = proof.subarray(0, (numPublicInputs*32));
        console.log('public inputs: ', publicInputs.toString('hex'));
        console.log('proof: ' + proof.toString('hex'));
        const verified = await verify_proof(verifier, proof);
        console.log(verified);

        //TODO: currently broken, getting malformed G1 point, check if verifier contract generated by nargo has mismatch with proof generated by JS wrapper
        let proofNoPubInputs = proof.subarray(numPublicInputs*32);
        console.log('proof no pub inputs: ' + proofNoPubInputs.toString('hex'));
        let args = [[...proofNoPubInputs], [...publicInputs]]
        const verifyResult = await verifierContract.verify(proofNoPubInputs, publicInputs);
        console.log('verify result: ' + verifyResult);


        expect(verified).eq(true)
    });

    // NOTE: only passes for verifier contract using old nargo
    it("Verify proof generated by nargo", async () => {
        let proverToml = await readFileSync(path.resolve(__dirname,`../circuits/Prover.toml`));
        var proverInputs = toml.parse(proverToml.toString());
        console.dir(proverInputs);

        let proofBuffer = await readFileSync(path.resolve(__dirname,`../circuits/proofs/p.proof`));
        console.log('proofBuffer: ', proofBuffer.toString());
    
        let proofBytes = Buffer.from(proofBuffer.toString(), 'hex');

        let mergedRawPubInputs = serialise_public_inputs([`0x0` + proverInputs.guessA, `0x0` + proverInputs.guessB, `0x0` + proverInputs.guessC, `0x0` + proverInputs.guessD, `0x0` + proverInputs.numHit, `0x0` + proverInputs.numBlow]);
        console.log('merged raw pub inputs: ' + mergedRawPubInputs);
    
        let args = [proofBytes, mergedRawPubInputs];
    
        // verify proof and perform withdraw
        // NOTE: curently being done by nargo and fetched from circuits folder rather than running wasm file
        const verifyResult = await verifierContract.verify(...args);

        expect(verifyResult).eq(true);
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

function serialise_inputs(values: number[]) {
    let serialised_inputs = []
    for (var i = 0; i < values.length; i++) {
        let number_hex = values[i].toString(16);
        let padded_number_hex = number_hex.length %2 == 0 ? "0x" + number_hex : "0x0" + number_hex; // TOOD: this logic should be placed inside the `serialise_public_inputs` method
        serialised_inputs.push(
            Buffer.from(serialise_public_inputs([padded_number_hex]))
        );
    }
    return serialised_inputs;
}