//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../interfaces/IAdmin.sol";
import "./C2NSale.sol";

contract SalesFactory {
    IAdmin public admin;
    address public allocationStaking;

    mapping(address => bool) public isSaleCreatedThroughFactory;
    mapping(address => address) public saleOwenerToSales;
    mapping(address => address) public tokenToSales;

    address [] public allSales;

    event SaleDeployed(address saleContract);
    event SaleOwnerAndTokenSetInFactory(address sale, address saleOwner, address saleToken);

    modifier onlyAdmin {
        require(admin.isAdmin(msg.sender), "Only Admin can deploy sales");
        _;
    }

    constructor (address _adminContract, address _allocationStaking) {
        admin = IAdmin(_adminContract);
        allocationStaking = _allocationStaking;
    }

    function setAllocationStaking(address _allocationStaking) public onlyAdmin {
        require(_allocationStaking != address(0));
        allocationStaking = _allocationStaking;
    }

    function deploySale() external onlyAdmin {
        C2NSale sale = new C2NSale(address(admin), allocationStaking);

        isSaleCreatedThroughFactory[address(sale)] = true;
        allSales.push(address(sale));

        emit SaleDeployed(address(sale));
    }

    function getNumberOfSalesDeployed() external view returns (uint) {
        return allSales.length;
    }

    function getLastDeployedSale() external view returns (address) {
        if (allSales.length > 0) {
            return allSales[allSales.length - 1];
        }
        return address(0);
    }

    function getAllSales(uint startIndex, uint endIndex) external view returns (address[] memory) {
        require(endIndex > startIndex, "Bad input");

        address[] memory sales = new address[](endIndex - startIndex);
        uint index = 0;
        for (uint i = startIndex; i < endIndex; i++) {
            sales[index] = allSales[i];
            index++;
        }
        return sales;
    }
}