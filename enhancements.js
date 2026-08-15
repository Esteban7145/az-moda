(() => {
  const az = window.AZ_DATA || {};
  const contact = az.contact || {};
  const wa = text => `https://wa.me/${contact.phone || "573046385554"}?text=${encodeURIComponent(text)}`;
  const message = key => (az.messages || {})[key] || (az.messages || {}).general || "Hola, quiero información sobre una prenda sobre medida.";
  const labels = {novias:"Novias",quince:"Quince años",ceremonia:"Primera comunión",ocasion:"Gala y eventos",infantiles:"Infantiles",casual:"Eventos y uso diario",esencial:"Línea esencial"};

  // Retira los adornos decorativos heredados sin alterar el contenido.
  document.querySelectorAll(".ceremony-objects").forEach(node => node.remove());

  // Actualiza los textos heredados de la antigua presentación de la galería.
  if (document.body.dataset.page === "galeria") {
    const description = document.querySelector('meta[name="description"]');
    const gallery = document.querySelector(".gallery-shell");
    if (description) description.content = "Galería de vestidos y prendas confeccionadas por AZ Moda.";
    if (gallery) gallery.setAttribute("aria-label", "Galería de prendas");
  }

  document.querySelectorAll('.viewer-media img[alt=""]').forEach(image => {
    image.alt = "Vista ampliada del diseño seleccionado";
  });

  const menuButton = document.querySelector(".menu-toggle,.nav-toggle");
  const menu = document.querySelector(".main-nav,#nav");
  if (menuButton && menu) {
    const syncMenu = () => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      document.body.classList.toggle("menu-open", open);
      menuButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    };
    // Un único controlador evita que los dos encabezados históricos del sitio
    // cambien el estado dos veces en el mismo toque.
    menuButton.onclick = null;
    menuButton.addEventListener("click", event => {
      event.stopImmediatePropagation();
      const open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
      syncMenu();
    }, true);
    menu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      syncMenu();
    }));
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || menuButton.getAttribute("aria-expanded") !== "true") return;
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      syncMenu();
      menuButton.focus();
    });
    syncMenu();
  }

  const header = document.querySelector(".site-header,.topbar");
  if (header) {
    const updateHeader = () => header.classList.toggle("is-scrolled", scrollY > 24);
    addEventListener("scroll", updateHeader, {passive:true});
    updateHeader();
  }

  document.querySelectorAll("[data-wa-context]").forEach(link => {
    link.href = wa(message(link.dataset.waContext));
    link.target = "_blank";
    link.rel = "noopener";
  });

  const requested = new URLSearchParams(location.search).get("categoria");
  const legacyNav = document.querySelector("#nav");
  if (legacyNav && !legacyNav.querySelector('[href="tienda.html"]')) {
    const storeLink = document.createElement("a");
    storeLink.href = "tienda.html";
    storeLink.textContent = "Tienda";
    legacyNav.insertBefore(storeLink, legacyNav.querySelector('.nav-contact'));
  }
  if (legacyNav && !legacyNav.querySelector('[href="cotizacion.html"]')) {
    const quoteLink = document.createElement("a");
    quoteLink.href = "cotizacion.html";
    quoteLink.textContent = "Cotización";
    legacyNav.insertBefore(quoteLink, legacyNav.querySelector(".nav-contact"));
  }
  document.querySelectorAll(".nav-contact").forEach(link => {
    link.href = wa(message(requested || (document.body.dataset.page === "galeria" ? "general" : "general")));
  });
  const floating = document.createElement("a");
  floating.className = "wa-float";
  floating.href = wa(message(requested || "general"));
  floating.target = "_blank";
  floating.rel = "noopener";
  floating.setAttribute("aria-label", "Conversar con AZ MODA por WhatsApp");
  floating.innerHTML = "<span>✦</span><b>WhatsApp</b>";
  document.body.append(floating);

  const footer = document.querySelector("[data-footer]") || document.querySelector("footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `<div class="footer-brand"><a class="brand" href="index.html">AZ <span>MODA</span></a><p>Diseño, confección sobre medida y prendas seleccionadas para momentos que merecen sentirse propios.</p></div><div><h2>Visítanos</h2><p>${contact.city || "Manizales, Colombia"}<br>${contact.appointment || "Atención con cita previa"}</p><a href="${wa(message("general"))}" target="_blank" rel="noopener">WhatsApp · ${contact.displayPhone || "304 638 5554"}</a></div><div><h2>Explorar</h2><a href="colecciones.html">Diseños</a><a href="tienda.html">Tienda online</a><a href="cotizacion.html">Cotización</a><a href="resenas.html">Opiniones</a><a href="index.html#preguntas">Preguntas frecuentes</a><a href="cotizacion.html#datos">Tratamiento de datos</a></div><div><h2>Redes</h2><a href="${contact.instagram}" target="_blank" rel="noopener">Instagram ↗</a><a href="${contact.facebook}" target="_blank" rel="noopener">Facebook ↗</a></div><small>© ${new Date().getFullYear()} AZ MODA</small>`;
  }

  // Identidad oficial: dorado en los encabezados y blanco en el pie oscuro.
  // El texto original permanece como respaldo accesible si la imagen no carga.
  document.querySelectorAll(".brand").forEach(link => {
    if (link.querySelector(".brand-logo")) return;
    const fallback = document.createElement("span");
    fallback.className = "brand-fallback";
    fallback.innerHTML = link.innerHTML;

    const image = document.createElement("img");
    image.className = "brand-logo";
    image.src = link.closest("footer")
      ? "assets/brand/az-moda-logo-light.png"
      : "assets/brand/az-moda-logo-gold.png";
    image.alt = "";
    image.width = 664;
    image.height = 720;
    image.decoding = "async";
    if (!link.closest("footer")) image.fetchPriority = "high";
    image.addEventListener("error", () => link.classList.add("logo-fallback"), {once:true});

    link.setAttribute("aria-label", "AZ MODA · Ir al inicio");
    link.replaceChildren(image, fallback);
  });

  const faq = document.querySelector("[data-faq-list]");
  if (faq) faq.innerHTML = (az.faqs || []).map((item, i) => `<details class="faq-item reveal"><summary><span>${String(i + 1).padStart(2,"0")}</span>${item.question}<i>+</i></summary><p>${item.answer}</p></details>`).join("");

  const works = [{
    code:"AZ-REAL-01",name:"Celeste drapeado",category:"Evento especial",
    description:"Vestido largo de silueta envolvente, confeccionado y ajustado para una ocasión especial.",
    details:"Drapeado, manga corta y abertura frontal.",
    images:["assets/cliente-celeste-largo-retrato.webp","assets/cliente-celeste-largo-atelier.webp","assets/cliente-celeste-largo-exterior.webp"]
  },{
    code:"AZ-REAL-02",name:"Celeste cotidiano",category:"Diseño personalizado",
    description:"Vestido corto de líneas suaves creado para acompañar distintos momentos con comodidad.",
    details:"Manga corta, cintura definida y falda con vuelo.",
    images:["assets/cliente-celeste-corto-mirador.webp","assets/cliente-celeste-corto-ciudad.webp","assets/cliente-celeste-corto-atelier.webp"]
  },{
    code:"AZ-REAL-03",name:"Verde salvia",category:"Evento especial",
    description:"Vestido de línea fluida confeccionado sobre medida para una celebración al aire libre.",
    details:"Escote cuadrado, manga amplia, cinturón delicado y falda con volante.",
    images:["assets/trabajo-verde-salvia-cliente.webp","assets/trabajo-verde-salvia-atelier.webp","assets/trabajo-verde-salvia-exterior.webp"]
  },{
    code:"AZ-REAL-04",name:"Azul petróleo",category:"Evento especial",
    description:"Diseño largo de silueta limpia creado para realzar el movimiento y la elegancia de su ocasión.",
    details:"Cuello redondo, línea ajustada y mangas largas con amplitud en el puño.",
    images:["assets/trabajo-azul-petroleo-cliente-1.webp","assets/trabajo-azul-petroleo-atelier.webp","assets/trabajo-azul-petroleo-cliente-2.webp"]
  }];
  const workshop = document.querySelector("[data-workshop-list]");
  if (workshop) {
    workshop.innerHTML = works.map(work => `<article class="workshop-card reveal"><div class="workshop-gallery" data-workshop-gallery><div class="workshop-images" tabindex="0" role="group" aria-roledescription="carrusel" aria-label="Fotografías de ${work.name}">${work.images.map((src,i)=>`<figure class="workshop-slide" data-slide="${i}"><img src="${src}" alt="${work.name}, vista ${i+1}" width="768" height="1024" loading="lazy"></figure>`).join("")}</div><div class="workshop-controls"><button type="button" data-gallery-prev aria-label="Fotografía anterior">←</button><span data-gallery-count>01 / ${String(work.images.length).padStart(2,"0")}</span><button type="button" data-gallery-next aria-label="Fotografía siguiente">→</button></div></div><div class="workshop-copy"><div class="design-tags"><span>Trabajo real</span><span>Sobre medida</span></div><small>${work.code} · ${work.category}</small><h3>${work.name}</h3><p>${work.description}</p><dl><dt>Detalles personalizados</dt><dd>${work.details}</dd></dl><a class="text-link" href="${wa(`Hola, vi el trabajo ${work.name} ${work.code} en la página de AZ MODA y quiero cotizar una prenda similar confeccionada sobre medida.`)}" target="_blank" rel="noopener">Quiero algo similar <span>↗</span></a></div></article>`).join("");

    workshop.querySelectorAll("[data-workshop-gallery]").forEach(gallery => {
      const slides = [...gallery.querySelectorAll(".workshop-slide")];
      const stage = gallery.querySelector(".workshop-images");
      const count = gallery.querySelector("[data-gallery-count]");
      let active = 0;
      let touchStart = 0;
      const render = () => {
        slides.forEach((slide, index) => {
          const offset = (index - active + slides.length) % slides.length;
          slide.dataset.position = offset === 0 ? "active" : offset === 1 ? "next" : offset === slides.length - 1 ? "previous" : "hidden";
          slide.setAttribute("aria-hidden", String(offset !== 0));
        });
        count.textContent = `${String(active + 1).padStart(2,"0")} / ${String(slides.length).padStart(2,"0")}`;
      };
      const move = direction => {
        active = (active + direction + slides.length) % slides.length;
        render();
      };
      gallery.querySelector("[data-gallery-prev]").addEventListener("click", () => move(-1));
      gallery.querySelector("[data-gallery-next]").addEventListener("click", () => move(1));
      stage.addEventListener("keydown", event => {
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      });
      stage.addEventListener("touchstart", event => { touchStart = event.changedTouches[0].clientX; }, {passive:true});
      stage.addEventListener("touchend", event => {
        const distance = event.changedTouches[0].clientX - touchStart;
        if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
      }, {passive:true});
      render();
    });
  }

  const form = document.querySelector("#quote-form");
  if (form) {
    const ref = new URLSearchParams(location.search).get("diseno") || "";
    form.designReference.value = ref;
    const selected = document.querySelector("[data-selected-design]");
    if (ref) { selected.hidden = false; selected.innerHTML = `<span>Diseño de referencia</span><strong>${ref}</strong>`; }
    form.addEventListener("submit", event => {
      event.preventDefault();
      const status = document.querySelector("#quote-status");
      if (!form.checkValidity()) { form.reportValidity(); status.textContent = "Revisa los campos obligatorios antes de continuar."; return; }
      const f = new FormData(form), image = f.get("referenceImage");
      const lines = ["Hola, quiero solicitar una cotización en AZ MODA.",""];
      if (ref) lines.push(`Diseño de referencia: ${ref}`);
      lines.push(`Nombre: ${f.get("name")}`,`WhatsApp: ${f.get("whatsapp")}`,`Ciudad: ${f.get("city")}`,`Tipo de prenda: ${f.get("garment")}`,`Tipo de evento: ${f.get("eventType") || "Por definir"}`,`Fecha del evento: ${f.get("eventDate") || "Por definir"}`,`Talla aproximada: ${f.get("size") || "Por definir"}`,`Color: ${f.get("color") || "Por definir"}`,`Presupuesto aproximado: ${f.get("budget") || "Por definir"}`,`Modalidad: ${f.get("mode")}`,`Descripción de la idea: ${f.get("description")}`);
      if (image && image.name) lines.push("","Tengo una imagen de referencia y la enviaré en esta conversación.");
      status.textContent = image && image.name ? "WhatsApp se abrirá ahora. Recuerda adjuntar allí tu imagen de referencia." : "Abriendo tu solicitud en WhatsApp…";
      window.open(wa(lines.join("\n")), "_blank", "noopener");
    });
  }

  const galleryStage = document.querySelector("#gallery-stage");
  if (galleryStage) {
    galleryStage.tabIndex = 0;
    galleryStage.setAttribute("aria-label", "Galería de diseños. Usa las flechas izquierda y derecha para recorrerla.");
    galleryStage.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        document.querySelector(".gallery-arrow.prev")?.click();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        document.querySelector(".gallery-arrow.next")?.click();
      }
    });
    document.querySelector(".gallery-progress")?.setAttribute("aria-live", "polite");
    document.querySelectorAll("[data-gallery-filter]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-gallery-filter]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
      });
    });
    if (requested) document.querySelector(`[data-gallery-filter="${requested}"]`)?.click();
  }

  if (typeof pieces !== "undefined") {
    pieces.forEach((piece,i) => {
      piece.code = `AZ-${String(i+1).padStart(3,"0")}`;
      piece.categoryKey = typeof categories !== "undefined" ? categories[i] : "ocasion";
      piece.categoryLabel = labels[piece.categoryKey] || "Diseño personalizado";
      piece.designType = /cliente-|esencial-|trabajo-/.test(piece.src) ? "Trabajo real" : "Diseño de referencia";
    });
    const catalog = document.querySelector("#catalog");
    if (catalog) {
      catalog.innerHTML = pieces.map((piece,i)=>`<article class="catalog-card design-card" data-index="${i}" data-category="${piece.categoryKey}"><button class="catalog-open" type="button" aria-label="Ver detalles de ${piece.title}"><span class="image"><img src="${piece.src}" alt="${piece.alt}" width="768" height="1024" loading="lazy"></span></button><div class="meta"><div><small>${piece.code} · ${piece.categoryLabel}</small><h2>${piece.title}</h2><div class="design-tags"><span>Sobre medida</span><span>Personalizable</span></div></div><button class="icon-open" type="button" aria-label="Ampliar ${piece.title}">↗</button></div><a class="card-quote" href="cotizacion.html?diseno=${encodeURIComponent(`${piece.title} ${piece.code}`)}">Cotizar un diseño similar</a></article>`).join("");
      catalog.querySelectorAll(".catalog-card").forEach(card => card.querySelectorAll(".catalog-open,.icon-open").forEach(button => button.addEventListener("click",()=>openViewer(Number(card.dataset.index)))));
      const filter = value => {
        document.querySelectorAll("[data-filter]").forEach(button=>{
          const active = button.dataset.filter===value;
          button.classList.toggle("is-active",active);
          button.setAttribute("aria-pressed",String(active));
        });
        catalog.querySelectorAll(".catalog-card").forEach(card=>card.hidden=value!=="all"&&card.dataset.category!==value);
        floating.href=wa(message(value));
        document.querySelectorAll(".nav-contact").forEach(link => link.href = wa(message(value)));
      };
      document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>filter(button.dataset.filter)));
      if (requested && document.querySelector(`[data-filter="${requested}"]`)) filter(requested);
      else filter("all");
    }
    const dialog = document.querySelector(".viewer");
    if (dialog && !dialog.querySelector(".viewer-custom")) {
      dialog.querySelector(".viewer-details")?.insertAdjacentHTML("afterend",`<div class="viewer-custom"><div class="design-tags"><span>Sobre medida</span><span>Personalizable</span></div><p class="viewer-type"></p><h3>Opciones que podemos revisar</h3><p>Color, largo, mangas, escote, tela, aplicaciones, detalles decorativos y ajustes según medidas.</p><small>Las opciones de personalización pueden variar según el diseño, la tela y el tipo de confección.</small><a class="button button-dark viewer-quote" href="#">Cotizar un diseño similar</a></div>`);
      new MutationObserver(()=>{
        const i=Number(dialog.querySelector(".viewer-count")?.textContent.trim().split(" ")[0])-1, piece=pieces[i>=0?i:0];
        const typeText=`${piece.code} · ${piece.categoryLabel} · ${piece.designType}`;
        if(dialog.querySelector(".viewer-type").textContent!==typeText)dialog.querySelector(".viewer-type").textContent=typeText;
        dialog.querySelector(".viewer-quote").href=`cotizacion.html?diseno=${encodeURIComponent(`${piece.title} ${piece.code}`)}`;
      }).observe(dialog,{subtree:true,childList:true,characterData:true});
    }
  }

  const items = document.querySelectorAll(".reveal");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}}),{threshold:.1});
    items.forEach(item=>observer.observe(item));
  } else items.forEach(item=>item.classList.add("is-visible"));
})();
