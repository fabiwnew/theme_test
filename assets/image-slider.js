/**
 * <image-slider>
 * Native scroll-snap inline gallery with thumbnail sync, arrow controls and a
 * lazily-loaded PhotoSwipe lightbox. Library URLs are passed in via data-
 * attributes so Liquid can resolve the fingerprinted asset URLs.
 */
class ImageSlider extends HTMLElement {
  // ─── State ──────────────────────────────────────────────────────────────────

  constructor() {
    super();
    this.track = this.querySelector(".image-slider__track");
    this.slides = Array.from(this.querySelectorAll(".image-slider__slide"));
    this.thumbs = Array.from(this.querySelectorAll(".image-slider__thumb"));
    this.zoomLinks = Array.from(this.querySelectorAll(".image-slider__zoom"));
    this.currentIndex = 0;
    this.observer = null;
    this.lightbox = null;
    this._lightboxReady = null;
    this._boundListeners = [];
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  connectedCallback() {
    if (!this.track || this.slides.length === 0) return;

    this.thumbs.forEach((thumb) => {
      const handler = () => this.goTo(Number(thumb.dataset.index));
      thumb.addEventListener("click", handler);
      this._boundListeners.push({ el: thumb, type: "click", handler });
    });

    this.querySelectorAll("[data-dir]").forEach((button) => {
      const handler = () => this.step(button.dataset.dir === "next" ? 1 : -1);
      button.addEventListener("click", handler);
      this._boundListeners.push({ el: button, type: "click", handler });
    });

    this.zoomLinks.forEach((link) => {
      const handler = (event) => {
        event.preventDefault();
        this.openLightbox(Number(link.dataset.index));
      };
      link.addEventListener("click", handler);
      this._boundListeners.push({ el: link, type: "click", handler });
    });

    this.observeSlides();
    this.warmLightbox();
    this.updateArrows();
  }

  disconnectedCallback() {
    this._boundListeners.forEach(({ el, type, handler }) =>
      el.removeEventListener(type, handler),
    );
    this._boundListeners = [];
    if (this.observer) this.observer.disconnect();
    if (this.lightbox) {
      this.lightbox.destroy();
      this.lightbox = null;
      this._lightboxReady = null;
    }
  }

  // ─── Initialisierung ────────────────────────────────────────────────────────

  observeSlides() {
    if (!("IntersectionObserver" in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
          const index = this.slides.indexOf(entry.target);
          if (index !== -1) this.setActive(index);
        });
      },
      { root: this.track, threshold: [0.6] },
    );

    this.slides.forEach((slide) => this.observer.observe(slide));
  }

  warmLightbox() {
    if (!this.dataset.pswpUrl || !("requestIdleCallback" in window)) return;
    requestIdleCallback(() => {
      import(this.dataset.pswpUrl).catch(() => {});
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  goTo(index) {
    const slide = this.slides[index];
    if (!slide) return;
    slide.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
    this.setActive(index);
  }

  step(delta) {
    const next = Math.min(
      Math.max(this.currentIndex + delta, 0),
      this.slides.length - 1,
    );
    this.goTo(next);
  }

  setActive(index) {
    this.currentIndex = index;
    this.thumbs.forEach((thumb, i) => {
      const isActive = i === index;
      thumb.classList.toggle("is-active", isActive);
      if (isActive) {
        thumb.setAttribute("aria-current", "true");
      } else {
        thumb.removeAttribute("aria-current");
      }
    });
    this.updateArrows();
  }

  updateArrows() {
    const prevBtn = this.querySelector(".image-slider__arrow--prev");
    const nextBtn = this.querySelector(".image-slider__arrow--next");
    if (prevBtn) prevBtn.style.opacity = this.currentIndex === 0 ? "0.3" : "1";
    if (nextBtn)
      nextBtn.style.opacity =
        this.currentIndex === this.slides.length - 1 ? "0.3" : "1";
  }

  // ─── Lightbox ───────────────────────────────────────────────────────────────

  async openLightbox(index) {
    if (!this._lightboxReady) {
      this.loadStyles();
      this._lightboxReady = import(this.dataset.pswpUrl)
        .then(({ default: PhotoSwipeLightbox }) => {
          this.lightbox = new PhotoSwipeLightbox({
            dataSource: this.buildDataSource(),
            pswpModule: () => import(this.dataset.pswpCoreUrl),
            bgOpacity: 0.9,
          });
          this.lightbox.init();
        })
        .catch((err) => {
          this._lightboxReady = null;
          return Promise.reject(err);
        });
    }
    try {
      await this._lightboxReady;
      this.lightbox.loadAndOpen(index);
    } catch {
      // Import failed; _lightboxReady was reset to null so the next click
      // will retry. The gallery remains fully usable without the lightbox.
    }
  }

  buildDataSource() {
    return this.zoomLinks.map((link) => ({
      src: link.href,
      width: Number(link.dataset.pswpWidth) || 0,
      height: Number(link.dataset.pswpHeight) || 0,
      alt: link.querySelector("img")?.alt || "",
    }));
  }

  loadStyles() {
    if (!this.dataset.pswpCss || document.querySelector("link[data-pswp-css]"))
      return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = this.dataset.pswpCss;
    link.setAttribute("data-pswp-css", "");
    document.head.appendChild(link);
  }
}

if (!customElements.get("image-slider")) {
  customElements.define("image-slider", ImageSlider);
}
