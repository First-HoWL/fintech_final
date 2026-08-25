// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Escrow {
    address private owner;
    address private seller;

    struct Item {
        uint id;
        string name;
        uint price;
        uint count;
    }

    Item[] public items;
    uint idIndex = 0;

    mapping(address => Item[]) public purchases;

    constructor() {
        owner = msg.sender;
        items.push(Item(idIndex++, "Apple", 10000, 3));
        items.push(Item(idIndex++, "Banana", 15000, 6));
        items.push(Item(idIndex++, "Potato", 8000, 10));
        items.push(Item(idIndex++, "Orange", 20000, 4));
        items.push(Item(idIndex++, "Milk", 100000, 5));
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can do this");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == owner || msg.sender == seller, "Only owner or seller can do this");
        _;
    }

    function changeOwner(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner should not be the zero address");
        owner = newOwner;
    }

    function addItems(string calldata itemName, uint itemPrice, uint itemCount) public onlySeller {
        items.push(Item(idIndex++, itemName, itemPrice, itemCount));
    }

    function take(uint id, uint count) public payable {
        require(count > 0, "Count can`t be zero!");
        bool found = false;
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i].id == id) {
                found = true;
                Item storage item = items[i];
                require(item.count >= count, "Not enough items!");
                require(msg.value == item.price * count, "Incorrect payment amount");
                purchases[msg.sender].push(Item(item.id, item.name, item.price, count));
                item.count -= count;
                address payable recipient = payable(seller == address(0) ? owner : seller);
                (bool success, ) = recipient.call{value: msg.value}("");
                require(success, "Transfer failed");

                break;
            }
        }

        require(found, "Item not found");
    }

    function getAllItems() public view returns (Item[] memory allItems) {
        allItems = items;
    }
}