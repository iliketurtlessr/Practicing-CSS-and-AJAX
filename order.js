
//  this is our global variable which represents the current selected restaurant.
let currRestaurant;
//  to keep track of the current restaurant value in "option". more on this later.
let currentValue;

function initializeRestaurant(res) {

	function itemsWithPrices(restaurant) {
		let menu = restaurant.menu;
		let toRet = {};

		for (const category in menu) {
			for (item of Object.values(menu[category])) {
				toRet[item.name] = item.price;
			}
		}
		return toRet;
	}

	function itemsWithIds(restaurant) {

		let menu = restaurant.menu;
		let toRet = {};

		Object.keys(menu).forEach(category => {
			Object.keys(menu[category]).forEach(id => {
				toRet[menu[category][id].name] = id;
			});
		});
		return toRet;
	}

	let restaurant = res;
	/**
	 * cart will look as follows:
	 * ```js
	 * cart = {
	 * "item1": quantity1,
	 * "item2": quantity2,
	 * ... }
	 * ```
	 */
	let cart = {};
	let prices = itemsWithPrices(restaurant);
	let ids = itemsWithIds(restaurant);

	return { //returning an OBJECT that contain functions
		getRestaurant: () => { return restaurant; },
		getCart: () => { return cart; },
		addItemToCart: (item) => {
			if (cart.hasOwnProperty(item))
				cart[item]++;
			else
				cart[item] = 1;
		},
		removeItemFromCart: (item) => {
			if (cart.hasOwnProperty(item)) {
				if (cart[item] === 1)
					delete cart[item];
				else
					cart[item]--;
			}
		},
		getItemsWithPrices: () => { return prices; },
		getItemsWithIds: () => { return ids; }

	}

}


genDropDownList();
document.getElementById("restaurantSelector").addEventListener("change", getRestaurant);

/**
 * Requests server for list of available restaurants, and populates
 * 	them in a drop-down list
 */
function genDropDownList() {
	let req = new XMLHttpRequest;
	req.onreadystatechange = function () {
		if (req.readyState === 4 && req.status === 200) {

			let restaurants = JSON.parse(this.responseText);
			console.log(restaurants);

			//  Load restaurants list onto the webpage
			document.getElementById("restaurantSelector").innerHTML +=
				`<option value="-1" hidden>Choose one...</option>`;
			let i = 0;
			for (const r of restaurants) {
				document.getElementById("restaurantSelector").innerHTML +=
					`<option value="${i++}">${r}</option>`;
			}
		}
	}
	req.open("PUT", `http://localhost:3000/order`);
	req.send();
}

/**
 * 
 * Requests server for restaurant selected by user
 */
function getRestaurant() {

	//  Look if we can change the restaurant or not
	if (!canChangeRestaurant()) {
		let ans = confirm("Looks like your cart is not empty.\n" +
			"Do you still want to change restaurants?");
		if (!ans) {
			//If user refused the change of restaurant, 
			// reset the selected index to what it was before they changed it
			document.getElementById("restaurantSelector").value = currentValue;
			return;
		}
	}
	currentValue = document.getElementById("restaurantSelector").value;

	let req = new XMLHttpRequest;
	req.onreadystatechange = function () {
		if (req.readyState === 4 && req.status === 200) {
			let res = JSON.parse(this.responseText);
			currRestaurant = initializeRestaurant(res);
			renderRestaurant();
		}
	}
	req.open("GET", `http://localhost:3000/order/${currentValue}`);
	req.send();
}


/**
 * Renders selected restaurant to the page
 */
function renderRestaurant() {

	// updating the details of restaurant on the top right corner
	updateDetails();

	//  Update 'Categories' and 'Menu'
	menu = currRestaurant.getRestaurant().menu;
	let str1 = `<ul>`;  // this is for 'Categories' column
	let str2 = `<ul>`;  // this is for 'Items' column
	for (category in menu) {

		str1 += `<li><a href="#${category}">${category}</a></li>`;
		str2 += `<li class="category" id="${category}">${category}</li><ul>`;

		for (itemId of Object.keys(menu[category])) {

			// console.log(itemId);
			// console.log(getItemById(itemId));
			let item = getItemById(itemId);

			str2 += `<li id="item" onclick="addItem(${itemId})">${item.name}</li>` +
				`<dd id="description">-${item.description}</dd><br>` +
				`<dd id="price">-$${item.price.toFixed(2)}</dd>` +
				`<img id="add" src="add.png" onclick="addItem(${itemId})" alt="plus">`;
		}
		str2 += `</ul>`;
	}
	document.getElementById("col1").innerHTML = str1 + `</ul>`;
	document.getElementById("col2").innerHTML = str2 + `</ul>`;

	//Refresh cart
	refreshCart();

	// remember the restaurant
	currentValue = document.getElementById("restaurantSelector").value;
}


/**
 * This function updates the details of the restaurant
 *  which is shown on the top right corner
 */
