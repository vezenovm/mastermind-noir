import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.10',
    settings: {
      evmVersion: 'london',
      optimizer: { enabled: true, runs: 5000 },
    },
  },
  // solidity: {
  //   compilers: [
  //       // verifier contract previously would get stack too deep error unless 0.6.10 and settings were specified
  //       {
  //           version: "0.6.10",
  //           settings: {
  //             evmVersion: 'istanbul',
  //             optimizer: { enabled: true, runs: 200 },
  //           },
  //       },
  //   ]
  // },
  networks: {
    hardhat: {
      blockGasLimit: 10000000,
      gasPrice: 10,
      hardfork: 'istanbul',
    },
  },
};

export default config;
