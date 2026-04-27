/**
 * Funny People Gallery - Interactive Photo Viewer
 * A modern, accessible photo gallery with modal viewing capabilities
 * @version 1.0.0
 * @author 9-month experienced developer
 */

// Configuration constants
const CONFIG = {
    DEBOUNCE_DELAY: 250,
    MODAL_ANIMATION_DURATION: 300,
    IMAGE_LOAD_TIMEOUT: 10000,
    FOCUS_TRAP_ELEMENTS: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
};

/**
 * Utility class for common DOM operations and helper functions
 */
class Utils {
    /**
     * Debounce function to limit the rate of function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Check if an element is visible in the viewport
     * @param {Element} element - Element to check
     * @returns {boolean} Whether element is in viewport
     */
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Create a promise that resolves after a specified delay
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise} Promise that resolves after delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Loading indicator management
 */
class LoadingIndicator {
    constructor() {
        this.element = document.getElementById('loading-indicator');
    }

    show() {
        this.element.setAttribute('aria-hidden', 'false');
        this.element.style.display = 'flex';
    }

    hide() {
        this.element.setAttribute('aria-hidden', 'true');
        this.element.style.display = 'none';
    }
}

/**
 * Modal dialog for displaying full-size images
 */
class Modal {
    constructor() {
        this.overlay = null;
        this.isOpen = false;
        this.currentImage = null;
        this.focusTrap = new FocusTrap();
        this.loadingIndicator = new LoadingIndicator();
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modalHTML = `
            <div class="modal-overlay" id="image-modal" role="dialog" aria-modal="true" aria-labelledby="modal-caption">
                <div class="modal-content">
                    <button class="modal-close" aria-label="Close modal" type="button">
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <img id="modal-image" class="modal-image" alt="" loading="lazy">
                    <div id="modal-caption" class="modal-caption"></div>
                </div>
            </div>
        `;

        document.getElementById('modal-root').innerHTML = modalHTML;
        this.overlay = document.getElementById('image-modal');
        this.imageElement = document.getElementById('modal-image');
        this.captionElement = document.getElementById('modal-caption');
        this.closeButton = this.overlay.querySelector('.modal-close');
    }

    bindEvents() {
        // Close modal events
        this.closeButton.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigate('prev');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigate('next');
                    break;
            }
        });

        // Image error handling
        this.imageElement.addEventListener('error', () => {
            this.loadingIndicator.hide();
            this.imageElement.classList.add('image-error');
            console.error('Failed to load modal image:', this.imageElement.src);
        });

        this.imageElement.addEventListener('load', () => {
            this.loadingIndicator.hide();
            this.imageElement.classList.remove('image-error');
        });
    }

    /**
     * Open modal with specified image
     * @param {string} src - Image source URL
     * @param {string} caption - Image caption
     * @param {Element} triggerElement - Element that triggered the modal
     */
    async open(src, caption, triggerElement) {
        if (this.isOpen) return;

        this.currentImage = { src, caption, triggerElement };
        this.loadingIndicator.show();

        // Update modal content
        this.imageElement.src = src;
        this.imageElement.alt = caption;
        this.captionElement.textContent = caption;

        // Show modal with animation
        this.overlay.classList.add('active');
        this.isOpen = true;

        // Focus management
        this.focusTrap.activate(this.overlay);

        // Announce to screen readers
        this.overlay.setAttribute('aria-live', 'polite');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Wait for animation
        await Utils.delay(CONFIG.MODAL_ANIMATION_DURATION);
    }

    /**
     * Close the modal
     */
    async close() {
        if (!this.isOpen) return;

        this.overlay.classList.remove('active');
        this.focusTrap.deactivate();

        // Restore focus
        if (this.currentImage?.triggerElement) {
            this.currentImage.triggerElement.focus();
        }

        // Restore body scroll
        document.body.style.overflow = '';

        await Utils.delay(CONFIG.MODAL_ANIMATION_DURATION);
        this.isOpen = false;
        this.currentImage = null;
    }

    /**
     * Navigate to previous/next image
     * @param {string} direction - 'prev' or 'next'
     */
    navigate(direction) {
        const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
        const currentIndex = galleryItems.findIndex(item =>
            item.contains(this.currentImage?.triggerElement)
        );

        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'prev') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : galleryItems.length - 1;
        } else {
            newIndex = currentIndex < galleryItems.length - 1 ? currentIndex + 1 : 0;
        }

        const newItem = galleryItems[newIndex];
        const newImg = newItem.querySelector('.gallery-image');
        const newCaption = newItem.querySelector('.image-caption');

        this.open(newImg.src, newCaption.textContent, newImg);
    }
}

