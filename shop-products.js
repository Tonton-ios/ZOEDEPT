const ZOE_SHOP_CATEGORIES = [
    { slug: 'fek-paret', label: 'Fèk Parèt', href: 'fek-paret.html' },
    { slug: 'mayo', label: 'Mayo', href: 'mayo.html' },
    { slug: 'bout-pantalon', label: 'Bout Pantalon', href: 'bout-pantalon.html' },
    { slug: 'pantalon', label: 'Pantalon Long', href: 'pantalon.html' },
    { slug: 'manch-long', label: 'Manch Long', href: 'manch-long.html' },
    { slug: 'bout-manch', label: 'Bout Manch', href: 'bout-manch.html' },
    { slug: 'kepi', label: 'Kepi', href: 'kepi.html' },
    { slug: 'gason', label: 'Gason', href: 'gason.html' },
    { slug: 'fanm', label: 'Fanm', href: 'fanm.html' },
    { slug: 'nou-2-ka-mete', label: 'Nou 2 Ka Mete', href: 'nou-2-ka-mete.html' },
    { slug: 'tablo', label: 'Tablo', href: 'tablo.html' },
    { slug: 'valiz', label: 'Valiz', href: 'valiz.html' },
    { slug: 'galri', label: 'Galri', href: 'galri.html' },
    { slug: 'zoe-dept', label: 'ZOE DEPT.', href: 'zoe-dept.html' },
    { slug: 'sak-pase', label: 'SAK PASE? AYITI', href: 'sak-pase.html' },
    { slug: 'bese-triye', label: 'BESE TRIYE', href: 'bese-triye.html' },
    { slug: 'pv-dept', label: 'PV DEPT', href: 'pv-dept.html' }
];

let allShopProducts = [];
let currentProductMap = new Map();
const USD_RATE = 132;
const WHATSAPP_BUSINESS_NUMBER = '50932045691'; // Nimewo WhatsApp ekip ZOE DEPT.