function updateDetails() {
	document.getElementById("details").innerHTML = `${currRestaurant.getRestaurant().name}<br>` +
		`<mark>Minimum Order: $${currRestaurant.getRestaurant().min_order.toFixed(2)}</mark><br>` +
		`Delivery fee: $${currRestaurant.getRestaurant().delivery_fee.toFixed(2)}`;
}

/**
 * This is called when user tries to add item by clicking on the item itself 
 * @param {Number} id id of the item to be added
 */
function addItem(id) {
	currRestaurant.addItemToCart(getItemById(id).name);
	refreshCart();
}

/**
 * Helper function for removing item from cart
 * @param {Number} id id of the item to be removed from cart
 */
function removeItem(id) {
	currRestaurant.removeItemFromCart(getItemById(id).name);
	refreshCart();
}

/**
 * This refreshes the cart list, sub-total and stuff.
 *   Basically, "Order Summary" stuff.
 */
function refreshCart() {

	let cart = currRestaurant.getCart();
	let prices = currRestaurant.getItemsWithPrices();
	let ids = currRestaurant.getItemsWithIds();
	let subTotal = 0;
	let str3 = `Items in your bag`;
	str3 += `<ul id="itemsInCart">`;
	if (Object.keys(cart).length === 0)
		str3 += `No items in cart yet`;
	else {
		//  update the cart list in HTML
		for (const name of Object.keys(cart)) {

			let id = ids[name];
			subTotal += prices[name] * cart[name];
			str3 += `<li id="${id}" class="cartItem" onclick="removeItem(${id})">` +
				`${name} x ${cart[name]}: $${(prices[name] * cart[name]).toFixed(2)}` +
				`<img id="remove" src="remove.png" onclick="removeItem(${itemId})" alt="minus"></li>`;
		}
	}
	str3 += `</ul>`;

	//  add costs to Order Summary
	str3 += `<div id="subTotal">Sub-total: $${subTotal.toFixed(2)}</div>`;
	let delFee = currRestaurant.getRestaurant().delivery_fee; 
	str3 += `<div id="deliveryFee">Delivery fee: ` +
		`$${delFee.toFixed(2)}</div>`;
	str3 += `<div id="tax">Tax: $${(subTotal*0.10).toFixed(2)}</div>`;
	let totalAmt = subTotal + subTotal*0.1 + delFee;
	str3 += `<div id="totalCost">Total cost: $${totalAmt.toFixed(2)}</div>`;

	//Decide whether to show the Submit Order button or the Order X more label
	let min = currRestaurant.getRestaurant().min_order;
	if (subTotal < min) {
		let msg = `You need to add $${(min - subTotal).toFixed(2)} more to your order before submitting`;
		str3 += `<div id="message"><br>${msg}</div>`;
	} else {
		str3 += `<button type="button" id="submitButton" ` +
			`onclick="sendOrder(${totalAmt})">Submit</button>`;
	}

	document.getElementById("col3").innerHTML = str3;
}

/**
 * Sends the details of current order to server
 * @param {Number} amt The total cost of this order
 */
 function sendOrder(amt) {

	// console.log(JSON.stringify(currRestaurant.getCart()));
	let data = {
		items : currRestaurant.getCart(),
		amt : amt.toFixed(2)
	}
	let req = new XMLHttpRequest;
	req.onreadystatechange = function () {
		if (this.readyState === 4 && this.status === 200) {
			alert(`Your order of $${amt.toFixed(2)} has been successfully ` +
				`submitted to ${currRestaurant.getRestaurant().name}`);
			document.getElementById("restaurantSelector").value = -1;
			currRestaurant = undefined;
			resetPage();
		}
	}
	req.open("POST", `http://localhost:3000/order/${currentValue}`);
	console.log(currRestaurant.getRestaurant().name, data);
	req.send(JSON.stringify(data));
}


/**
 * returns true if there are no items in cart or when no restaurant is selected
 */
 function canChangeRestaurant() {
	if (currRestaurant == undefined)
		return true;    //  when no restaurant is selected
	if (Object.keys(currRestaurant.getCart()).length == 0)
		return true;    //  when there's nothing in our cart
	return false;
}


/**
 * Helper function to help reset the page
 */
function resetPage() {
	document.getElementById("col1").innerHTML = "";
	document.getElementById("col2").innerHTML = "";
	document.getElementById("col3").innerHTML = "";
	document.getElementById("details").innerHTML = "";
}

/**
 * Helper function to get the item, given id of the item
 * @param {Number} id Id of the item we want
 * @returns the item requested
 */
function getItemById(id) {
	let menu = currRestaurant.getRestaurant().menu;
	let categories = Object.keys(menu);
	for (let i = 0; i < categories.length; i++) {
		if (menu[categories[i]].hasOwnProperty(id)) {
			return menu[categories[i]][id];
		}
	}
	return null;
}

/**
 * This is a helper function to put "Order Summary"
 *  IN the screen when scrolled down
 * Courtesy: w3schools.com
 */
window.onscroll = function () {
	let node = document.getElementById("col3");
	let sticky = node.offsetTop;

	if (window.pageYOffset > sticky)
		node.classList.add("sticky");
	else
		node.classList.remove("sticky");
}
