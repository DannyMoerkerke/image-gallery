export class ImageGallery extends HTMLElement {

  static get observedAttributes() {
    return ['thumbs'];
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <style>
        :host {
          --controls-background: #ffffff;
          --controls-color: #000000;
          --dot-color: #ffffff;
          --dot-active-color: #ff0000;
          display: block;
        }
        
        #image-container {
          overflow-x: hidden;
          margin-bottom: 2px;
          position: relative;
        }
        
        #image-slider {
          transition: margin-left .8s cubic-bezier(0, 0.92, 0.32, 0.98);
        }
        
        #prev-container,
        #next-container {
          position: absolute;
          display: flex;
          align-items: center;
          height: 100%;
          top: 0;
        }
        
        #prev-container {
          left: 0;
        }
        
        #next-container {
          right: 0;
        }
        
        #prev, 
        #next {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 1em;
          background-color: var(--controls-background);
          color: var(--controls-color);
          cursor: pointer;
          margin: 0 5px;
          font-weight: bold;
          outline: none;
        }
        
        #controls {
          position: absolute;
          display: flex;
          justify-content: center;
          left: 0;
          bottom: 10px;
          width: 100%;
        }
        
        #controls-container {
          padding: 0 0 0 16px;
        }
        
        #prev-container,
        #next-container,
        #controls-container {
          opacity: 0;
          transition: opacity .3s ease-out;
        }
        
        #image-container:hover #prev-container,
        #image-container:hover #next-container,
        #image-container:hover #controls-container {
          opacity: 1;
        }
        
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 16px;
          background-color: var(--dot-color);
          cursor: pointer;
        }
        
        .dot.active,
        .dot:hover {
          background-color: var(--dot-active-color);
        }
        
        #thumbs-container {
          position: relative;
          overflow-x: hidden;
          display: none;
        }
        
        #thumbs-slider {
          justify-content: space-between;
          transition: margin-left .8s cubic-bezier(0, 0.92, 0.32, 0.98);
        }
        
        #thumbs-slider img {
          display: inline-block;
          width: 100px;
          height: auto;
          border: 2px solid transparent;
          cursor: pointer;
          box-sizing: border-box;
        }
        
        #thumbs-slider img.active {
          border: 2px solid #ff0000;
        }
        
        :host([thumbs]) #thumbs-container {
          display: block;
        }
        
        slot[name="image"] {
          display: none;
        }
      </style>
      
      <div id="image-container">
        <div id="prev-container">
          <button id="prev">&lt;</button>
        </div>
        
        <div id="next-container">
          <button id="next">&gt;</button>
        </div>
        
        <div id="controls">
          <div id="controls-container">
          </div>
        </div>
        
        <div id="image-slider">
          <slot name="image"></slot>
        </div>
      </div>  
      
      <div id="thumbs-container">
        <div id="thumbs-slider"></div>
      </div>    
    `;

    this.thumbsContainer = this.shadowRoot.querySelector('#thumbs-container');
    this.thumbsSlider = this.shadowRoot.querySelector('#thumbs-slider');
    this.imageSlider = this.shadowRoot.querySelector('#image-slider');
    this.controlsContainer = this.shadowRoot.querySelector('#controls-container');
  }

  connectedCallback() {
    const prevButton = this.shadowRoot.querySelector('#prev');
    const nextButton = this.shadowRoot.querySelector('#next');

    prevButton.addEventListener('click', this.previous.bind(this));
    nextButton.addEventListener('click', this.next.bind(this));

    const imageSlot = this.shadowRoot.querySelector('slot[name="image"]');

    imageSlot.addEventListener('slotchange', () => {
      this.images = imageSlot.assignedNodes();

      const promises = this.images.filter(image => !image.complete)
      .map(image => {
        return new Promise((resolve, reject) => {
          image.addEventListener('load', resolve);
          image.addEventListener('error', reject);
        });
      });

      // wait until all images are loaded
      Promise.all(promises)
      .then(() => {
        this.init(this.images);
        this.showImage(this.curIndex);

        imageSlot.style.display = 'block';
      })
      .catch(err => {
        console.log(err);
      });
    });
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    if(attr === 'thumbs') {
      this.thumbsContainer.style.display = this.hasAttribute('thumbs') ? 'block' : 'none';
    }
  }

  init(images) {
    this.setupImages(images);
    this.setupThumbs(images);
    this.setupControls(images);

    this.dispatchEvent(new CustomEvent('ready', {
      bubbles: true,
      composed: true
    }));
  }

  setupImages(images) {
    this.curIndex = 0;
    this.numImages = images.length;

    const {width, height} = images[0];
    this.style.width = `${width}px`;

    const {totalWidth, offsets} = this.getTotalWidthAndOffsets(images);
    this.imageOffsets = offsets;

    this.imageSlider.style.width = `${totalWidth}px`;
    this.imageSlider.style.height = `${height}px`;
  }

  setupThumbs(images) {
    this.thumbsContainerWidth = this.thumbsContainer.offsetWidth;

    this.thumbsSlider.innerHTML = '';

    images.forEach((image, index) => {
      const clone = image.cloneNode();
      clone.classList.add('thumb');
      clone.dataset.index = index;

      this.thumbsSlider.appendChild(clone);
    });

    this.thumbs = [...this.thumbsSlider.querySelectorAll('img')];

    const {totalWidth, offsets} = this.getTotalWidthAndOffsets(this.thumbs);
    this.thumbOffsets = offsets;

    this.thumbsSlider.style.width = `${totalWidth}px`;
    this.thumbsSliderWidth = totalWidth;
    this.thumbs[this.curIndex].classList.add('active');

    this.thumbsSlider.addEventListener('click', ({target}) => {
      if(this.isThumb(target)) {
        this.showImage(parseInt(target.dataset.index));
      }
    });
  }

  setupControls(images) {
    this.controlsContainer.innerHTML = images.reduce((acc, _, index) => {
      return `${acc}<div class="dot" data-index="${index}"></div>`;
    }, ``);

    this.dots = [...this.shadowRoot.querySelectorAll('.dot')];
    this.dots[this.curIndex].classList.add('active');

    this.controlsContainer.addEventListener('click', ({target}) => {
      if(this.isDot(target)) {
        this.showImage(parseInt(target.dataset.index));
      }
    });
  }

  setActive(elements, index) {
    elements.forEach(element => element.classList.remove('active'));
    elements[index].classList.add('active');
  }

  isThumb(element) {
    return element.classList.contains('thumb');
  }

  isDot(element) {
    return element.classList.contains('dot');
  }

  getTotalWidthAndOffsets(elements) {
    const offsets = [0];

    const totalWidth = elements.reduce((acc, element) => {
      const width = acc + Math.max(element.width, element.offsetWidth);

      offsets.push(width);
      return width;
    }, 0);

    return {totalWidth, offsets};
  }

  previous() {
    this.showImage(this.curIndex - 1);
  }

  next() {
    this.showImage(this.curIndex + 1);
  }

  showImage(index) {
    const prevIndex = this.curIndex;
    this.curIndex = Math.min(Math.max(index, 0), this.numImages - 1);

    if(prevIndex !== this.curIndex) {
      this.imageSlider.style.marginLeft = `-${this.imageOffsets[this.curIndex]}px`;

      const thumbOffset = this.thumbOffsets[this.curIndex];
      const halfThumbsContainerWidth = this.thumbsContainerWidth / 2;

      let sliderOffset = thumbOffset > halfThumbsContainerWidth ? -(thumbOffset + halfThumbsContainerWidth) : 0;

      if(Math.abs(sliderOffset) + this.thumbsContainerWidth > this.thumbsSliderWidth) {
        sliderOffset = -(this.thumbsSliderWidth - this.thumbsContainerWidth);
      }

      this.thumbsSlider.style.marginLeft = `${sliderOffset}px`;

      this.setActive(this.dots, this.curIndex);
      this.setActive(this.thumbs, this.curIndex);

      this.imageSlider.dispatchEvent(new CustomEvent('image-change', {
        bubbles: true,
        composed: true,
        detail: {
          image: this.images[this.curIndex],
        }
      }));
    }
  }
}

customElements.define('image-gallery', ImageGallery);
