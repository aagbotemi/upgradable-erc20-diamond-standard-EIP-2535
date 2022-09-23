/* global ethers */
/* eslint prefer-const: "off" */

import { ContractReceipt, Transaction } from "ethers";
import { TransactionDescription, TransactionTypes } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { DiamondCutFacet } from "../typechain-types";
import { getSelectors, FacetCutAction } from "./libraries/diamond";

export let DiamondAddress: string;

// DiamondCutFacet deployed: 0x31fD6E71A514AE6A873F95ad18f99BaE012ac42A
// Diamond deployed: 0xBE69153677Fa79812EE97935e7aA3Cb97C67F3E1
// DiamondInit deployed: 0xA4bb01f711402aaC52Fb558B74f464F07E77Fb2e

// Deploying facets
// DiamondLoupeFacet deployed: 0xe4c5686786d995d08A87F7029B089ba7537612Ee
// OwnershipFacet deployed: 0x6Db7819aBB61E223B7af04D9A50e8Db9Be025FC6
// ERC20 deployed: 0x4959c77a512908D692df502927Fcdc30B649e74d

// Diamond cut tx:  0x7c1c3e2536b7245f220818a350b999e5d215c9f525ee37e313fabad482ecee30


export async function deployDiamond() {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();
  console.log("DiamondCutFacet deployed:", diamondCutFacet.address);

  // deploy Diamond
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(
    contractOwner.address,
    diamondCutFacet.address,
    "Diamond Token",
    "DMT",
    100000000
  );
  await diamond.deployed();
  console.log("Diamond deployed:", diamond.address);

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();
  console.log("DiamondInit deployed:", diamondInit.address);

  // deploy facets
  console.log("");
  console.log("Deploying facets");
  const FacetNames = ["DiamondLoupeFacet", "OwnershipFacet", "ERC20"];
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    console.log(`${FacetName} deployed: ${facet.address}`);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  // upgrade diamond with facets
  console.log("");
  console.log("Diamond Cut:", cut);
  const diamondCut = (await ethers.getContractAt(
    "IDiamondCut",
    diamond.address
  )) as DiamondCutFacet;
  let tx;
  let receipt: ContractReceipt;
  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData("init");
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  console.log("Diamond cut tx: ", tx.hash);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  console.log("Completed diamond cut");
  DiamondAddress = diamond.address;

  // const ERC20 = await ethers.getContractFactory("ERC20");
  // const ERC20Token = ERC20.attach(diamond.address);


  // const amount = await ethers.utils.parseEther("100000000");

  // const mint = await ERC20Token.mint(amount);
  // console.log("MINT OF :", mint);

  // const balance = await ERC20Token.balanceOf(contractOwner.address);
  // console.log("BALANCE OF :", Number(balance));

  // const name = await ERC20Token.name();
  // console.log("NAME OF :", name);

  // const symbol = await ERC20Token.symbol();
  // console.log("SYMBOL OF :", symbol);

  // const totalSupply = await ERC20Token.totalSupply();
  // console.log("TOTAL SUPPLY OF :", Number(totalSupply));

  // const circulatingSupply = await ERC20Token.circulatingSupply();
  // console.log("CIRCULATING SUPPLY OF :", Number(circulatingSupply));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
