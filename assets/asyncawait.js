const getCart = async () => {
  return await fetch("/cart.js", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

getCart();

const addToCart = async (forceQuantity = null, variantId) => {
  return await fetch("/cart/add.js", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          quantity: forceQuantity != null ? forceQuantity : lineItem.quantity,
          id: variantId,
        },
      ],
    }),
  })
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error("could not update quantity");
    });
};

setTimeout(() => {
  addToCart(1, 47960742494426);
}, 5000);

const updateCartItem = async (
  forceQuantity = null,
  variantId,
  lineItem = null,
) => {
  return fetch("/cart/change.js", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quantity: forceQuantity,
      id: variantId,
    }),
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

setTimeout(() => {
  updateCartItem(7, "47960742494426", null);
}, 10000);
