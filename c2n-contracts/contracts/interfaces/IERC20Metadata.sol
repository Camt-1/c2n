//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 */
interface IERC20Metadata {
	/**
	 * @dev Returns the name of the token.
     */
	function name() external view returns (string memory);

	/**
	 * @dev Returns the symbol of the token.
     */
	function symbol() external view returns (string memory);

	/**
	 * @dev Returns the decimals places of the token.
     */
	function decimals() external view returns (uint8);
}