/**
 * Focus trap for modal accessibility
 */
class FocusTrap {
    constructor() {
        this.active = false;
        this.container = null;
        this.focusableElements = [];
        this.firstFocusable = null;
        this.lastFocusable = null;
    }

    activate(container) {
        this.container = container;
        this.active = true;
        this.updateFocusableElements();

        if (this.firstFocusable) {
            this.firstFocusable.focus();
        }

        document.addEventListener('keydown', this.handleKeyDown);
    }

    deactivate() {
        this.active = false;
        document.removeEventListener('keydown', this.handleKeyDown);
        this.container = null;
        this.focusableElements = [];
    }

    updateFocusableElements() {
        if (!this.container) return;

        this.focusableElements = Array.from(
            this.container.querySelectorAll(CONFIG.FOCUS_TRAP_ELEMENTS)
        ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

        this.firstFocusable = this.focusableElements[0];
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
    }

    handleKeyDown = (e) => {
        if (!this.active || e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === this.firstFocusable) {
                e.preventDefault();
                this.lastFocusable.focus();
            }
        } else {
            // Tab
            if (document.activeElement === this.lastFocusable) {
                e.preventDefault();
                this.firstFocusable.focus();
            }
        }
    };
}

/**
 * Gallery management class
 */
class Gallery {
    constructor() {
        this.modal = new Modal();
        this.images = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupImageObservers();
        this.handleImageErrors();
    }

    bindEvents() {
        // Gallery item clicks
        document.addEventListener('click', (e) => {
            const galleryItem = e.target.closest('.gallery-item');
            if (galleryItem) {
                e.preventDefault();
                const img = galleryItem.querySelector('.gallery-image');
                const caption = galleryItem.querySelector('.image-caption');
                this.modal.open(img.src, caption.textContent, img);
            }
        });

        // Keyboard navigation for gallery
        document.addEventListener('keydown', (e) => {
            if (e.target.closest('.gallery-item') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                e.target.click();
            }
        });

        // Window resize handling
        window.addEventListener('resize', Utils.debounce(() => {
            this.updateGalleryLayout();
        }, CONFIG.DEBOUNCE_DELAY));
    }

    setupImageObservers() {
        // Intersection Observer for lazy loading optimization
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    // Images already have loading="lazy", but we can add more logic here
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('.gallery-image').forEach(img => {
            imageObserver.observe(img);
        });
    }

    handleImageErrors() {
        document.querySelectorAll('.gallery-image').forEach(img => {
            img.addEventListener('error', () => {
                img.classList.add('image-error');
                console.error('Failed to load gallery image:', img.src);
            });

            img.addEventListener('load', () => {
                img.classList.remove('image-error');
            });
        });
    }

    updateGalleryLayout() {
        // Could implement masonry layout or other responsive adjustments
        console.log('Gallery layout updated');
    }
}

/**
 * Performance monitoring
 */
class PerformanceMonitor {
    static init() {
        if ('performance' in window && 'timing' in performance) {
            window.addEventListener('load', () => {
                const perfData = performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                console.log(`Page load time: ${loadTime}ms`);
            });
        }
    }
}

/**
 * Error handling and logging
 */
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