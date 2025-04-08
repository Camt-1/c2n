//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface ISalesFactory {
    function setSaleOwnerAndToken(address saleOwner, address saleToken) external;
    function isSaleCreatedThroughFactory(address sale) external view returns (bool);
}