document.getElementById("shop-name").innerText = CONFIG.shopName;

let cart = JSON.parse(localStorage.getItem("cart")||"[]");

function updateCart(){
  localStorage.setItem("cart", JSON.stringify(cart));
  let count = document.getElementById("cart-count");
  if(count) count.innerText = cart.length;
}

async function loadProducts(){
  let res = await fetch("data/products/manifest.json");
  let list = await res.json();
  let grid = document.getElementById("product-grid");
  if(!grid) return;

  for(let p of list){
    let r = await fetch("data/products/"+p);
    let prod = await r.json();

    let el = document.createElement("div");
    el.className="product-card";
    el.innerHTML = `
      <img src="${prod.image}">
      <h3>${prod.name}</h3>
      <p>$${prod.price}</p>
      <button onclick="addToCart('${prod.id}')">Add</button>
      <button onclick="location.href='product.html?id=${prod.id}'">View</button>
    `;
    grid.appendChild(el);
  }
}

async function loadProductPage(){
  let params = new URLSearchParams(location.search);
  let id = params.get("id");
  if(!id) return;

  let res = await fetch("data/products/"+id+".json");
  let p = await res.json();

  let c = document.getElementById("product-container");
  if(!c) return;

  c.innerHTML = `
    <h2>${p.name}</h2>
    <img src="${p.image}">
    <p>${p.description}</p>
    <h3>$${p.price}</h3>
    <button onclick="addToCart('${p.id}')">Add to Cart</button>
  `;
}

function addToCart(id){
  cart.push(id);
  updateCart();
}

function loadCart(){
  let el = document.getElementById("cart-items");
  if(!el) return;

  el.innerHTML = cart.join("<br>");
}

updateCart();
loadProducts();
loadProductPage();
loadCart();