function zoeEscape(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function productCategories(product) {
    const description = product.description || '';
    const slugLine = description.match(/Kategori Slug:\s*([^\n]+)/i);
    const parsedCategories = slugLine ? slugLine[1].split(',').map(item => item.trim()).filter(Boolean) : [];
    const categories = Array.isArray(product.categories) ? product.categories : [];
    const category = product.category ? [product.category] : [];
    return [...new Set([...categories, ...category, ...parsedCategories])];
}

function productBelongsTo(product, category) {
    if (category === 'tout-net') return true;
    if (category === 'fek-paret' && product.is_latest) return true;
    return productCategories(product).includes(category);
}

function isGalleryItem(product) {
    return productCategories(product).includes('galri');
}

function isOutOfStock(product) {
    return product.stock_quantity !== null && typeof product.stock_quantity === 'number' && product.stock_quantity <= 0;
}

function productMetaValue(product, label) {
    const description = product.description || '';
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = description.match(new RegExp(`${escaped}:\\s*([^\\n]+)`, 'i'));
    return match ? match[1].trim() : '';
}

function isPreorder(product) {
    return Boolean(product.is_preorder) || productMetaValue(product, 'Pre Komand') === 'true';
}

function preorderReadyText(product) {
    const readyAt = product.preorder_ready_at || productMetaValue(product, 'Drop Pare');
    if (!readyAt) return 'Nou ap kontakte ou lè drop la pare.';

    const date = new Date(`${readyAt}T00:00:00`);
    if (Number.isNaN(date.getTime())) return readyAt;

    return `Drop la prevwa pare ${date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}.`;
}

function preorderNote(product) {
    return product.preorder_note || productMetaValue(product, 'Mesaj Pre Komand') || 'Pre komand sa rezève plas ou avan drop la pare.';
}

function formatHTG(value) {
    if (!value) return '';
    return `${Number(value).toLocaleString('fr-FR')} HTG`;
}

function formatUSD(value) {
    if (!value) return '';
    return `$${Number(value).toLocaleString('en-US')}`;
}

function htgToUsd(value) {
    return formatUSD(Number(value || 0) / USD_RATE);
}

function cleanDescription(product) {
    return (product.description || 'Nouvo pyès ZOE DEPT. disponib kounye a.')
        .split('--- Detay Atelye ---')[0]
        .trim();
}

function productVariants(product) {
    if (Array.isArray(product.color_variants) && product.color_variants.length) {
        return product.color_variants
            .filter(variant => variant && variant.color)
            .map(variant => ({
                color: variant.color,
                image: variant.image_url || product.image_url
            }));
    }

    // Support pour la nouvelle colonne 'colors' (TEXT[])
    if (Array.isArray(product.colors) && product.colors.length) {
        return product.colors.map(color => ({
            color: String(color),
            image: product.image_url
        }));
    }

    const description = product.description || '';
    const imageLine = description.match(/Koulè Imaj:\s*([^\n]+)/i);
    if (imageLine) {
        const parsedVariants = imageLine[1].split('|')
            .map(item => item.trim())
            .map(item => {
                const [color, image] = item.split('=').map(part => part.trim());
                return color ? { color, image: image || product.image_url } : null;
            })
            .filter(Boolean);
        if (parsedVariants.length) return parsedVariants;
    }
    return [];
}

function productSizes(product) {
    if (Array.isArray(product.sizes)) return product.sizes.filter(Boolean);
    if (typeof product.sizes === 'string') {
        return product.sizes.split(',').map(size => size.trim()).filter(Boolean);
    }
    return [];
}

function normalizeSearchValue(value = '') {
    return String(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function productSearchText(product) {
    return normalizeSearchValue([
        product.name,
        product.collection,
        product.sku,
        product.product_type,
        product.gender,
        cleanDescription(product),
        productCategories(product).join(' '),
        productSizes(product).join(' '),
        productVariants(product).map(variant => variant.color).join(' '),
        Array.isArray(product.tags) ? product.tags.join(' ') : product.tags
    ].filter(Boolean).join(' '));
}

function productCard(product) {
    const isGallery = isGalleryItem(product);
    
    if (isGallery) {
        return `
            <article class="product-card gallery-session-card">
                <button class="product-image product-image-button product-detail-trigger" type="button" data-product-id="${zoeEscape(product.id)}" style="background-image: url('${zoeEscape(product.image_url)}')" aria-label="Wè sesyon ${zoeEscape(product.name)}"></button>
                <div class="product-info gallery-info">
                    <p class="product-kicker" style="text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.7rem; opacity: 0.6; margin-bottom: 0.5rem;">SESYON FOTO / LOOKBOOK</p>
                    <h3 style="font-family: serif; font-size: 1.4rem;">${zoeEscape(product.name)}</h3>
                    <div class="product-bottom" style="margin-top: 1.5rem;">
                        <button class="btn light btn-full product-detail-trigger" type="button" data-product-id="${zoeEscape(product.id)}">GADE GALRI A</button>
                    </div>
                </div>
            </article>
        `;
    }

    const variants = productVariants(product);
    const sizes = productSizes(product);
    const priceHTG = formatHTG(product.price_htg);
    const priceUSD = formatUSD(product.price_usd);
    const outOfStock = isOutOfStock(product);
    const category = ZOE_SHOP_CATEGORIES.find(item => productBelongsTo(product, item.slug));
    const preorder = isPreorder(product);
    const swatches = variants.map((variant, index) => `
        <button
            class="color-swatch ${index === 0 ? 'active' : ''}"
            type="button"
            data-image="${zoeEscape(variant.image)}"
            aria-label="Wè koulè ${zoeEscape(variant.color)}"
            title="${zoeEscape(variant.color)}">
            <span>${zoeEscape(variant.color)}</span>
        </button>
    `).join('');
    const sizeButtons = sizes.map((size, index) => `
        <button
            class="size-choice ${index === 0 ? 'active' : ''}"
            type="button"
            data-size="${zoeEscape(size)}"
            aria-label="Chwazi size ${zoeEscape(size)}">
            ${zoeEscape(size)}
        </button>
    `).join('');

    return `
        <article class="product-card dynamic-product-card">
            <button class="product-image product-image-button product-detail-trigger" type="button" data-product-id="${zoeEscape(product.id)}" style="background-image: url('${zoeEscape(product.image_url)}')" aria-label="${zoeEscape(product.name)}"></button>
            <div class="product-info">
                <p class="product-kicker" style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem; opacity: 0.7; margin-bottom: 0.5rem;">${zoeEscape(product.collection || category?.label || 'ZOE DEPT.')}</p>
                <h3>${zoeEscape(product.name)}</h3>
                ${swatches ? `<div class="color-swatch-row">${swatches}</div>` : ''}
                ${sizeButtons ? `<div class="size-choice-row">${sizeButtons}</div>` : ''}
                <div class="product-bottom">
                    <div class="price-toggle">
                        <span class="price-label" style="font-family: serif; font-size: 1.1rem;">
                            <strong data-price-mode="htg">${priceHTG || priceUSD}</strong>
                        </span>
                        ${priceUSD && priceHTG ? `<button class="currency-toggle" type="button" data-htg="${zoeEscape(priceHTG)}" data-usd="${zoeEscape(priceUSD)}" aria-label="Wè pri an dola">⌄</button>` : ''}
                    </div>
                    <button
                        class="btn ${(preorder || outOfStock) ? 'dark preorder-trigger' : 'dark'} product-cta"
                        type="button"
                        data-product-id="${zoeEscape(product.id)}">
                        REZEVE
                    </button>
                </div>
                ${preorder ? `<p class="preorder-card-note">${zoeEscape(preorderReadyText(product))}</p>` : ''}
                ${outOfStock ? `<p class="out-of-stock-note" style="color: #cc0000; font-size: 0.75rem; margin-top: 0.5rem; font-weight: bold;">⚠️ Pa gen an stock kounye a</p>` : ''}
            </div>
        </article>
    `;
}

async function fetchShopProducts() {
    if (!window.supabaseHelpers?.supabase) return [];

    const { data, error } = await window.supabaseHelpers.supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erè chajman pwodwi:', error);
        return [];
    }

    return data || [];
}

function wireColorSwatches(root = document) {
    root.querySelectorAll('.color-swatch').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.product-card');
            const image = card?.querySelector('.product-image');
            const nextImage = button.dataset.image;
            if (!image || !nextImage) return;

            image.style.backgroundImage = `url('${nextImage}')`;
            card.querySelectorAll('.color-swatch').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

function wireSizeChoices(root = document) {
    root.querySelectorAll('.size-choice').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.product-card');
            card.querySelectorAll('.size-choice').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

function wireCurrencyToggles(root = document) {
    root.querySelectorAll('.currency-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const price = button.parentElement.querySelector('strong');
            const mode = price.dataset.priceMode === 'usd' ? 'htg' : 'usd';
            price.dataset.priceMode = mode;
            price.textContent = mode === 'usd' ? button.dataset.usd : button.dataset.htg;
            button.setAttribute('aria-label', mode === 'usd' ? 'Wè pri an goud' : 'Wè pri an dola');
        });
    });
}

function ensureProductModal() {
    if (document.getElementById('productModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="product-modal" id="productModal" aria-hidden="true">
            <div class="product-dialog" role="dialog" aria-modal="true" aria-labelledby="productModalTitle">
                <button class="product-modal-close" type="button" aria-label="Fèmen">×</button>
                <div class="product-detail-media">
                    <figure>
                        <img id="productModalFront" alt="Devan pwodwi a">
                        <figcaption>Devan</figcaption>
                    </figure>
                    <figure>
                        <img id="productModalBack" alt="Dèyè pwodwi a">
                        <figcaption>Dèyè</figcaption>
                    </figure>
                </div>
                <div class="product-detail-copy">
                    <p class="eyebrow" id="productModalKicker" style="text-transform: uppercase; letter-spacing: 0.2em;"></p>
                    <h2 id="productModalTitle" style="font-family: serif; font-size: 2rem; margin-bottom: 1rem;"></h2>
                    <p id="productModalDescription" style="line-height: 1.6; opacity: 0.8; margin-bottom: 2rem;"></p>
                    <div id="productModalMeta" class="product-modal-meta"></div>
                    <button class="btn dark btn-full" type="button" id="productModalCta" style="letter-spacing: 0.1em;">REZEVE</button>
                </div>
                <section class="related-products-section">
                    <div class="category-section-head">
                        <div>
                            <p class="eyebrow">SELEKSYON</p>
                            <h2 style="font-family: serif;">Lòt pyès ki ka enterese ou</h2>
                        </div>
                    </div>
                    <div class="related-products-grid" id="relatedProductsGrid"></div>
                </section>
            </div>
        </div>
    `);

    document.querySelector('#productModal .product-modal-close').addEventListener('click', closeProductModal);
    document.getElementById('productModal').addEventListener('click', event => {
        if (event.target.id === 'productModal') closeProductModal();
    });
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function openProductModal(product) {
    ensureProductModal();
    const isGallery = isGalleryItem(product);
    const outOfStock = isOutOfStock(product);
    const preorder = isPreorder(product);
    window.currentModalProduct = product;
    
    if (isGallery) {
        document.getElementById('productModalKicker').textContent = 'GALRI / SESYON';
        document.getElementById('productModalTitle').textContent = product.name;
        document.getElementById('productModalDescription').textContent = cleanDescription(product);
        document.getElementById('productModalFront').src = product.image_url;
        document.getElementById('productModalBack').src = product.back_image_url || product.image_url;
        document.getElementById('productModalMeta').innerHTML = `
            <div class="gallery-context" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee;">
                <p style="font-style: italic; opacity: 0.7;">Sesyon Atistik ZOE DEPT. Tout dwa rezève.</p>
            </div>
        `;
        const modalCta = document.getElementById('productModalCta');
        modalCta.style.display = 'none'; // Pas de bouton d'achat pour la galerie
        renderRelatedProducts(product);
        document.getElementById('productModal').classList.add('active');
        return;
    }

    document.getElementById('productModalCta').style.display = 'block';
    const variants = productVariants(product);
    const sizes = productSizes(product);
    window.currentModalSelection = {
        color: variants[0]?.color || '',
        image: variants[0]?.image || product.image_url || '',
        size: sizes[0] || ''
    };
    document.getElementById('productModalKicker').textContent = product.collection || 'ZOE DEPT.';
    document.getElementById('productModalTitle').textContent = product.name;
    document.getElementById('productModalDescription').textContent = cleanDescription(product);
    document.getElementById('productModalFront').src = window.currentModalSelection.image;
    document.getElementById('productModalBack').src = product.back_image_url || product.image_url || '';

    const colorButtons = variants.map((variant, index) => `
        <button
            class="modal-color-choice ${index === 0 ? 'active' : ''}"
            type="button"
            data-color="${zoeEscape(variant.color)}"
            data-image="${zoeEscape(variant.image)}">
            ${zoeEscape(variant.color)}
        </button>
    `).join('');
    const sizeButtons = sizes.map((size, index) => `
        <button
            class="modal-size-choice ${index === 0 ? 'active' : ''}"
            type="button"
            data-size="${zoeEscape(size)}">
            ${zoeEscape(size)}
        </button>
    `).join('');

    document.getElementById('productModalMeta').innerHTML = `
        <div class="modal-price-tag" style="font-size: 1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 1rem;">${zoeEscape(formatHTG(product.price_htg) || formatUSD(product.price_usd) || '-')}</div>
        ${sizeButtons ? `<div class="modal-option-group"><label style="text-transform: uppercase; font-size: 0.7rem; font-weight: bold;">Chwazi Size</label><div class="modal-option-row">${sizeButtons}</div></div>` : ''}
        ${colorButtons ? `<div class="modal-option-group"><label style="text-transform: uppercase; font-size: 0.7rem; font-weight: bold;">Chwazi Koulè</label><div class="modal-option-row">${colorButtons}</div></div>` : ''}
        ${outOfStock ? `<p style="color: #cc0000; font-weight: bold; margin-bottom: 1rem;">⚠️ PA GEN AN STOCK KOUNYE A</p>` : ''}
        <div class="product-details-luxury" style="margin: 2rem 0; font-size: 0.9rem;">
            ${product.material ? `<p style="margin-bottom: 0.5rem;"><span style="opacity: 0.5;">Materyèl:</span> ${zoeEscape(product.material)}</p>` : ''}
            ${product.fit ? `<p style="margin-bottom: 0.5rem;"><span style="opacity: 0.5;">Koupe:</span> ${zoeEscape(product.fit)}</p>` : ''}
            <p style="margin-bottom: 0.5rem;"><span style="opacity: 0.5;">Estati:</span> ${preorder ? 'Eksklizivite (Pre Komand)' : 'Disponib kounye a'}</p>
        </div>
    `;
    document.querySelectorAll('.modal-color-choice').forEach(button => {
        button.addEventListener('click', () => {
            window.currentModalSelection.color = button.dataset.color || '';
            window.currentModalSelection.image = button.dataset.image || product.image_url || '';
            document.getElementById('productModalFront').src = window.currentModalSelection.image;
            document.querySelectorAll('.modal-color-choice').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
        });
    });
    document.querySelectorAll('.modal-size-choice').forEach(button => {
        button.addEventListener('click', () => {
            window.currentModalSelection.size = button.dataset.size || '';
            document.querySelectorAll('.modal-size-choice').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
        });
    });
    const modalCta = document.getElementById('productModalCta');
    modalCta.textContent = (preorder || outOfStock) ? 'REZEVE PLAS OU' : 'REZEVE KOUNYE A';
    modalCta.onclick = () => {
        const detailSize = window.currentModalSelection?.size || productSizes(product)[0] || '';
        const detailColor = window.currentModalSelection?.color || productVariants(product)[0]?.color || '';
        if (preorder || outOfStock) {
            window.currentPreorderSize = detailSize;
            window.currentPreorderColor = detailColor;
            openPreorderModal(product);
        } else {
            openBuyDrawer(product, detailSize, detailColor);
        }
    };

    renderRelatedProducts(product);

    document.getElementById('productModal').classList.add('active');
    document.getElementById('productModal').setAttribute('aria-hidden', 'false');
}

function renderRelatedProducts(product) {
    const grid = document.getElementById('relatedProductsGrid');
    if (!grid) return;

    const related = allShopProducts
        .filter(item => item.id !== product.id)
        .slice(0, 4);

    grid.innerHTML = related.map(item => `
        <button class="related-product-mini" type="button" data-product-id="${zoeEscape(item.id)}">
            <span style="background-image:url('${zoeEscape(item.image_url)}')"></span>
            <strong>${zoeEscape(item.name)}</strong>
            <small>${zoeEscape(formatHTG(item.price_htg) || formatUSD(item.price_usd) || '')}</small>
        </button>
    `).join('');

    grid.querySelectorAll('.related-product-mini').forEach(button => {
        button.addEventListener('click', () => {
            const next = currentProductMap.get(String(button.dataset.productId));
            if (next) openProductModal(next);
        });
    });
}

function ensureBuyDrawer() {
    if (document.getElementById('buyDrawer')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <aside class="buy-drawer" id="buyDrawer" aria-hidden="true">
            <div class="buy-drawer-head">
                <h2 style="font-family: serif; text-transform: uppercase; font-size: 1.2rem;">Sa ou chwazi</h2>
                <button class="drawer-close" type="button" aria-label="Fèmen">×</button>
            </div>
            <div id="buyDrawerBody"></div>
            <div class="buy-drawer-total" style="border-top: 1px solid #000; padding-top: 1.5rem;">
                <span style="text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.1em;">Sou-total HTG</span>
                <strong id="buyDrawerTotal">0 GDS</strong>
            </div>
            <button class="btn dark btn-full" type="button" id="openCheckoutBtn">Peye kounya</button>
        </aside>
    `);

    document.querySelector('#buyDrawer .drawer-close').addEventListener('click', closeBuyDrawer);
    document.getElementById('openCheckoutBtn').addEventListener('click', openCheckout);
}

function selectedCardOptions(card, product) {
    return {
        size: card?.querySelector('.size-choice.active')?.dataset.size || productSizes(product)[0] || '',
        color: card?.querySelector('.color-swatch.active span')?.textContent || productVariants(product)[0]?.color || ''
    };
}

function openBuyDrawer(product, size = '', color = '') {
    ensureBuyDrawer();
    activeBuyItem = {
        product,
        size: size || productSizes(product)[0] || '',
        color: color || productVariants(product)[0]?.color || '',
        quantity: 1
    };
    renderBuyDrawer();
    document.getElementById('buyDrawer').classList.add('active');
    document.getElementById('buyDrawer').setAttribute('aria-hidden', 'false');
}

function closeBuyDrawer() {
    document.getElementById('buyDrawer')?.classList.remove('active');
    document.getElementById('buyDrawer')?.setAttribute('aria-hidden', 'true');
}

function renderBuyDrawer() {
    const cart = getCart();
    const body = document.getElementById('buyDrawerBody');
    if (!body) return;

    if (cart.length === 0) {
        body.innerHTML = '<p style="text-align:center; padding: 2rem; opacity: 0.5;">Panye ou vid.</p>';
        document.getElementById('buyDrawerTotal').textContent = '0 GDS';
        return;
    }

    body.innerHTML = cart.map((item, index) => `
        <div class="drawer-product-wrapper" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #eee;">
            <div class="drawer-product" style="display: flex; gap: 1rem; align-items: flex-start;">
                <img src="${zoeEscape(item.image_url)}" alt="${zoeEscape(item.name)}" style="width: 70px; height: 90px; object-fit: cover; border-radius: 4px;">
                <div style="flex: 1;">
                    <h3 style="font-family: serif; font-size: 1rem; margin: 0 0 0.25rem;">${zoeEscape(item.name)}</h3>
                    <p style="font-weight: bold; margin: 0 0 0.5rem;">${zoeEscape(formatHTG(item.price_htg))}</p>
                    <small style="display: block; opacity: 0.6; margin-bottom: 0.5rem;">Size: ${zoeEscape(item.size)} | Koulè: ${zoeEscape(item.color)}</small>
                    <div class="qty-stepper" style="margin-top: 0; width: 100px; grid-template-columns: 30px 1fr 30px; height: 30px;">
                        <button type="button" onclick="updateItemQuantity(${index}, -1)" style="min-height: 30px;">−</button>
                        <span style="font-size: 0.8rem;">${item.quantity}</span>
                        <button type="button" onclick="updateItemQuantity(${index}, 1)" style="min-height: 30px;">+</button>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; cursor:pointer; font-size: 1.2rem; opacity: 0.3;">&times;</button>
            </div>
        </div>
    `).join('');

    const total = orderSubtotalHTG();
    document.getElementById('buyDrawerTotal').textContent = formatHTG(total);
}

function ensurePreorderModal() {
    if (document.getElementById('preorderModal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div class="preorder-modal" id="preorderModal" aria-hidden="true">
            <div class="preorder-dialog" role="dialog" aria-modal="true" aria-labelledby="preorderTitle">
                <button class="preorder-close" type="button" aria-label="Fèmen">×</button>
                <div class="preorder-step preorder-step-intro active" data-step="intro">
                    <p class="eyebrow">Pre Komand</p>
                    <h2 id="preorderTitle">Rezève drop sa</h2>
                    <p id="preorderMessage"></p>
                    <p id="preorderReady"></p>
                    <button class="btn dark btn-full" type="button" id="preorderAccept">Mwen aksepte</button>
                </div>
                <form class="preorder-step preorder-step-form" id="preorderLeadForm" data-step="form">
                    <p class="eyebrow">Enfòmasyon ou</p>
                    <h2>Kontakte pou pre komand</h2>
                    <div class="form-group">
                        <label for="preorderEmail">Imèl</label>
                        <input type="email" id="preorderEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="preorderPhone">Nimewo telefòn</label>
                        <input type="tel" id="preorderPhone" required>
                    </div>
                    <div class="form-group">
                        <label for="preorderAddress">Adrès</label>
                        <textarea id="preorderAddress" rows="3" required></textarea>
                    </div>
                    <button class="btn dark btn-full" type="submit">Kontinye kreye kont</button>
                </form>
            </div>
        </div>
    `);

    document.querySelector('.preorder-close').addEventListener('click', closePreorderModal);
    document.getElementById('preorderAccept').addEventListener('click', () => setPreorderStep('form'));
    document.getElementById('preorderModal').addEventListener('click', event => {
        if (event.target.id === 'preorderModal') closePreorderModal();
    });
    document.getElementById('preorderLeadForm').addEventListener('submit', submitPreorderLead);
}

function setPreorderStep(step) {
    document.querySelectorAll('.preorder-step').forEach(item => {
        item.classList.toggle('active', item.dataset.step === step);
    });
}

function closePreorderModal() {
    const modal = document.getElementById('preorderModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function openPreorderModal(product) {
    ensurePreorderModal();
    window.currentPreorderProduct = product;
    document.getElementById('preorderTitle').textContent = product.name;
    document.getElementById('preorderMessage').textContent = preorderNote(product);
    document.getElementById('preorderReady').textContent = [
        preorderReadyText(product),
        window.currentPreorderSize ? `Size chwazi: ${window.currentPreorderSize}.` : '',
        window.currentPreorderColor ? `Koulè chwazi: ${window.currentPreorderColor}.` : ''
    ].filter(Boolean).join(' ');
    const savedLead = JSON.parse(localStorage.getItem('zoePreorderLead') || '{}');
    document.getElementById('preorderEmail').value = savedLead.customer_email || '';
    document.getElementById('preorderPhone').value = savedLead.customer_phone || '';
    document.getElementById('preorderAddress').value = savedLead.customer_address || '';
    setPreorderStep('intro');
    document.getElementById('preorderModal').classList.add('active');
    document.getElementById('preorderModal').setAttribute('aria-hidden', 'false');
}

async function submitPreorderLead(event) {
    event.preventDefault();
    const product = window.currentPreorderProduct;
    if (!product) return;

    const lead = {
        product_id: product.id,
        product_name: product.name,
        product_image_url: product.image_url,
        selected_size: window.currentPreorderSize || '',
        selected_color: window.currentPreorderColor || '',
        customer_email: document.getElementById('preorderEmail').value.trim(),
        customer_phone: document.getElementById('preorderPhone').value.trim(),
        customer_address: document.getElementById('preorderAddress').value.trim(),
        price_usd: product.price_usd || null,
        status: 'preorder',
        preorder_ready_at: product.preorder_ready_at || productMetaValue(product, 'Drop Pare') || null
    };

    localStorage.setItem('zoePreorderLead', JSON.stringify(lead));

    if (window.supabaseHelpers?.supabase) {
        const { error } = await window.supabaseHelpers.supabase.from('preorders').insert([lead]);
        if (error) console.warn('Preorder not saved in Supabase yet:', error.message);
    }

    window.location.href = `signup.html?preorder=1&email=${encodeURIComponent(lead.customer_email)}`;
}

function ensureCheckout() {
    if (document.getElementById('checkoutOverlay')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <section class="checkout-overlay" id="checkoutOverlay" aria-hidden="true">
            <div class="checkout-layout">
                <form class="checkout-form" id="checkoutForm" style="padding: 3rem;">
                    <button class="checkout-close" type="button" aria-label="Fèmen">×</button>
                    <h2 style="font-family: serif; font-size: 2.5rem; margin-bottom: 2rem;">Finalize Kòmand la</h2>
                    <div class="checkout-block">
                        <h3 style="text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.1em; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Enfòmasyon pou Kontakte ou</h3>
                        <div class="form-group">
                            <label for="checkoutEmail">Imèl</label>
                            <input type="email" id="checkoutEmail" required placeholder="example@domain.com">
                        </div>
                    </div>
                    <div class="checkout-block">
                        <h3>Livrezon</h3>
                        <div class="form-group">
                            <label for="checkoutCountry">Peyi</label>
                            <select id="checkoutCountry">
                                <option>Haiti</option>
                                <option>RD</option>
                                <option>Canada</option>
                                <option>France</option>
                                <option>USA</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="checkoutLastName">Non</label>
                                <input type="text" id="checkoutLastName" required>
                            </div>
                            <div class="form-group">
                                <label for="checkoutFirstName">Prenon</label>
                                <input type="text" id="checkoutFirstName" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="checkoutAddress">Adrès</label>
                            <textarea id="checkoutAddress" rows="3" required></textarea>
                        </div>
                        <label class="delivery-check">
                            <input type="checkbox" id="localDelivery">
                            <span style="font-size: 0.85rem; opacity: 0.7;">Livrezon Premium PV / Delmas (700 HTG)</span>
                        </label>
                        <div class="form-group">
                            <label for="checkoutPhone">Nimewo telefòn</label>
                            <input type="tel" id="checkoutPhone" required>
                        </div>
                    </div>
                    <div class="checkout-block" style="background: #f9f9f9; padding: 1.5rem; border-radius: 4px;">
                        <h3 style="font-size: 0.9rem;">Sèvis Konsyèj</h3>
                        <p style="font-size: 0.8rem; line-height: 1.5;">Lè ou fin valide, kòmand ou an ap voye bay ekip nou an sou WhatsApp pou nou finalize peman ak livrezon an ansanm.</p>
                    </div>
                    <button class="btn dark btn-full" type="submit" style="height: 4rem; font-size: 1rem; letter-spacing: 0.2em;">KONFIME KÒMAND MWEN</button>
                </form>
                <aside class="checkout-summary" style="background: #fff; border-left: 1px solid #eee;">
                    <div id="checkoutProductSummary"></div>
                    <div class="promo-row">
                        <input type="text" id="promoInput" placeholder="Kòd promo">
                        <button class="btn light" type="button" id="applyPromoBtn">Aplike kounya</button>
                    </div>
                    <div class="summary-lines" style="border-top: 1px solid #eee; padding-top: 2rem;">
                        <p><span>Subtotal</span><strong id="summarySubtotal">0 GDS</strong></p>
                        <p><span>Livrezon</span><strong id="summaryShipping">0 GDS</strong></p>
                        <p style="font-size: 1.25rem; margin-top: 1rem;"><span>TOTAL</span><strong id="summaryTotal">0 GDS</strong></p>
                        <small id="summaryUsd" style="opacity: 0.5;">Valè an USD: $0</small>
                    </div>
                </aside>
            </div>
        </section>
    `);

    document.querySelector('.checkout-close').addEventListener('click', closeCheckout);
    document.getElementById('localDelivery').addEventListener('change', renderCheckoutSummary);
    document.getElementById('applyPromoBtn').addEventListener('click', applyPromoCode);
    document.getElementById('checkoutForm').addEventListener('submit', submitOrder);
}

function closeCheckout() {
    document.getElementById('checkoutOverlay')?.classList.remove('active');
    document.getElementById('checkoutOverlay')?.setAttribute('aria-hidden', 'true');
}

function openCheckout() {
    if (getCart().length === 0) return;
    ensureCheckout();
    closeBuyDrawer();
    window.appliedPromo = null;
    renderCheckoutSummary();
    document.getElementById('checkoutOverlay').classList.add('active');
    document.getElementById('checkoutOverlay').setAttribute('aria-hidden', 'false');
}

function checkoutShippingHTG() {
    return document.getElementById('localDelivery')?.checked ? 700 : 0;
}

function checkoutDiscountHTG() {
    const subtotal = orderSubtotalHTG();
    return window.appliedPromo ? Math.round(subtotal * Number(window.appliedPromo.discount_percent || 0) / 100) : 0;
}

function checkoutTotalHTG() {
    return Math.max(0, orderSubtotalHTG() - checkoutDiscountHTG() + checkoutShippingHTG());
}

function renderCheckoutSummary() {
    if (!activeBuyItem) return;
    const { product, size, color, quantity } = activeBuyItem;
    document.getElementById('checkoutProductSummary').innerHTML = `
        <div class="drawer-product">
            <img src="${zoeEscape(product.image_url)}" alt="${zoeEscape(product.name)}">
            <div>
                <h3>${zoeEscape(product.name)}</h3>
                <p>${zoeEscape(formatHTG(product.price_htg))} x ${quantity}</p>
                <small>Size: ${zoeEscape(size || '-')} | Koulè: ${zoeEscape(color || '-')}</small>
            </div>
        </div>
        ${window.appliedPromo ? `<p class="discount-note">Rabè ${zoeEscape(window.appliedPromo.code)}: -${formatHTG(checkoutDiscountHTG())}</p>` : ''}
    `;
    document.getElementById('summarySubtotal').textContent = formatHTG(orderSubtotalHTG());
    document.getElementById('summaryShipping').textContent = formatHTG(checkoutShippingHTG());
    document.getElementById('summaryTotal').textContent = formatHTG(checkoutTotalHTG());
    document.getElementById('summaryUsd').textContent = `USD: ${htgToUsd(checkoutTotalHTG())}`;
}

async function applyPromoCode() {
    const code = document.getElementById('promoInput').value.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await window.supabaseHelpers.supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

    if (error || !data || (data.usage_limit && Number(data.used_count || 0) >= Number(data.usage_limit))) {
        alert('Kòd promo sa pa disponib.');
        return;
    }

    window.appliedPromo = data;
    renderCheckoutSummary();
}

async function submitOrder(event) {
    event.preventDefault();
    const cart = getCart();
    if (cart.length === 0) return;

    const items = cart.map(item => ({
        product_id: item.id,
        name: item.name,
        image_url: item.image_url,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_htg: Number(item.price_htg || 0),
        unit_usd: Number(item.price_usd || 0)
    }));

    const payload = {
        user_id: null,
        customer_email: document.getElementById('checkoutEmail').value.trim(),
        customer_phone: document.getElementById('checkoutPhone').value.trim(),
        customer_first_name: document.getElementById('checkoutFirstName').value.trim(),
        customer_last_name: document.getElementById('checkoutLastName').value.trim(),
        customer_address: document.getElementById('checkoutAddress').value.trim(),
        customer_country: document.getElementById('checkoutCountry').value,
        payment_method: 'WhatsApp',
        items: items,
        subtotal_htg: orderSubtotalHTG(),
        shipping_htg: checkoutShippingHTG(),
        discount_htg: checkoutDiscountHTG(),
        total_htg: checkoutTotalHTG(),
        status: 'pending',
        promo_code: window.appliedPromo?.code || null
    };

    const payButton = event.submitter || document.querySelector('#checkoutForm button[type="submit"]');
    if (payButton) {
        payButton.disabled = true;
        payButton.textContent = 'Ap prepare invoice WhatsApp...';
    }

    const finalAmount = Math.round(Number(payload.total_htg || 0));
    if (isNaN(finalAmount) || finalAmount <= 0) {
        alert('Erè: Montan an pa valab.');
        if (payButton) { payButton.disabled = false; payButton.textContent = 'Peye kounya'; }
        return;
    }

    try {
        // 1. Enregistre commande dans Supabase
        const { data: createdOrder, error: orderError } = await window.supabaseHelpers.supabase
            .from('orders')
            .insert([payload])
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Dekremente stock la si nesesè
        for (const item of cart) {
            if (item.stock_quantity !== undefined && item.stock_quantity !== null) {
                await window.supabaseHelpers.supabase
                    .from('products')
                    .update({ stock_quantity: Math.max(0, item.stock_quantity - item.quantity) })
                    .eq('id', item.id);
            }
        }

        // 3. Mise à jour du compteur promo si nécessaire
        if (window.appliedPromo) {
            await window.supabaseHelpers.supabase
                .from('promo_codes')
                .update({ used_count: Number(window.appliedPromo.used_count || 0) + 1 })
                .eq('id', window.appliedPromo.id);
        }

        // 3. Préparer l'invoice pour WhatsApp
        const orderIdShort = createdOrder.id.split('-')[0].toUpperCase();
        const orderDate = new Date().toLocaleString('fr-FR');
        
        let invoiceText = `✨ *KÒMAND PWODWI - ZOE DEPT. EKSKLIZIV*\n`;
        invoiceText += `💎 _Sèvis Konsyèj sou Entènèt_\n`;
        invoiceText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        invoiceText += `*REFERANS :* #${orderIdShort}\n`;
        invoiceText += `*DAT :* ${orderDate}\n\n`;
        
        invoiceText += `🏛️ *ENFÒMASYON KLIYAN :*\n`;
        invoiceText += `• ${payload.customer_first_name} ${payload.customer_last_name}\n`;
        invoiceText += `• ${payload.customer_phone}\n`;
        invoiceText += `• ${payload.customer_address}, ${payload.customer_country}\n\n`;
        
        invoiceText += `📦 *SA OU CHWAZI :*\n`;
        payload.items.forEach(item => {
            invoiceText += `> *${item.name.toUpperCase()}*\n`;
            invoiceText += `  Size: ${item.size} | Koulè: ${item.color}\n`;
            invoiceText += `  Kantite: ${item.quantity} | ${formatHTG(item.unit_htg)}\n`;
        });
        
        invoiceText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        invoiceText += `*SOU-TOTAL :* ${formatHTG(payload.subtotal_htg)}\n`;
        invoiceText += `*LIVREZON :* ${payload.shipping_htg > 0 ? formatHTG(payload.shipping_htg) : 'N ap konfime livrezon an'}\n`;
        if (payload.discount_htg > 0) {
            invoiceText += `*RABÈ (${payload.promo_code}) :* -${formatHTG(payload.discount_htg)}\n`;
        }
        invoiceText += `\n💰 *MONTAN TOTAL :* *${formatHTG(payload.total_htg)}*\n`;
        invoiceText += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        invoiceText += `Bonjou ZOE DEPT., mwen vle konfime kòmand sa yo. Silvouplè gide m pou m finalize sa.`;

        // 4. Générer le lien WhatsApp et rediriger
        const waUrl = `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(invoiceText)}`;
        
        localStorage.setItem('zoeLastOrder', JSON.stringify(createdOrder));
        localStorage.removeItem('zoe_cart'); // Nettoyer le panier après commande réussie
        if (window.updateCartBadge) window.updateCartBadge();
        
        window.location.assign(waUrl);

    } catch (err) {
        if (payButton) {
            payButton.disabled = false;
            payButton.textContent = 'Peye kounya';
        }
        alert('Yon erè rive pandan kreyasyon kòmand la: ' + err.message);
    }
}

function wireProductActions(products, root = document) {
    const productMap = new Map(products.map(product => [String(product.id), product]));
    root.querySelectorAll('.product-detail-trigger').forEach(button => {
        button.addEventListener('click', () => {
            const product = productMap.get(String(button.dataset.productId));
            if (product) openProductModal(product);
        });
    });

    root.querySelectorAll('.preorder-trigger').forEach(button => {
        button.addEventListener('click', () => {
            const product = productMap.get(String(button.dataset.productId));
            const card = button.closest('.product-card');
            const options = selectedCardOptions(card, product);
            window.currentPreorderSize = options.size;
            window.currentPreorderColor = options.color;
            if (product) openPreorderModal(product);
        });
    });

    root.querySelectorAll('.product-cta:not(.preorder-trigger)').forEach(button => {
        button.addEventListener('click', () => {
            const product = productMap.get(String(button.dataset.productId));
            if (!product) return;
            const card = button.closest('.product-card');
            const options = selectedCardOptions(card, product);
            openBuyDrawer(product, options.size, options.color);
        });
    });
}

function renderCategoryPage(products) {
    const mount = document.querySelector('[data-dynamic-category]');
    if (!mount) return;

    const category = mount.dataset.dynamicCategory;
    const filtered = products.filter(product => productBelongsTo(product, category));

    if (!filtered.length) {
        mount.innerHTML = '<div class="empty-products">Pa gen pwodwi nan kategori sa ankò.</div>';
        return;
    }

    mount.innerHTML = `<div class="product-grid">${filtered.map(productCard).join('')}</div>`;
    wireColorSwatches(mount);
    wireSizeChoices(mount);
    wireCurrencyToggles(mount);
    wireProductActions(filtered, mount);
}

function renderToutNet(products) {
    const mount = document.getElementById('dynamicToutNetSections');
    if (!mount) return;

    const searchQuery = new URLSearchParams(window.location.search).get('search')?.trim() || '';
    if (searchQuery) {
        const normalizedQuery = normalizeSearchValue(searchQuery);
        const results = products.filter(product => productSearchText(product).includes(normalizedQuery));
        document.querySelector('.section-title h1').textContent = 'Rechèch';
        document.querySelector('.section-title p:last-child').textContent = `Rezilta pou "${searchQuery}".`;

        if (!results.length) {
            mount.innerHTML = '<div class="empty-products">Pa gen pwodwi ki koresponn ak rechèch sa.</div>';
            return;
        }

        mount.innerHTML = `<div class="product-grid">${results.map(productCard).join('')}</div>`;
        wireColorSwatches(mount);
        wireSizeChoices(mount);
        wireCurrencyToggles(mount);
        wireProductActions(results, mount);
        return;
    }

    if (!products.length) {
        mount.innerHTML = '<div class="empty-products">Pa gen pwodwi ankò.</div>';
        return;
    }

    const sections = ZOE_SHOP_CATEGORIES
        .map(category => {
            const items = products.filter(product => productBelongsTo(product, category.slug)).slice(0, 10);
            if (!items.length) return '';

            return `
                <section class="dynamic-category-section">
                    <div class="category-section-head">
                        <div>
                            <p class="eyebrow">Nouvo nan boutique</p>
                            <h2>${zoeEscape(category.label)}</h2>
                        </div>
                        <a class="btn light" href="${category.href}">Wè ${zoeEscape(category.label)}</a>
                    </div>
                    <div class="product-grid">${items.map(productCard).join('')}</div>
                </section>
            `;
        })
        .join('');

    mount.innerHTML = sections || '<div class="empty-products">Pa gen pwodwi ankò.</div>';
    wireColorSwatches(mount);
    wireSizeChoices(mount);
    wireCurrencyToggles(mount);
    wireProductActions(products, mount);
}

document.addEventListener('DOMContentLoaded', async () => {
    const products = await fetchShopProducts();
    allShopProducts = products;
    currentProductMap = new Map(products.map(product => [String(product.id), product]));
    renderToutNet(products);
    renderCategoryPage(products);
});
