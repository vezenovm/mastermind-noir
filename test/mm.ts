import { ethers } from "hardhat";
import { BarretenbergWasm } from '@noir-lang/barretenberg/dest/wasm';
import { SinglePedersen } from '@noir-lang/barretenberg/dest/crypto/pedersen';
import { compile, acir_from_bytes } from '@noir-lang/noir_wasm';
import { setup_generic_prover_and_verifier, create_proof, verify_proof, StandardExampleProver, StandardExampleVerifier } from '@noir-lang/barretenberg/dest/client_proofs';
import { serialise_public_inputs } from '@noir-lang/aztec_backend';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { expect } from 'chai';
import { Contract, ContractFactory, utils } from 'ethers';

type MMProofInput = {
    guessA: number;
    guessB: number;
    guessC: number;
    guessD: number;
    numHit: number;
    numBlow: number;
    solnHash: string;
    solnA: number;
    solnB: number;
    solnC: number;
    solnD: number;
    salt: number;
}

describe('Mastermind tests using typescript wrapper', function() {
    let barretenberg: BarretenbergWasm;
    let pedersen: SinglePedersen;
    let acir: any;
    let prover: StandardExampleProver;
    let verifier: StandardExampleVerifier;

    before(async () => {
        barretenberg = await BarretenbergWasm.new();
        await barretenberg.init()
        pedersen = new SinglePedersen(barretenberg);

        let acirByteArray = path_to_uint8array(resolve(__dirname, '../circuits/build/p.acir'));
        acir = acir_from_bytes(acirByteArray);
        [prover, verifier] = await setup_generic_prover_and_verifier(acir);
    });

    function createProofInput(guesses: number[], solution: number[], salt: number) : MMProofInput {
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let solution_hash_preimage = serialise_inputs([salt, ...solution]);
        let solnHash = pedersen.compressInputs(solution_hash_preimage);
        let solnHashString = `0x` + solnHash.toString('hex');
        console.log('solnHash: ' + solnHashString);

        return {
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
    }

    it("Code breaker wins, compiled using nargo", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 2, 3, 4];
        let salt = 50;

        let abi = createProofInput(guesses, solution, salt)
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

        let abi = createProofInput(guesses, solution, salt);

        const proof = await create_proof(prover, acir, abi);

        const verified = await verify_proof(verifier, proof);
      
        console.log(verified);

        expect(verified).eq(true)
    });

    it("Code breaker has no hits, but has a blow", async () => {
        let guesses = [4, 5, 6, 7];
        let solution = [1, 2, 3, 4];
        let salt = 50;
 
        let abi = createProofInput(guesses, solution, salt)
        const proof = await create_proof(prover, acir, abi);

        const verified = await verify_proof(verifier, proof);
      
        console.log(verified);

        expect(verified).eq(true)
    });

});

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

    function createProofInput(guesses: number[], solution: number[], salt: number) : MMProofInput {
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let solution_hash_preimage = serialise_inputs([salt, ...solution]);
        let solnHash = pedersen.compressInputs(solution_hash_preimage);
        let solnHashString = `0x` + solnHash.toString('hex');
        console.log('solnHash: ' + solnHashString);

        return {
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
    }

    it("Code breaker wins", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 2, 3, 4];
        let salt = 50;
       
        let compiled_program = compile(resolve(__dirname, '../circuits/src/main.nr'));
        const acir = compiled_program.circuit;

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
 
        let abi = createProofInput(guesses, solution, salt)
        const proof: Buffer = await create_proof(prover, acir, abi);

        const verified = await verify_proof(verifier, proof);
        expect(verified).eq(true)

        const verified_sol_result = await verifierContract.verify(proof);
        expect(verified_sol_result).eq(true)
    });

    it("Code breaker has hits, but without a win", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 3, 5, 4];
        let salt = 50;

        let acirByteArray = path_to_uint8array(resolve(__dirname, '../circuits/build/p.acir'));
        let acir = acir_from_bytes(acirByteArray);

        let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
 
        let abi = createProofInput(guesses, solution, salt)
        const proof = await create_proof(prover, acir, abi);

        const verified = await verify_proof(verifier, proof);
        expect(verified).eq(true);

        const verified_sol_result = await verifierContract.verify(proof);
        expect(verified_sol_result).eq(true);
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