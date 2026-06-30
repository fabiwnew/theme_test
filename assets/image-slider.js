/**
 * <image-slider>
 * Native scroll-snap inline gallery with thumbnail sync, arrow controls and a
 * lazily-loaded PhotoSwipe lightbox. Library URLs are passed in via data-
 * attributes so Liquid can resolve the fingerprinted asset URLs.
 */
class ImageSlider extends HTMLElement {
  constructor() {
    super();
    this.track = this.querySelector('.image-slider__track');
    this.slides = Array.from(this.querySelectorAll('.image-slider__slide'));
    this.thumbs = Array.from(this.querySelectorAll('.image-slider__thumb'));
    this.zoomLinks = Array.from(this.querySelectorAll('.image-slider__zoom'));
    this.currentIndex = 0;
    this.lightbox = null;
  }

  connectedCallback() {
    if (!this.track || this.slides.length === 0) return;

    this.thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => this.goTo(Number(thumb.dataset.index)));
    });

    this.querySelectorAll('[data-dir]').forEach((button) => {
      button.addEventListener('click', () => {
        this.step(button.dataset.dir === 'next' ? 1 : -1);
      });
    });

    this.zoomLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.openLightbox(Number(link.dataset.index));
      });
    });

    this.observeSlides();
    this.warmLightbox();
    this.updateArrows();
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
    if (this.lightbox) this.lightbox.destroy();
  }

  observeSlides() {
    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
          const index = this.slides.indexOf(entry.target);
          if (index !== -1) this.setActive(index);
        });
      },
      { root: this.track, threshold: [0.6] }
    );

    this.slides.forEach((slide) => this.observer.observe(slide));
  }

  setActive(index) {
    this.currentIndex = index;
    this.thumbs.forEach((thumb, i) => {
      const isActive = i === index;
      thumb.classList.toggle('is-active', isActive);
      if (isActive) {
        thumb.setAttribute('aria-current', 'true');
      } else {
        thumb.removeAttribute('aria-current');
      }
    });
    this.updateArrows();
  }

  updateArrows() {
    const prevBtn = this.querySelector('.image-slider__arrow--prev');
    const nextBtn = this.querySelector('.image-slider__arrow--next');
    if (prevBtn) prevBtn.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
    if (nextBtn) nextBtn.style.opacity = this.currentIndex === this.slides.length - 1 ? '0.3' : '1';
  }

  goTo(index) {
    const slide = this.slides[index];
    if (!slide) return;
    slide.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    this.setActive(index);
  }

  step(delta) {
    const next = Math.min(Math.max(this.currentIndex + delta, 0), this.slides.length - 1);
    this.goTo(next);
  }

  warmLightbox() {
    if (!this.dataset.pswpUrl || !('requestIdleCallback' in window)) return;
    requestIdleCallback(() => {
      import(this.dataset.pswpUrl).catch(() => {});
    });
  }

  buildDataSource() {
    return this.zoomLinks.map((link) => ({
      src: link.href,
      width: Number(link.dataset.pswpWidth) || 0,
      height: Number(link.dataset.pswpHeight) || 0,
      alt: link.querySelector('img')?.alt || '',
    }));
  }

  async openLightbox(index) {
    if (!this.lightbox) {
      this.loadStyles();
      const { default: PhotoSwipeLightbox } = await import(this.dataset.pswpUrl);
      this.lightbox = new PhotoSwipeLightbox({
        dataSource: this.buildDataSource(),
        pswpModule: () => import(this.dataset.pswpCoreUrl),
      });
      this.lightbox.init();
    }
    this.lightbox.loadAndOpen(index);
  }

  loadStyles() {
    if (!this.dataset.pswpCss || document.querySelector('link[data-pswp-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = this.dataset.pswpCss;
    link.setAttribute('data-pswp-css', '');
    document.head.appendChild(link);
  }
}

if (!customElements.get('image-slider')) {
  customElements.define('image-slider', ImageSlider);
}
