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
    this._pendingIndex = null;
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

    this.attachScrollSync();
    this.warmLightbox();
    this.setActive(0);
  }

  disconnectedCallback() {
    this._boundListeners.forEach(({ el, type, handler }) =>
      el.removeEventListener(type, handler),
    );
    this._boundListeners = [];
    if (this.lightbox) {
      this.lightbox.destroy();
      this.lightbox = null;
      this._lightboxReady = null;
    }
  }

  // ─── Initialisierung ────────────────────────────────────────────────────────

  attachScrollSync() {
    const handler = () => {
      const leftmost = this._leftmostIndex();
      if (this._pendingIndex !== null && this._pendingIndex >= leftmost) {
        const i = this._pendingIndex;
        this._pendingIndex = null;
        this.setActive(i);
        return;
      }
      this._pendingIndex = null;
      this.setActive(leftmost);
    };
    this.track.addEventListener("scrollend", handler, { passive: true });
    this._boundListeners.push({ el: this.track, type: "scrollend", handler });
  }

  _leftmostIndex() {
    const scrollLeft = this.track.scrollLeft;
    let closest = 0;
    let minDist = Infinity;
    this.slides.forEach((slide, i) => {
      const dist = Math.abs(slide.offsetLeft - scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    return closest;
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
    this._pendingIndex = index;
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
