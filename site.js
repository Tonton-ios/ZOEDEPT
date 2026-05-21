(function () {
    function ensureSearchOverlay() {
        if (document.getElementById('siteSearchOverlay')) return;

        document.body.insertAdjacentHTML('beforeend', `
            <section class="site-search-overlay" id="siteSearchOverlay" aria-hidden="true">
                <form class="site-search-box" id="siteSearchForm" role="search">
                    <button class="site-search-close" type="button" aria-label="Fèmen rechèch">×</button>
                    <label for="siteSearchInput">Rechèch pwodwi</label>
                    <div class="site-search-row">
                        <input id="siteSearchInput" type="search" placeholder="Mayo, pantalon, nwa..." autocomplete="off" required>
                        <button class="btn dark" type="submit">Chèche</button>
                    </div>
                </form>
            </section>
        `);

        document.getElementById('siteSearchForm').addEventListener('submit', event => {
            event.preventDefault();
            const query = document.getElementById('siteSearchInput').value.trim();
            if (!query) return;
            window.location.href = `tout-net.html?search=${encodeURIComponent(query)}`;
        });

        document.querySelector('.site-search-close').addEventListener('click', closeSearchOverlay);
        document.getElementById('siteSearchOverlay').addEventListener('click', event => {
            if (event.target.id === 'siteSearchOverlay') closeSearchOverlay();
        });
    }

    function openSearchOverlay() {
        ensureSearchOverlay();
        const overlay = document.getElementById('siteSearchOverlay');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        setTimeout(() => document.getElementById('siteSearchInput')?.focus(), 20);
    }

    function closeSearchOverlay() {
        const overlay = document.getElementById('siteSearchOverlay');
        if (!overlay) return;
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
    }

    function renderFooter() {
        const footer = document.querySelector('.footer');
        if (!footer) return;
        footer.innerHTML = `
            <div class="footer-brand">
                <strong>ZOE DEPT.</strong>
            </div>
            <div class="footer-socials">
                <a href="https://www.instagram.com/zoedepartment?igsh=MWFmanl1cXZsdGQ3eg==" target="_blank" aria-label="Instagram" class="footer-icon icon-instagram"></a>
                <a href="https://www.tiktok.com/@zoedepartment?_r=1&_t=ZS-96YL40SOGQ8" target="_blank" aria-label="TikTok" class="footer-icon icon-tiktok"></a>
                <a href="https://wa.me/50932045691?text=Bonjou%20ZOE%20DEPT.,%20mwen%20vle%20kontakte%20nou." target="_blank" aria-label="WhatsApp" class="footer-icon icon-whatsapp"></a>
            </div>
            <div class="footer-legal">
                <span>© 2026 ZOE DEPT, Tout dwa rezève. Sit sa fèt pa URBVEC ATELIER .</span>
            </div>
        `;
    }

    function updateCartBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        if (badges.length === 0) return;
        
        let cart = [];
        try {
            cart = JSON.parse(localStorage.getItem('zoe_cart') || '[]');
        } catch (e) {}
        
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        badges.forEach(badge => {
            badge.textContent = count;
        });
    }
    window.updateCartBadge = updateCartBadge;

    document.addEventListener('DOMContentLoaded', () => {
        renderFooter();
        updateCartBadge();
        document.querySelectorAll('.icon-search').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                openSearchOverlay();
            });
        });

        document.querySelectorAll('button.icon-cart').forEach(button => {
            button.addEventListener('click', () => {
                window.location.href = 'panye.html';
            });
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeSearchOverlay();
        });
    });
})();
