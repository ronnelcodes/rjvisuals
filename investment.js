"use strict";
const select=document.querySelector('#printSize');
const quantity=document.querySelector('#printQty');
const total=document.querySelector('#estimateTotal');
const message=document.querySelector('#estimateMessage');
const money=amount=>amount.toLocaleString('en-US',{style:'currency',currency:'USD'});
function updateEstimate(){
  const qty=Math.max(1,Math.min(100,Math.floor(Number(quantity.value)||1)));
  const cents=Math.round(Number(select.value)*100)*qty;
  total.textContent=money(cents/100);
  const shortfall=2000-cents;
  message.textContent=shortfall>0?`Add ${money(shortfall/100)} more in prints to meet the $20 minimum.`:'Your selected print subtotal meets the $20 minimum. Open your gallery to purchase.';
  message.classList.toggle('eligible',shortfall<=0);
}
select.addEventListener('change',updateEstimate);
quantity.addEventListener('input',updateEstimate);
updateEstimate();
