pragma solidity 0.8.0;
pragma abicoder v2;

import "../contracts/Wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Dex is Wallet{
    using SafeMath for uint256;

 //put in the safemath shit
    enum Side {
        Buy,
        Sell
    }
    uint256 OrderID;
    struct Order {
        bytes32 symbol;
        uint256 amount;
        uint256 price;
        address trader;
        uint256 id;
    }
    mapping(bytes32 => mapping(uint256 => Order[])) public Orderbook;
    mapping(address => uint256) public ETHbalance;
    
    event Trade (bytes32 _symbol, uint256 _amount, uint256 _price, address seller, address buyer);
    function depositETH() public payable{
        ETHbalance[msg.sender] += msg.value;
    }
    //The following functions are for testing :
    function getOrderBook(bytes32 _symbol, Side _side) public view returns(Order[] memory){
        return(Orderbook[_symbol][uint256(_side)]);
    }
    function getOrderBookLength(bytes32 _symbol, Side _side) public view returns(uint256){
    return(Orderbook[_symbol][uint256(_side)].length);
    }
    function getOrder(bytes32 _symbol, Side _side, uint256 _i) public view returns(Order memory){
        return(Orderbook[_symbol][uint256(_side)][_i]);
    }
    function getOrderAmount(bytes32 _symbol, Side _side, uint256 _i) public view returns(uint256){
        return(Orderbook[_symbol][uint256(_side)][_i].amount);
    }
    function getOrderID(bytes32 _symbol, Side _side, uint256 _i) public view returns(uint256){
        return(Orderbook[_symbol][uint256(_side)][_i].id);
    }
    function getETHbalance()public view returns(uint256){
        return(ETHbalance[msg.sender]);
    } 

    //----------------------

    //Placeorder: main function. Goals: To place a buy or sell order. Eventually match them, adjust balances and pop orders
    function PlaceOrder(bytes32 _symbol, uint256 _amount, uint256 _price, Side _side) public tokenexists(_symbol) {
        if(_side == Side.Buy){
            //require buyer to have enough ETH
            require(ETHbalance[msg.sender]>= _price*_amount);

            //adjust balances (make it vanish..it will get turned into an order)
            ETHbalance[msg.sender] -=_price*_amount;
        }
        else{
            //require seller to have enough token
            require(balances[msg.sender][_symbol]>= _amount);
            //adjust balance of token. Make it vanish(gets turned into an order)
            balances[msg.sender][_symbol]-=_amount;
        }
        //create unique permanent order ID 
        OrderID += 1;
        //add the actuall order to the order book
        _createorder(_symbol, _amount, _price, _side);
        // order the orderbook from high price to lowest
        _orderOrderbook(_symbol, _side);
        //check if there is a match, and adjust the orderbook and adjust the asociated balances
        if (Orderbook[_symbol][uint256(Side.Buy)].length >0 && Orderbook[_symbol][uint256(Side.Sell)].length > 0){
            while(Orderbook[_symbol][uint256(Side.Buy)][0].price >= Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].price){

                //match the orders, adjust balances, and pop order registers
                _matchorder(_price, _symbol);
                
                //if the sell orderbook or buy orderbook is completely "popped", stop loop
                if(Orderbook[_symbol][uint256(Side.Buy)].length == 0 || Orderbook[_symbol][uint256(Side.Sell)].length == 0){
                    break;
                }      
            }    
        }

    }   
    function PlaceMarketOrder(bytes32 _symbol, uint256 _amount, Side _side) public tokenexists(_symbol) {
        uint256 amount;
        uint256 amountToCompare;
        uint256 price;
        //start the loop, while there is still amount to buy or sell
        while( _amount > 0 ){
            //fetch the correct price and reference amount, to compare which amount is limiting the trade (either input or order of the orderbook)
            if(_side == Side.Sell){
                //break loop if BuyOrderBook has length 0
                if(Orderbook[_symbol][uint256(Side.Buy)].length == 0){
                    break;
                }
                price = Orderbook[_symbol][uint256(Side.Buy)][0].price;
                amountToCompare = Orderbook[_symbol][uint256(Side.Buy)][0].amount;
            }
            else{
                //break loop if SellOrderBook has length 0
                if(Orderbook[_symbol][uint256(Side.Sell)].length == 0){
                    break;
                }
                price = Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].price;
                amountToCompare = Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].amount;
            }
            //determine which amount to use (the input or the amount in the orderbook)
            if(amountToCompare >= _amount){
                amount = _amount;
            }   
            else{
                amount = amountToCompare;            
            }
            //place the order with the found price and amount   
            PlaceOrder(_symbol, amount, price, _side);
            //adjust the amount, so that once there has been sold/bought up to the input amount,the loop stops
            _amount -= amount;
        }
    }
    //functions that are used in placeorder:

    //create order: creates an order register  
    function _createorder(bytes32 _symbol, uint256 _amount, uint256 _price, Side _side) private {
        Order[] storage Orders = Orderbook[_symbol][uint256(_side)];
        Orders.push(Order(_symbol, _amount, _price, msg.sender, OrderID));
    }
    //orders the orderbook by decreasing price
    function _orderOrderbook(bytes32 _symbol, Side _side) private{
        Order[] storage Orders = Orderbook[_symbol][uint256(_side)];
        for(uint256 i=0; i <( Orders.length -1); i++){
            if(Orders[Orders.length-(i+2)].price < Orders[Orders.length-(i+1)].price){
                Order memory orderToMove = Orders[Orders.length-(i+1)]; 
                Orders[Orders.length-(i+1)] = Orders[Orders.length-(i+2)];
                Orders[Orders.length-(i+2)] = orderToMove;  
            }
            else{
                //to interrupt the for, if value[i] >= value[i+1].
                break;
            }
        }     
    }
    //matches orders if they have the same price (or if the BUY price is higher than the sell price/sell price is lower than the Buy price)
    function _matchorder( uint256 _price, bytes32 _symbol ) private {
        uint256 amount;
        uint256 WhotoPop;
        //if the buy amount > sell amount, use limiting sell amount to adjust balances. And pop sell amount
        if(Orderbook[_symbol][uint256(Side.Buy)][0].amount > Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].amount){
            amount = Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].amount;
            //whotopop = 1 means pop seller and adjust Buyer orderbook
            WhotoPop = 1;
        }
        //if the buy amount = sell amount, use  sell amount to adjust balances. And pop sell and buy
        if(Orderbook[_symbol][uint256(Side.Buy)][0].amount == Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].amount){
            amount = Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].amount;
            //whotopop = 2 means pop both, adjust nothing
            WhotoPop = 2;
        }
        //if the buy amount < sell amount, use buy amount to adjust balances. And pop buy      
        if(Orderbook[_symbol][uint256(Side.Buy)][0].amount < Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].amount){
            amount = Orderbook[_symbol][uint256(Side.Buy)][0].amount;
            //whotopop = 0 means pop buyer and adjust seller orderbook
            WhotoPop = 0;
        }
        //adjust balances of seller and buyer
        _adjustbalances(_symbol, _price, amount);

        if(WhotoPop == 1){
            //adjust Buy orderbook (since the sell order will be popped)
            Orderbook[_symbol][uint256(Side.Buy)][0].amount -= amount;
            //eliminate the lowest sell orderbook register after match
            Orderbook[_symbol][uint256(Side.Sell)].pop();
        }
        if(WhotoPop == 2){
            //eliminate the lowest sell orderbook register after match (no order adjustment necessary, since both will be popped)
            Orderbook[_symbol][uint256(Side.Sell)].pop();
            //get the order[0] of buyorderbook to the last place [length-1] so that we can pop it.
            _dropMatchedBuyOrder(_symbol);
        }
        if(WhotoPop == 0){
            //adjust SELL orderbook (since buy order will be popped)
            Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].amount -= amount;
            //get the order[0] of buyorderbook to the last place [length-1] so that we can pop it.
            _dropMatchedBuyOrder(_symbol);  
        }
    }
    //transfers ETH and token within seller and buyer             
    function _adjustbalances(bytes32 _symbol, uint256 _price, uint256 amount) private{
        // adjust balances of buyer 
        balances[Orderbook[_symbol][uint256(Side.Buy)][0].trader][_symbol] += amount;
        // adjust balances of seller
        ETHbalance[Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].trader] += amount*_price;

        emit Trade(_symbol, amount,_price, Orderbook[_symbol][uint256(Side.Sell)][Orderbook[_symbol][uint256(Side.Sell)].length-1].trader, Orderbook[_symbol][uint256(Side.Buy)][0].trader);
    }
    //pops Buy order, if its amount gets cancelled by a sell order   
    function _dropMatchedBuyOrder(bytes32 _symbol) private{
        Order[] storage Orders = Orderbook[_symbol][uint256(Side.Buy)];
        //get Order[0] down to Order[lenght-1]
        for(uint256 i=0; i< Orders.length -1; i++){
            Orders[i] = Orders[i + 1];
        }
        // pop Order[length -1]
        Orders.pop();
    }
}
