let LANG={};
let cart=JSON.parse(localStorage.getItem("cart")||"[]");

async function loadLang(){
  let res=await fetch("data/lang/"+CONFIG.language+".json");
  LANG=await res.json();
}

function saveCart(){localStorage.setItem("cart",JSON.stringify(cart));}

function addToCart(p){
  cart.push(p);
  saveCart();
  showPopup(p.name+" "+LANG.added);
}

function showPopup(txt){
  let d=document.createElement("div");
  d.className="popup";
  d.innerText=txt;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),2000);
}

async function renderShop(divId){
  await loadLang();
  let container=document.getElementById(divId);
  let grid=document.createElement("div");
  grid.className="shop-grid";

  let m=await fetch("data/products/manifest.json");
  let list=await m.json();

  for(let file of list){
    let r=await fetch("data/products/"+file);
    let p=await r.json();

    let c=document.createElement("div");
    c.className="shop-card";
    c.innerHTML=`
      <img src="${p.image}" style="width:100%">
      <h3>${p.name}</h3>
      <p>${CONFIG.currency}${p.price}</p>
      <button onclick='addToCart(${JSON.stringify(p)})'>${LANG.buy_now}</button>
    `;
    grid.appendChild(c);
  }
  container.appendChild(grid);
}

function renderCartIcon(){
  let d=document.createElement("div");
  d.className="shop-cart";
  d.innerText="🛒";
  d.onclick=()=>alert("Cart items: "+cart.length);
  document.body.appendChild(d);
}

function calculateTotal(){
  let subtotal=cart.reduce((a,b)=>a+b.price,0);
  let weight=cart.reduce((a,b)=>a+b.weight,0);
  let shipping=CONFIG.shipping.base+(weight*CONFIG.shipping.perKg);
  let tax=subtotal*CONFIG.taxRate;
  return subtotal+shipping+tax;
}

function attachBuyOverlay(selector,productId){
  document.querySelectorAll(selector).forEach(el=>{
    let o=document.createElement("div");
    o.className="buy-overlay";
    o.innerText=LANG.buy_now;
    o.onclick=async ()=>{
      let r=await fetch("data/products/"+productId+".json");
      let p=await r.json();
      addToCart(p);
    };
    el.style.position="relative";
    el.appendChild(o);
  });
}

window.Shop={
  renderShop,
  renderCartIcon,
  attachBuyOverlay,
  calculateTotal
};
