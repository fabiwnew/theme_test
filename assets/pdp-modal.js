class PdpModal extends HTMLElement {
  constructor() {
    super();
    this.pdpModalBlock = this.querySelector(".pdp-modal__block");
    this.pdpModalClose = this.querySelector(".pdp-modal__close");

    this.pdpModalClose.addEventListener("click", this.close.bind(this));
  }

  open() {
    this.pdpModalContainer.classList.add("active");
  }

  close() {
    this.pdpModalContainer.classList.remove("active");
  }
}

customElements.define("cart-drawer", CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: "pdp-modal",
        section: "pdp-modal",
        selector: ".pdp-modal__content",
      },
    ];
  }
}

customElements.define("pdp-modal", PdpModal);
