// the orderbook (buy or sell) must have a decreasing order, starting at its highest value at location 0
// A sell order only gets matched with a buy order if the price matches.
// If A sell and buy order match, they must be eliminated from the orderbook by the lowest quantity of either sell or buy order.
// If a sell and buy order match, the token must be transfered from the seller to the buyer, and ETH from the buyer to the seller.
// A user that registers a buy order must have ETH >= than the buy orders total price
// A user that registers a sell order must have token >= than the total amount of tokens to sell
// A user can cancel the buy or sell order, only before it is taken off the orderbook

const Dex = artifacts.require("Dex");
const KLC = artifacts.require("kilcoin");
const truffleAssert = require('truffle-assertions');
contract.skip("dex", accounts => {
    //check if the bytes32 is with symbol "klc" or with the name or whatever


    it("should reorder the orderbook in a decreasing order", async() => {
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);
        await klc.transfer(accounts[1], 1000000);   
        await klc.approve(klc.address, 1000000, {from: accounts[1]});
               //make a buy order
        //dex.addtoken("klc", klc.address);
        //await dex.deposit(web3.utils.fromUtf8("klc"), 200, {from: accounts[1]});
        await dex.depositETH({value: 500, from: accounts[1]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 1, 0, {from: accounts[1]});
        // make a buy order with a higher price
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 200, 2, 0, {from: accounts[1]});
        //check how to transform BUY into a uint256
        let orderID = await dex.getOrderID(web3.utils.fromUtf8("klc"),0,0);
        assert.equal(orderID,2);
    })
    it("should only allow buy orders if user has enough ETH", async() => {
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();

        //make sure that accounts[1] does not have enough ETH
        truffleAssert.reverts(dex.PlaceOrder(web3.utils.fromUtf8("klc"), 1000 ,10 , 0,  {from: accounts[1]}));  
    })
    it("should only allow buy orders if token exists", async() => {

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await truffleAssert.reverts(dex.PlaceOrder(web3.utils.fromUtf8("faketoken"), 1000 ,10 , 0, {from: accounts[1]}));  

    })
    it("should freeze equivalent ETH assets of BuyOrder", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that ETH gets frozen. Using a different account (so that it doesnt add up what the ones before added)
        //dex.depositETH("ETH", 100, {from: accounts[1]});
        await dex.depositETH({value: 100, from: accounts[1]})
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 1, 0, {from: accounts[1]});
        let balance = await dex.getETHbalance({from: accounts[1]});
        assert.equal(balance, 0);
    })
    it("should only allow sell order if token exists", async() => {

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        truffleAssert.reverts(dex.PlaceOrder(web3.utils.fromUtf8("faketoken"), 1000, 10, 1, {from: accounts[2]} ));    
    })
    it("should only allow sell order if user has enough token", async() => {
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);
        await klc.transfer(accounts[2], 1000000);
        await klc.approve(dex.address, 1000000, {from: accounts[2]});
        //pick an account that does not have enough token on the respective contract
        await dex.deposit(web3.utils.fromUtf8("klc"), 100, {from: accounts[2]});
        await truffleAssert.reverts(dex.PlaceOrder(web3.utils.fromUtf8("klc"), 800, 10, 1, {from: accounts[2]}));     
    })
    it("should freeze tokens of SellOrder", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);
        await klc.transfer(accounts[2], 1000000);
        await klc.approve(dex.address, 1000000, {from: accounts[2]});
        //await dex.deposit(web3.utils.fromUtf8("klc"), 100, {from: accounts[2]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 10, 1, {from: accounts[2]});
        let balance = await dex.balances(accounts[2], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 0);
    })  
    it("build ordersbooks correctly (length)", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);
        await klc.transfer(accounts[7], 1000000);
        await klc.approve(dex.address, 1000000, {from: accounts[7]});
        await dex.depositETH({value: 1000, from: accounts[7]});
        //await dex.deposit(web3.utils.fromUtf8("klc"), 100, {from: accounts[2]});
        await dex.deposit(web3.utils.fromUtf8("klc"), 300, {from: accounts[7]})
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 1, 0, {from: accounts[7]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 200, 2, 0, {from: accounts[7]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 50, 3, 0, {from: accounts[7]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 10, 1, {from: accounts[7]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 200, 11, 1, {from: accounts[7]});
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(BuyorderbookL.toNumber(), 6);
        assert.equal(SellorderbookL.toNumber(), 3);
    }) 
    it("build orders in correct order", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let order = await dex.getOrderBook(web3.utils.fromUtf8("klc"),0)
        for (let i = 0; i< dex.getOrderBookLength(web3.utils.fromUtf8("klc"),0)-1;i++){
            assert(order[i].price>= order[i+1].price)
        }
        order = await dex.getOrderBook(web3.utils.fromUtf8("klc"),1) 
        for (let i = 0; i< dex.getOrderBookLength(web3.utils.fromUtf8("klc"),1)-1;i++){
            assert(order[i].price>= order[i+1].price)
        } 
    }) 
})
contract("dex2", accounts => {
    it("should transfer the tokens and the ETH when there is a match", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);
        await dex.depositETH({value: 1000, from: accounts[5]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 1000, 1, 0, {from: accounts[5]});
        await klc.transfer(accounts[6], 1000000);
        await klc.approve(dex.address, 1000000, {from: accounts[6]});
        await dex.deposit(web3.utils.fromUtf8("klc"), 1000, {from: accounts[6]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 1000, 1, 1, {from: accounts[6]});
        let balance = await dex.balances(accounts[5], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 1000);
        balance = await dex.ETHbalance(accounts[6]);
        assert.equal(balance.toNumber(), 1000);
        //how to test delta more eth/token on their respective accounts? difficult.
    })
})
contract.skip ("dex", accounts => {
    //check if the bytes32 is with symbol "klc" or with the name or whatever


//It should match if the price of buy order => price of sell order
//It should NOT match if the price of buy order < price of sell order
//If a match, it should transfer the ETH to the seller and the token to the Buyer
//It should NOT allow to create a market order if one of the orderbooks has length 0
//It should set the price of a market sell order to the buy order.
//It should Pop the buy orderbook when there is a match
//it should match the first and second sell order, if the buy order is higher than the first and equal to the second

    it("It should match if the price of buy order => price of sell order, and calculate with lower volume", async() => {
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);

        await klc.transfer(accounts[1], 1000000);
        await klc.transfer(accounts[2], 1000000);
        await klc.transfer(accounts[3], 1000000);
        await klc.transfer(accounts[4], 1000000);
        await klc.transfer(accounts[5], 1000000);
    
        await klc.approve(klc.address, 1000000, {from: accounts[1]});
        await klc.approve(klc.address, 1000000, {from: accounts[2]});
        await klc.approve(klc.address, 1000000, {from: accounts[3]});
        await klc.approve(klc.address, 1000000, {from: accounts[4]});
        await klc.approve(klc.address, 1000000, {from: accounts[5]});
        //
 
        //deposit value (ETH)
        await dex.depositETH({value: 20000, from: accounts[1]});
        //Place Buy order
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 1000, 12, 0, {from: accounts[1]});
        // deposit Token (klc)
        //await dex.deposit({value: 20000, from: accounts[0]});
        await dex.deposit(web3.utils.fromUtf8("klc"), 800,  {from: accounts[2]});
        //place sell order with less price and less amount
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 500, 10, 1, {from: accounts[2]});
        //place sell order with higher price and some amount
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 300, 12, 1, {from: accounts[2]});
        //check that buy order has 200 left --- convert the buy into a number, how?
        let buyorder = await Orderbook[web3.utils.fromUtf8("klc")][uint256(0)][0].amount;
        assert.equal(buyorder.toNumber(), 200);
        //check that seller has no token left and got more ETH
        let balance = await dex.balances[accounts[2]][web3.utils.fromUtf8("klc")];
        assert.equal(balance.toNumber(), 0);
        balance = await dex.ETHbalance[accounts[2]];
        assert.equal(balance.toNumber(), 8600);
        balance = await dex.balances[accounts[1]][web3.utils.fromUtf8("klc")];
        assert.equal(balance.toNumber(), 800);
        //check that the sell orderbook got popped
        let book = await dex.Orderbook[web3.utils.fromUtf8("klc")][1].length;
        assert.equal(book.toNumber(), 0);
    })
})
