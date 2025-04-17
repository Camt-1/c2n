//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Admin {
    address [] public admins;

    mapping(address => bool) public isAdmin;

    modifier onlyAdmin {
        require(isAdmin[msg.sender], "Only admin can call.");
        _;
    }

    constructor (address [] memory _admins) {
        for (uint i = 0; i < _admins.length; i++) {
            admins.push(_admins[i]);
            isAdmin[_admins[i]] = true;
        }
    }

    function addAdmin(
        address _adminAddress
    )
    external
    onlyAdmin
    {
        require(_adminAddress != address(0), "[RBAC]: Admin must be != than 0 address");
        require(!isAdmin[_adminAddress], "[RBAC]: Admin already exists.");
        admins.push(_adminAddress);
        isAdmin[_adminAddress] = true;
    }

    function removeAdmin(
        address _adminAddress
    )
    external
    onlyAdmin
    {
        require(isAdmin[_adminAddress]);
        require(admins.length > 1, "Can't remove all admins since contract becomes unusable.");
        uint i = 0;
        while (admins[i] != _adminAddress) {
            if (i == admins.length) {
                revert("Passed admin address does not exits");
            }
            i++;
        }

        admins[i] = admins[admins.length - 1];
        isAdmin[_adminAddress] = false;
        admins.pop();                        
    }

    function getAllAdmins()
    external
    view
    returns (address [] memory)
    {
        return admins;
    }
}