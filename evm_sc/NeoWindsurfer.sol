// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NeoWindsurfer is ERC20, Ownable {
    constructor() ERC20("NeoWindsurfer", "NFT") Ownable(msg.sender) {}

    string public policyIdHex = "8b6e03019fe44a02b9197829317a5459cdec357e236c2678289e1c8d";
    string public assetName = "NeoWindsurfer";

    event Minted(address indexed to, address indexed contractAddress, uint256 valueSent, string indexed identifier);

    function mint(address to) public payable {
        _mint(to, 1 * 10 ** 18);
        emit Minted(to, address(this), msg.value, "MintedWertCardano");
    }

    function getBalance() public view returns(uint) {
        return address(this).balance;
    }

    function withdrawMoney() public onlyOwner {
        address payable to = payable(msg.sender);
        to.transfer(getBalance());
    }
}
