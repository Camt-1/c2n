//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./utils/Context.sol";
import "./IERC20.sol";

contract C2NToken is Context, IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;
    uint8 private _decimals;

    constructor (
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint8 decimals_
    )
    {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        _mint(_msgSender(), totalSupply_);
    }

    function transfer(address recipient, uint256 amount) 
        public
        virtual
        override
        returns (bool)
    {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function burn(uint amount) public virtual {
        _burn(_msgSender(), amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        require(_allowances[sender][_msgSender()] >= amount, "ERC20: transfer amount exceeds allowance");
        _allowances[sender][_msgSender()] -= amount;
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()]);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue)
        public 
        virtual
        returns (bool)
    {
        require(_allowances[spender][_msgSender()] >= subtractedValue, "ERC20: decreased allowance below zero");
        _allowances[spender][_msgSender()] -= subtractedValue;
        _approve(_msgSender(), spender, _allowances[spender][_msgSender()]);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount)
        internal
        virtual
    {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        require(_balances[account] > amount, "ERC20: burn amount exceeds balance");
        _balances[account] -= amount;
        _totalSupply -= amount;
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approver to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _setupDecimals(uint8 decimals_) internal virtual {
        _decimals = decimals_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }
}