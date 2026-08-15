(() => {
  const cfg = window.AZ_STORE;
  if (!cfg) return;
  const api = `${cfg.supabaseUrl}/rest/v1`;
  const headers = {apikey:cfg.anonKey,Authorization:`Bearer ${cfg.anonKey}`,"Content-Type":"application/json"};
  const money = value => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(value || 0);
  const esc = value => String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const readCart = () => { try { return JSON.parse(localStorage.getItem(cfg.cartKey)) || []; } catch { return []; } };
  const writeCart = cart => { localStorage.setItem(cfg.cartKey,JSON.stringify(cart)); updateCounts(); };
  const updateCounts = () => document.querySelectorAll("[data-cart-count]").forEach(el => el.textContent=readCart().reduce((n,item)=>n+item.quantity,0));
  const split = value => value ? value.split(",").map(x=>x.trim()).filter(Boolean) : [];
  const status = (el,text,type="") => { if(!el)return; el.textContent=text; el.className=`form-status ${type}`; };

  async function request(path,options={}) {
    const response = await fetch(`${api}/${path}`,{...options,headers:{...headers,...(options.headers||{})}});
    if (!response.ok) throw new Error((await response.text()) || "No fue posible completar la solicitud.");
    const text = await response.text(); return text ? JSON.parse(text) : null;
  }

  function addToCart(product,choice={}) {
    const cart=readCart(); const key=`${product.id}:${choice.size||""}:${choice.color||""}`;
    const existing=cart.find(item=>item.key===key);
    if(existing) existing.quantity=Math.min(existing.quantity+1,product.stock);
    else cart.push({key,id:product.id,name:product.name,price:Number(product.price_cop),image:product.image_url,stock:product.stock,quantity:1,size:choice.size||"",color:choice.color||""});
    writeCart(cart);
  }

  async function initStore() {
    const grid=document.querySelector("#product-grid"); if(!grid)return;
    try {
      const [categories,products]=await Promise.all([
        request("store_categories?active=eq.true&select=id,slug,name,description&order=sort_order"),
        request("store_products?active=eq.true&stock=gt.0&select=id,category_id,name,slug,description,price_cop,image_url,sizes,colors,stock&order=created_at.desc")
      ]);
      const filters=document.querySelector("#store-filters");
      filters.insertAdjacentHTML("beforeend",categories.map(c=>`<button data-store-filter="${c.id}">${esc(c.name)}</button>`).join(""));
      const render=filter=>{
        const visible=filter==="all"?products:products.filter(p=>p.category_id===filter);
        grid.innerHTML=visible.length?visible.map(p=>`<article class="product-card" data-product="${p.id}"><div class="product-image">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)} de AZ MODA" width="900" height="1200" loading="lazy" decoding="async">`:'<span>Fotografía pendiente</span>'}</div><div class="product-copy"><p class="product-category">${esc(categories.find(c=>c.id===p.category_id)?.name||"AZ MODA")}</p><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><strong>${money(p.price_cop)}</strong>${p.sizes?.length?`<label>Talla<select data-size>${p.sizes.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label>`:""}${p.colors?.length?`<label>Color<select data-color>${p.colors.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label>`:""}<button class="button button-coral" data-add>Agregar al carrito</button></div></article>`).join(""):'<div class="store-empty"><h2>Aún no hay productos en esta categoría.</h2><p>La tienda está lista para recibir las primeras publicaciones desde administración.</p></div>';
        grid.querySelectorAll("[data-add]").forEach(button=>button.onclick=()=>{const card=button.closest("[data-product]");const product=products.find(p=>p.id===card.dataset.product);addToCart(product,{size:card.querySelector("[data-size]")?.value,color:card.querySelector("[data-color]")?.value});button.textContent="Agregado ✓";setTimeout(()=>button.textContent="Agregar al carrito",1400)});
      };
      filters.querySelectorAll("button").forEach(button=>button.onclick=()=>{filters.querySelectorAll("button").forEach(x=>x.classList.toggle("is-active",x===button));render(button.dataset.storeFilter)});
      render("all");
    } catch(error) { grid.innerHTML='<div class="store-empty"><h2>No pudimos cargar la tienda.</h2><p>Intenta actualizar la página en unos minutos.</p></div>'; console.error(error); }
  }

  function initCart() {
    const list=document.querySelector("#cart-items"), form=document.querySelector("#order-form"); if(!list||!form)return;
    const summary=document.querySelector("#cart-summary"), payment=document.querySelector("#payment-step"), formStatus=document.querySelector("#order-status");
    const render=()=>{const cart=readCart();list.innerHTML=cart.length?cart.map(item=>`<article class="cart-item" data-key="${esc(item.key)}"><div>${item.image?`<img src="${esc(item.image)}" alt="${esc(item.name)}" width="180" height="240">`:""}</div><div><h3>${esc(item.name)}</h3><p>${esc([item.size&&`Talla ${item.size}`,item.color].filter(Boolean).join(" · ")||"Sin variante")}</p><strong>${money(item.price)}</strong></div><label>Cantidad<input data-qty type="number" min="1" max="${item.stock}" value="${item.quantity}"></label><button data-remove aria-label="Quitar ${esc(item.name)}">×</button></article>`).join(""):'<div class="cart-empty"><h2>Tu carrito está vacío.</h2><a class="button" href="tienda.html">Explorar la tienda</a></div>';const total=cart.reduce((n,i)=>n+i.price*i.quantity,0);summary.innerHTML=`<span>Subtotal</span><strong>${money(total)}</strong><small>El valor de envío, si aplica, se confirma antes de preparar el pedido.</small>`;form.querySelector('button[type="submit"]').disabled=!cart.length;list.querySelectorAll("[data-qty]").forEach(input=>input.onchange=()=>{const c=readCart(),item=c.find(i=>i.key===input.closest("[data-key]").dataset.key);item.quantity=Math.max(1,Math.min(Number(input.value),item.stock));writeCart(c);render()});list.querySelectorAll("[data-remove]").forEach(button=>button.onclick=()=>{writeCart(readCart().filter(i=>i.key!==button.closest("[data-key]").dataset.key));render()})};
    form.onsubmit=async event=>{event.preventDefault();const cart=readCart();if(!cart.length)return;const data=Object.fromEntries(new FormData(form));const orderId=crypto.randomUUID();status(formStatus,"Creando tu pedido…");try{const created=await request("rpc/create_store_order",{method:"POST",body:JSON.stringify({p_order_id:orderId,p_customer:{customer_name:data.customer_name,customer_whatsapp:data.customer_whatsapp,customer_email:data.customer_email,city:data.city,address:data.address,notes:data.notes||null},p_items:cart.map(i=>({product_id:i.id,quantity:i.quantity,size:i.size||null,color:i.color||null}))})});const total=Number(created?.[0]?.total_cop||0);const settings=(await request("rpc/get_store_payment_settings",{method:"POST",body:"{}"}))?.[0]||{};form.hidden=true;payment.hidden=false;if(settings.transfers_enabled){payment.innerHTML=`<p class="kicker">Pedido recibido</p><h2>Realiza la transferencia</h2><p>Pedido <strong>${orderId.slice(0,8).toUpperCase()}</strong> · Total ${money(total)}</p><dl><dt>Banco</dt><dd>${esc(settings.bank_name)}</dd><dt>Tipo de cuenta</dt><dd>${esc(settings.account_type)}</dd><dt>Número</dt><dd>${esc(settings.account_number)}</dd><dt>Titular</dt><dd>${esc(settings.account_holder)}</dd><dt>Documento</dt><dd>${esc(settings.holder_document)}</dd></dl><form id="proof-form"><label>Comprobante<input type="file" name="proof" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><button class="button button-coral" type="submit">Enviar comprobante</button><p class="form-status" role="status"></p></form><p class="payment-warning">AZ MODA revisará el pago. El pedido solo pasa a preparación después de la confirmación.</p>`;initProof(orderId,payment.querySelector("#proof-form"));}else{payment.innerHTML=`<p class="kicker">Pedido recibido</p><h2>Pago pendiente</h2><p>Tu solicitud quedó registrada con el número <strong>${orderId.slice(0,8).toUpperCase()}</strong>.</p><p>Los datos bancarios todavía no están habilitados. AZ MODA se comunicará contigo para continuar de forma segura.</p>`;}writeCart([]);}catch(error){status(formStatus,"No fue posible crear el pedido. Revisa la disponibilidad e intenta nuevamente.","error");console.error(error)}};
    render();
  }

  function initProof(orderId,form){if(!form)return;form.onsubmit=async event=>{event.preventDefault();const file=new FormData(form).get("proof"),out=form.querySelector(".form-status");if(!file||file.size>8*1024*1024){status(out,"Selecciona un archivo de máximo 8 MB.","error");return}const ext=(file.name.split(".").pop()||"jpg").toLowerCase();const path=`${orderId}/${crypto.randomUUID()}.${ext}`;status(out,"Enviando comprobante…");try{const response=await fetch(`${cfg.supabaseUrl}/storage/v1/object/payment-proofs/${path}`,{method:"POST",headers:{apikey:cfg.anonKey,Authorization:`Bearer ${cfg.anonKey}`,"Content-Type":file.type,"x-upsert":"false"},body:file});if(!response.ok)throw new Error(await response.text());await request(`store_orders?id=eq.${orderId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({payment_proof_path:path,status:"payment_submitted"})});form.innerHTML='<p class="success">Comprobante enviado. AZ MODA verificará la transferencia antes de preparar el pedido.</p>';}catch(error){status(out,"No fue posible enviar el comprobante. Intenta nuevamente o comunícate por WhatsApp.","error");console.error(error)}}}

  updateCounts(); initStore(); initCart();
})();
