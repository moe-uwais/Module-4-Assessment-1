document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.card');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    const modalCaption = document.getElementById('modal-caption');
    const closeModalButton = document.getElementById('close-modal');

    function openModal(src, caption) {
        modalImage.src = src;
        modalImage.alt = caption;
        modalCaption.textContent = caption;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    cards.forEach(function (card) {
        card.addEventListener('click', function () {
            const img = card.querySelector('img');
            const caption = img.dataset.caption || img.alt;
            openModal(img.src, caption);
        });
    });

    closeModalButton.addEventListener('click', closeModal);

    modal.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });
});

class ErrorHandler {
    static init() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            // Could send to error reporting service
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            // Could send to error reporting service
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Funny People Gallery initializing...');

    // Initialize components
    new Gallery();
    PerformanceMonitor.init();
    ErrorHandler.init();

    // Add loading class to body for CSS transitions
    document.body.classList.add('loaded');

    console.log('Funny People Gallery ready!');
});

// Export for potential testing or extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Gallery, Modal, Utils };
}
