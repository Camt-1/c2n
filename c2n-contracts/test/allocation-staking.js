const {ethers} = require("hardhat");
const {expect} = require("chai");
const {BigNumber, utils} = require("ethers");

describe('AllocationStaking', function () {
  let Addmin
  let C2NToken, BreLP1, BreLP2
  let AllocationStaking
  let AllocationStakingRewardsFactory
  let SalesFactory
  let deployer, alice, bob
  let startTimestamp

  let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  const REWARDS_PER_SECOND = ethers.utils.parseUnits('0.1')
  const TOKEN_TO_ADD = ethers.utils.parseUnits('100000')
  const TOKEN_TO_SEND = ethers.utils.parseUnits('1000')

})