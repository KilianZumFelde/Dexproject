pragma solidity 0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Wallet {
using SafeMath for uint256;
struct token {
    bytes32 name;
    address tokenaddress;
}

modifier tokenexists(bytes32 _symbol) {
    require(tokens[_symbol].tokenaddress != address(0), "token does not exist");
    _;
}

mapping (bytes32 => token) public tokens;
mapping (address => mapping(bytes32 => uint256)) public balances;
bytes32[] public tokenlist;


function addtoken(bytes32  _name, bytes32 _symbol, address _tokenaddress) external {

    tokens[_symbol].tokenaddress = _tokenaddress;
    tokens[_symbol].name = _name;
    tokenlist.push(_symbol);
}

function deposit(bytes32 _symbol, uint256 _amount)  tokenexists(_symbol) public {

    require(IERC20(tokens[_symbol].tokenaddress).balanceOf(msg.sender) >= _amount);
    balances[msg.sender][_symbol] += _amount;
    IERC20(tokens[_symbol].tokenaddress).transferFrom(msg.sender, address(this), _amount);
}

function withdraw(bytes32 _symbol, uint256 _amount) tokenexists(_symbol) public {
    
    require(balances[msg.sender][_symbol] >= _amount);
    balances[msg.sender][_symbol] -=_amount;
    IERC20(tokens[_symbol].tokenaddress).transfer(msg.sender,_amount);
}

}