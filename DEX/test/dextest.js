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
contract("Managing the Orderbook", accounts => {

    it("1 Check that token transfer works", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);
        await klc.transfer(accounts[1], 1000000);
        await klc.approve(dex.address, 1000000, {from: accounts[1]});
        await dex.deposit(web3.utils.fromUtf8("klc"), 500, {from: accounts[1]})
        let balance = await dex.balances(accounts[1], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 500);
    }) 

    it("2 check that ETH transfer works", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await dex.depositETH({value: 10000000, from: accounts[2]});
        let balance = await dex.getETHbalance({from: accounts[2]});
        assert.equal(balance, 10000000);      
    })

    it("3 Place Buy and Sell order and check length", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();

        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 10, 1, {from: accounts[1]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 5, 0, {from: accounts[2]});
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(BuyorderbookL.toNumber(), 1);
        assert.equal(SellorderbookL.toNumber(), 1);
    }) 

    it("4 Add another sell and buy order, and check length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 50, 9, 1, {from: accounts[1]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 6, 0, {from: accounts[2]});
  
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(BuyorderbookL.toNumber(), 2);
        assert.equal(SellorderbookL.toNumber(), 2);
    })

    it("5 Check order of Orderbook", async() =>{

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
    it("6 check balances before matching", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let balance = await dex.balances(accounts[2], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 0);
        balance = await dex.ETHbalance(accounts[1]);
        assert.equal(balance.toNumber(), 0);
    })
    
    it("7 Check price of BuyOrder", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();    
        let order = await dex.getOrderBook(web3.utils.fromUtf8("klc"),0)
        assert.equal(order[0].price, 6)
        assert.equal(order[1].price, 5)
    })
    it("8 Check price of SellOrder", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();    
        let order = await dex.getOrderBook(web3.utils.fromUtf8("klc"),1)
        assert.equal(order[1].price, 9)
        assert.equal(order[0].price, 10)
    })
    it("9 Add 3rd sell order, and check length of Sellorderbook", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 50, 1, 1, {from: accounts[1]});
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(BuyorderbookL.toNumber(), 2);
        //how to test delta more eth/token on their respective accounts? difficult.
    })
    it("10 check length of Buyorderbook", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        assert.equal(BuyorderbookL.toNumber(), 2);
        //how to test delta more eth/token on their respective accounts? difficult.
    })


    it("11 check Tokenbalances before matching with another buy order", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let balance = await dex.balances(accounts[2], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 50);
    })  

    it("12 check ETH before matching with another buy order", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let balance = await dex.ETHbalance(accounts[1]);
        assert.equal(balance.toNumber(), 50);
    })  


    it("13 Check order of SellOrderbook", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();    
        let order = await dex.getOrderBook(web3.utils.fromUtf8("klc"),1)
        for (let i = 0; i< dex.getOrderBookLength(web3.utils.fromUtf8("klc"),0)-1;i++){
            assert(order[i].price>= order[i+1].price)
        }
    })

    it("14 should transfer the tokens and the ETH when there is a match, check ETH", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 50, 1, 0, {from: accounts[2]});
        let balance = await dex.ETHbalance(accounts[1]);
        assert.equal(balance.toNumber(), 50);
        //how to test delta more eth/token on their respective accounts? difficult.
    })
    it("15 should transfer the tokens and the ETH when there is a match, check token", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        let balance = await dex.balances(accounts[2], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 50);
    })   
    it("16 Check buyOrder Length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        assert.equal(BuyorderbookL.toNumber(), 3);
    })
    it("17 Check Sell order length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(SellorderbookL.toNumber(), 2);
    })
    it("18 Check BuyOrderamount before last sell order", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let BuyOrderAmount = await dex.getOrderAmount(web3.utils.fromUtf8("klc"), 0,0);
        assert.equal(BuyOrderAmount.toNumber(), 50);
    })
    it("19 add a sell order, check new BuyOrder length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 175, 1, 1, {from: accounts[1]});
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        assert.equal(BuyorderbookL.toNumber(), 1);
        //how to test delta more eth/token on their respective accounts? difficult.
    })
    it("20 Check BuyOrderamount after last sell order", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let BuyOrderAmount = await dex.getOrderAmount(web3.utils.fromUtf8("klc"), 0,0);
        assert.equal(BuyOrderAmount.toNumber(), 25);
    })
    it("21 check new Sell order length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(SellorderbookL.toNumber(), 2);
        //how to test delta more eth/token on their respective accounts? difficult.
    })
    it("22 check Tokenbalances after last sell order add ", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let balance = await dex.balances(accounts[2], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 225);
    })  

    it("23 check ETH before matching with another buy order", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let balance = await dex.ETHbalance(accounts[1]);
        assert.equal(balance.toNumber(), 225);
    }) 
    it("24 add last sell order, check new BuyOrder length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 25, 1, 1, {from: accounts[1]});
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        assert.equal(BuyorderbookL.toNumber(), 0);
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(SellorderbookL.toNumber(), 2);
        //how to test delta more eth/token on their respective accounts? difficult.
    }) 
    it("25 add last buy order, check all lenghts ", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 150, 10, 0, {from: accounts[2]});
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        assert.equal(BuyorderbookL.toNumber(), 0);
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(SellorderbookL.toNumber(), 0);
        //how to test delta more eth/token on their respective accounts? difficult.
    }) 
})
contract ("MarketOrder", accounts => {
    //check if the bytes32 is with symbol "klc" or with the name or whatever

    it("1 Check that token transfer works", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.addtoken(web3.utils.fromUtf8("kilcoin"),web3.utils.fromUtf8("klc"), klc.address);
        await klc.transfer(accounts[1], 1000000);
        await klc.approve(dex.address, 1000000, {from: accounts[1]});
        await dex.deposit(web3.utils.fromUtf8("klc"), 500, {from: accounts[1]})
        let balance = await dex.balances(accounts[1], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 500);
    }) 

    it("2 check that ETH transfer works", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await dex.depositETH({value: 10000000, from: accounts[2]});
        let balance = await dex.getETHbalance({from: accounts[2]});
        assert.equal(balance, 10000000);      
    })

    it("3 Place Buy and Sell order and check length", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();

        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 10, 1, {from: accounts[1]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 5, 0, {from: accounts[2]});
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(BuyorderbookL.toNumber(), 1);
        assert.equal(SellorderbookL.toNumber(), 1);
    }) 

    it("4 Add another sell and buy order, and check length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 50, 9, 1, {from: accounts[1]});
        await dex.PlaceOrder(web3.utils.fromUtf8("klc"), 100, 6, 0, {from: accounts[2]});
  
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(BuyorderbookL.toNumber(), 2);
        assert.equal(SellorderbookL.toNumber(), 2);
    })

    it("5 Check order of Orderbook", async() =>{

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
    it("6 check balances before matching", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let balance = await dex.balances(accounts[2], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 0);
        balance = await dex.ETHbalance(accounts[1]);
        assert.equal(balance.toNumber(), 0);
    })
    
    it("7 Check price of BuyOrder", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();    
        let order = await dex.getOrderBook(web3.utils.fromUtf8("klc"),0)
        assert.equal(order[0].price, 6)
        assert.equal(order[1].price, 5)
    })
    it("8 Check price of SellOrder", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();    
        let order = await dex.getOrderBook(web3.utils.fromUtf8("klc"),1)
        assert.equal(order[1].price, 9)
        assert.equal(order[0].price, 10)
    })

    it("9 check length of Buyorderbook", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        assert.equal(BuyorderbookL.toNumber(), 2);
        //how to test delta more eth/token on their respective accounts? difficult.
    })  
    it("11 Place MarketBuyorder and check that it takes the correct price", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.PlaceMarketOrder(web3.utils.fromUtf8("klc"), 75 ,0, {from: accounts[2]})
        balance = await dex.ETHbalance(accounts[1]);
        assert.equal(balance.toNumber(), 700);      
        //how to test delta more eth/token on their respective accounts? difficult.
    })  
    it("12 Check that it stops when input amount hits 0(check that 75 token got transferred)", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        let balance = await dex.balances(accounts[2], web3.utils.fromUtf8("klc"));
        assert.equal(balance.toNumber(), 75);
    }) 
    it("13 check new Sell order length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let SellorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 1);
        assert.equal(SellorderbookL.toNumber(), 1);
        //how to test delta more eth/token on their respective accounts? difficult.
    }) 
    it("14 Check SellOrderamount of left over orderbook register after last sell order", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let SellOrderAmount = await dex.getOrderAmount(web3.utils.fromUtf8("klc"), 1,0);
        assert.equal(SellOrderAmount.toNumber(), 75);
    })
    it("15 Place MarketSellOrder and check that it doesnt stop untill going through entire Orderbook(check by balances)", async() =>{

        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        // make sure that token(klc in this case) gets frozen.
        await dex.PlaceMarketOrder(web3.utils.fromUtf8("klc"), 250 ,1, {from: accounts[1]})
        balance = await dex.ETHbalance(accounts[1]);
        assert.equal(balance.toNumber(), 1800);      
        //how to test delta more eth/token on their respective accounts? difficult.
    })  
    it("16 check new Sell order length", async() =>{
        let dex = await Dex.deployed();
        let klc = await KLC.deployed();
        let BuyorderbookL = await dex.getOrderBookLength(web3.utils.fromUtf8("klc"), 0);
        assert.equal(BuyorderbookL.toNumber(), 0);
        //how to test delta more eth/token on their respective accounts? difficult.
    }) 
})
