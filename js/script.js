// ============================================================
// DROPZONE — Main Application Logic
// ============================================================

(function () {
  'use strict';

  // ──────────────────────────────────────────────────────────
  //  DOM REFERENCES
  // ──────────────────────────────────────────────────────────
  const $id = (id) => document.getElementById(id);

  const countdownEl       = $id('countdown');
  const productGrid       = $id('productGrid');
  const resultCountEl     = $id('resultCount');
  const searchInput       = $id('search');
  const categoryFilter    = $id('categoryFilter');
  const priceFilter       = $id('priceFilter');
  const priceLabel        = $id('priceLabel');
  const sortFilter        = $id('sortFilter');
  const cartCountBadge    = $id('cartCount');
  const cartItemsEl       = $id('cartItems');
  const cartTotalEl       = $id('cartTotal');
  const cartEmptyEl       = $id('cartEmpty');
  const discountCodeInput = $id('discountCode');
  const discountMsgEl     = $id('discountMsg');
  const applyDiscountBtn  = $id('applyDiscount');
  const checkoutBtn       = $id('checkoutBtn');
  const checkoutForm      = $id('checkoutForm');
  const checkoutSummary   = $id('checkoutSummary');
  const orderSuccessEl    = $id('orderSuccess');

  // Modal elements
  const modalImage       = $id('modalImage');
  const modalName        = $id('modalName');
  const modalPrice       = $id('modalPrice');
  const modalDescription = $id('modalDescription');
  const modalRating      = $id('modalRating');
  const modalStock       = $id('modalStock');
  const modalSizes       = $id('modalSizes');
  const modalSizesGroup  = $id('modalSizesGroup');
  const modalQty         = $id('modalQty');
  const modalQtyMinus    = $id('modalQtyMinus');
  const modalQtyPlus     = $id('modalQtyPlus');
  const modalAddToCart   = $id('modalAddToCart');
  const modalWishlist    = $id('modalWishlist');

  const productModalEl = $id('productModal');
  const productModal   = new bootstrap.Modal(productModalEl);

  // ──────────────────────────────────────────────────────────
  //  STATE
  // ──────────────────────────────────────────────────────────
  let currentProductId  = null;
  let currentSize       = null;
  let currentQty        = 1;
  let countdownInterval = null;

  // Discount
  const DISCOUNT_CODES = { 'DROP10': 0.10, 'CX20': 0.20 };
  let discountRate = 0;
  let appliedCode  = '';

  // ──────────────────────────────────────────────────────────
  //  HELPERS
  // ──────────────────────────────────────────────────────────
  function formatPrice(num) {
    return 'Rs ' + num.toLocaleString('en-PK');
  }

  function starsHTML(rating) {
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let s = '';
    for (let i = 0; i < full; i++)  s += '<span class="star filled">★</span>';
    for (let i = 0; i < half; i++)  s += '<span class="star half">★</span>';
    for (let i = 0; i < empty; i++) s += '<span class="star empty">☆</span>';
    return `<span class="stars">${s}</span> <span class="rating-num">${rating}</span>`;
  }

  function stockLabel(stock) {
    if (stock === 0)  return '<span class="stock-label sold-out">Sold Out</span>';
    if (stock <= 3)   return `<span class="stock-label low">Only ${stock} left</span>`;
    return '<span class="stock-label ok">In Stock</span>';
  }

  function findProduct(id) {
    return PRODUCTS.find(p => p.id === id);
  }

  // ──────────────────────────────────────────────────────────
  //  1. COUNTDOWN TIMER
  // ──────────────────────────────────────────────────────────
  function startCountdown() {
    // Target: 3 days from first visit (persisted) so it's consistent
    let targetTime;
    try {
      const stored = localStorage.getItem('dropzone_countdown_target');
      if (stored) {
        targetTime = parseInt(stored, 10);
      }
    } catch (e) { /* ignore */ }

    if (!targetTime || targetTime <= Date.now()) {
      targetTime = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days
      try { localStorage.setItem('dropzone_countdown_target', targetTime.toString()); } catch (e) { /* ignore */ }
    }

    function tick() {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        countdownEl.textContent = 'DROP CLOSED';
        countdownEl.classList.add('closed');
        clearInterval(countdownInterval);
        return;
      }
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      countdownEl.textContent = `${h}:${m}:${s}`;
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  // ──────────────────────────────────────────────────────────
  //  2. RENDER PRODUCTS
  // ──────────────────────────────────────────────────────────
  function renderProducts(list) {
    productGrid.innerHTML = '';

    if (list.length === 0) {
      productGrid.innerHTML = '<div class="col-12 text-center text-secondary py-5"><p class="fs-5">No products match your filters.</p></div>';
      resultCountEl.textContent = 'Showing 0 products';
      return;
    }

    list.forEach(p => {
      const badgeHTML = p.badge
        ? `<span class="product-badge">${p.badge}</span>`
        : '';

      const isSoldOut = p.stock === 0;

      const card = document.createElement('div');
      card.className = 'col-6 col-md-4 col-lg-3';
      card.innerHTML = `
        <div class="product-card card h-100" data-id="${p.id}">
          <div class="card-img-wrapper">
            ${badgeHTML}
            <img src="${p.image}" class="card-img-top" alt="${p.name}" loading="lazy">
          </div>
          <div class="card-body d-flex flex-column">
            <h6 class="card-title mb-1">${p.name}</h6>
            <p class="card-price mb-1">${formatPrice(p.price)}</p>
            <div class="mb-1">${starsHTML(p.rating)}</div>
            <div class="mb-2">${stockLabel(p.stock)}</div>
            <button class="btn btn-accent btn-sm mt-auto add-to-cart-btn"
                    data-id="${p.id}"
                    ${isSoldOut ? 'disabled' : ''}>
              ${isSoldOut ? 'Sold Out' : 'Add to Cart'}
            </button>
          </div>
        </div>
      `;
      productGrid.appendChild(card);
    });

    resultCountEl.textContent = `Showing ${list.length} product${list.length !== 1 ? 's' : ''}`;
  }

  // ──────────────────────────────────────────────────────────
  //  3. FILTER + SEARCH + SORT
  // ──────────────────────────────────────────────────────────
  function applyFilters() {
    const query    = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const maxPrice = parseInt(priceFilter.value, 10);
    const sort     = sortFilter.value;

    let filtered = PRODUCTS.filter(p => {
      if (query && !p.name.toLowerCase().includes(query)) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (p.price > maxPrice) return false;
      return true;
    });

    switch (sort) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // keep original order
        break;
    }

    renderProducts(filtered);
  }

  function updatePriceLabel() {
    const val = parseInt(priceFilter.value, 10);
    priceLabel.textContent = `Under ${formatPrice(val)}`;
  }

  // ──────────────────────────────────────────────────────────
  //  4. PRODUCT MODAL
  // ──────────────────────────────────────────────────────────
  function openProductModal(id) {
    const p = findProduct(id);
    if (!p) return;

    currentProductId = id;
    currentQty       = 1;
    currentSize      = null;

    modalImage.src            = p.image;
    modalImage.alt            = p.name;
    modalName.textContent     = p.name;
    modalPrice.textContent    = formatPrice(p.price);
    modalDescription.textContent = p.description;
    modalRating.innerHTML     = starsHTML(p.rating);
    modalQty.textContent      = '1';

    // Stock
    if (p.stock === 0) {
      modalStock.innerHTML = '<span class="stock-label sold-out">Sold Out</span>';
      modalAddToCart.disabled = true;
      modalAddToCart.textContent = 'Sold Out';
    } else if (p.stock <= 3) {
      modalStock.innerHTML = `<span class="stock-label low">Only ${p.stock} left</span>`;
      modalAddToCart.disabled = false;
      modalAddToCart.textContent = 'Add to Cart';
    } else {
      modalStock.innerHTML = `<span class="stock-label ok">${p.stock} in stock</span>`;
      modalAddToCart.disabled = false;
      modalAddToCart.textContent = 'Add to Cart';
    }

    // Sizes
    if (p.sizes && p.sizes.length > 0) {
      modalSizesGroup.classList.remove('d-none');
      modalSizes.innerHTML = '';
      p.sizes.forEach((sz, i) => {
        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'btn btn-outline-light btn-sm size-btn';
        btn.textContent = sz;
        btn.dataset.size = sz;
        modalSizes.appendChild(btn);
      });
      currentSize = null; // user must pick
    } else {
      modalSizesGroup.classList.add('d-none');
      currentSize = 'ONE SIZE';
    }

    // Wishlist heart
    updateWishlistButton(id);

    productModal.show();
  }

  // ──────────────────────────────────────────────────────────
  //  5. CART LOGIC (localStorage)
  // ──────────────────────────────────────────────────────────
  function getCart() {
    try {
      const raw = localStorage.getItem('dropzone_cart');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* corrupted data */ }
    return [];
  }

  function saveCart(cart) {
    try {
      localStorage.setItem('dropzone_cart', JSON.stringify(cart));
    } catch (e) { /* storage full */ }
  }

  function addToCart(id, size, qty) {
    const product = findProduct(id);
    if (!product || product.stock <= 0) return;
    if (!size) {
      alert('Please select a size.');
      return;
    }

    qty = Math.min(qty, product.stock);
    if (qty <= 0) return;

    const cart = getCart();
    const existing = cart.find(item => item.id === id && item.size === size);

    if (existing) {
      const maxAdd = product.stock;
      const newQty = existing.qty + qty;
      existing.qty = Math.min(newQty, existing.qty + maxAdd);
      // Recalculate how many we actually added
      const actualAdded = existing.qty - (existing.qty - qty);
      product.stock = Math.max(0, product.stock - qty);
    } else {
      cart.push({ id, name: product.name, size, qty, price: product.price });
      product.stock = Math.max(0, product.stock - qty);
    }

    saveCart(cart);
    renderCart();
    applyFilters(); // re-render products to update stock labels
  }

  function removeFromCart(id, size) {
    let cart = getCart();
    const idx = cart.findIndex(item => item.id === id && item.size === size);
    if (idx === -1) return;

    const item    = cart[idx];
    const product = findProduct(id);
    if (product) product.stock += item.qty; // restore stock

    cart.splice(idx, 1);
    saveCart(cart);
    renderCart();
    applyFilters();
  }

  function changeQty(id, size, delta) {
    const cart    = getCart();
    const item    = cart.find(i => i.id === id && i.size === size);
    const product = findProduct(id);
    if (!item || !product) return;

    const newQty = item.qty + delta;

    if (newQty < 1) return; // minimum 1

    if (delta > 0) {
      // adding more — check stock
      if (product.stock <= 0) return;
      product.stock -= 1;
    } else {
      // removing — restore stock
      product.stock += 1;
    }

    item.qty = newQty;
    saveCart(cart);
    renderCart();
    applyFilters();
  }

  function getCartTotal() {
    const cart = getCart();
    let subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    let discount = subtotal * discountRate;
    return { subtotal, discount, total: subtotal - discount };
  }

  function renderCart() {
    const cart = getCart();

    // Badge
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountBadge.textContent = totalItems;
    cartCountBadge.classList.toggle('d-none', totalItems === 0);

    // Items
    if (cart.length === 0) {
      cartItemsEl.innerHTML = '<p class="text-secondary text-center mt-5">Your cart is empty.</p>';
    } else {
      let html = '';
      cart.forEach(item => {
        html += `
          <div class="cart-item d-flex align-items-center gap-2 mb-3 p-2 rounded-2" data-id="${item.id}" data-size="${item.size}">
            <div class="flex-grow-1">
              <div class="fw-semibold">${item.name}</div>
              <div class="small text-secondary">${item.size} · ${formatPrice(item.price)}</div>
            </div>
            <div class="d-flex align-items-center gap-1">
              <button class="btn btn-sm btn-outline-light cart-qty-minus" data-id="${item.id}" data-size="${item.size}">−</button>
              <span class="px-2 fw-bold">${item.qty}</span>
              <button class="btn btn-sm btn-outline-light cart-qty-plus" data-id="${item.id}" data-size="${item.size}">+</button>
            </div>
            <span class="fw-bold text-nowrap">${formatPrice(item.price * item.qty)}</span>
            <button class="btn btn-sm btn-outline-danger cart-remove" data-id="${item.id}" data-size="${item.size}">×</button>
          </div>
        `;
      });
      cartItemsEl.innerHTML = html;
    }

    // Total
    const { subtotal, discount, total } = getCartTotal();
    let totalHTML = formatPrice(total);
    if (discountRate > 0) {
      totalHTML = `<span class="text-decoration-line-through text-secondary me-2">${formatPrice(subtotal)}</span> ${formatPrice(total)}`;
    }
    cartTotalEl.innerHTML = totalHTML;

    // Checkout button state
    checkoutBtn.disabled = cart.length === 0;
  }

  // ──────────────────────────────────────────────────────────
  //  6. DISCOUNT CODE
  // ──────────────────────────────────────────────────────────
  function applyDiscountCode() {
    const code = discountCodeInput.value.trim().toUpperCase();
    if (DISCOUNT_CODES[code] !== undefined) {
      discountRate = DISCOUNT_CODES[code];
      appliedCode  = code;
      discountMsgEl.textContent = `✓ Code "${code}" applied — ${discountRate * 100}% off!`;
      discountMsgEl.className   = 'small mb-3 text-success';
    } else {
      discountRate = 0;
      appliedCode  = '';
      discountMsgEl.textContent = '✗ Invalid discount code.';
      discountMsgEl.className   = 'small mb-3 text-danger';
    }
    renderCart();
  }

  // ──────────────────────────────────────────────────────────
  //  7. WISHLIST (localStorage)
  // ──────────────────────────────────────────────────────────
  function getWishlist() {
    try {
      const raw = localStorage.getItem('dropzone_wishlist');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return [];
  }

  function saveWishlist(list) {
    try {
      localStorage.setItem('dropzone_wishlist', JSON.stringify(list));
    } catch (e) { /* ignore */ }
  }

  function toggleWishlist(id) {
    let list = getWishlist();
    const idx = list.indexOf(id);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(id);
    }
    saveWishlist(list);
    updateWishlistButton(id);
  }

  function updateWishlistButton(id) {
    const list = getWishlist();
    const isWished = list.includes(id);
    modalWishlist.textContent = isWished ? '♥' : '♡';
    modalWishlist.classList.toggle('wishlisted', isWished);
  }

  // ──────────────────────────────────────────────────────────
  //  8. CHECKOUT FORM
  // ──────────────────────────────────────────────────────────
  function handleCheckoutOpen() {
    const cart = getCart();
    const { subtotal, discount, total } = getCartTotal();

    let html = '<h6 class="fw-bold mb-2">Order Summary</h6>';
    cart.forEach(item => {
      html += `<div class="d-flex justify-content-between small mb-1">
        <span>${item.name} (${item.size}) × ${item.qty}</span>
        <span>${formatPrice(item.price * item.qty)}</span>
      </div>`;
    });
    if (discountRate > 0) {
      html += `<div class="d-flex justify-content-between small text-success mb-1">
        <span>Discount (${appliedCode})</span>
        <span>-${formatPrice(discount)}</span>
      </div>`;
    }
    html += `<div class="d-flex justify-content-between fw-bold mt-2 pt-2 border-top border-secondary">
      <span>Total</span>
      <span>${formatPrice(total)}</span>
    </div>`;
    checkoutSummary.innerHTML = html;
  }

  function handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = checkoutForm;

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    // Success
    try { localStorage.removeItem('dropzone_cart'); } catch (e) { /* ignore */ }

    // Restore all stock from cart items (since the order is "placed")
    // No need — stock was already deducted, order is confirmed

    discountRate = 0;
    appliedCode  = '';
    discountMsgEl.textContent = '';
    discountCodeInput.value   = '';

    orderSuccessEl.classList.remove('d-none');
    form.classList.remove('was-validated');
    form.reset();

    renderCart();
    applyFilters();

    // Close modal after 2s
    setTimeout(() => {
      const modal = bootstrap.Modal.getInstance($id('checkoutModal'));
      if (modal) modal.hide();
      orderSuccessEl.classList.add('d-none');
    }, 2500);
  }

  // ──────────────────────────────────────────────────────────
  //  9. EVENT DELEGATION & LISTENERS
  // ──────────────────────────────────────────────────────────
  function attachListeners() {
    // Filters
    searchInput.addEventListener('input', applyFilters);
    categoryFilter.addEventListener('input', applyFilters);
    priceFilter.addEventListener('input', () => { updatePriceLabel(); applyFilters(); });
    sortFilter.addEventListener('input', applyFilters);

    // Product grid — event delegation
    productGrid.addEventListener('click', (e) => {
      // Add to Cart button (quick add — first available size or ONE SIZE)
      const addBtn = e.target.closest('.add-to-cart-btn');
      if (addBtn) {
        e.stopPropagation();
        const id = parseInt(addBtn.dataset.id, 10);
        const product = findProduct(id);
        if (!product || product.stock === 0) return;
        const size = (product.sizes && product.sizes.length > 0) ? product.sizes[0] : 'ONE SIZE';
        addToCart(id, size, 1);
        return;
      }

      // Card click — open modal
      const card = e.target.closest('.product-card');
      if (card) {
        const id = parseInt(card.dataset.id, 10);
        openProductModal(id);
      }
    });

    // Modal — size selector (event delegation)
    modalSizes.addEventListener('click', (e) => {
      const btn = e.target.closest('.size-btn');
      if (!btn) return;
      modalSizes.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = btn.dataset.size;
    });

    // Modal — quantity
    modalQtyMinus.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        modalQty.textContent = currentQty;
      }
    });

    modalQtyPlus.addEventListener('click', () => {
      const p = findProduct(currentProductId);
      if (p && currentQty < p.stock) {
        currentQty++;
        modalQty.textContent = currentQty;
      }
    });

    // Modal — Add to Cart
    modalAddToCart.addEventListener('click', () => {
      if (!currentProductId) return;
      addToCart(currentProductId, currentSize, currentQty);
      productModal.hide();
    });

    // Modal — Wishlist
    modalWishlist.addEventListener('click', () => {
      if (currentProductId) toggleWishlist(currentProductId);
    });

    // Cart offcanvas — event delegation
    cartItemsEl.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      const id   = parseInt(target.dataset.id, 10);
      const size = target.dataset.size;

      if (target.classList.contains('cart-qty-minus')) {
        changeQty(id, size, -1);
      } else if (target.classList.contains('cart-qty-plus')) {
        changeQty(id, size, 1);
      } else if (target.classList.contains('cart-remove')) {
        removeFromCart(id, size);
      }
    });

    // Discount
    applyDiscountBtn.addEventListener('click', applyDiscountCode);
    discountCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyDiscountCode(); }
    });

    // Checkout modal open — populate summary
    $id('checkoutModal').addEventListener('show.bs.modal', handleCheckoutOpen);

    // Checkout form submit
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }

  // ──────────────────────────────────────────────────────────
  //  INIT ON PAGE LOAD
  // ──────────────────────────────────────────────────────────
  function init() {
    // Sync stock from localStorage cart
    const cart = getCart();
    cart.forEach(item => {
      const product = findProduct(item.id);
      if (product) {
        product.stock = Math.max(0, product.stock - item.qty);
      }
    });

    applyFilters();      // renders products with correct stock
    renderCart();
    startCountdown();
    attachListeners();
    updatePriceLabel();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
