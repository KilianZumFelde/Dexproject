pragma solidity 0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract kilcoin is ERC20{

    constructor() ERC20("kilcoin", "klc"){
        _mint(msg.sender, 10000000000);
    }
}