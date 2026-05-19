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

    document.addEventListener('DOMContentLoaded', () => {
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
