export class ImageGallery extends HTMLElement {

  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
        }
        #container {
          overflow-x: hidden;
          margin-bottom: 2px;
        }
        
        #image-container {
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
        
        #next-container {
          right: 0;
        }
        
        #prev, 
        #next {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 1em;
          background-color: #ffffff;
          color: #000000;
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
        
        #container:hover #prev-container,
        #container:hover #next-container,
        #container:hover #controls-container {
          opacity: 1;
        }
        
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 16px;
          background-color: #ffffff;
          cursor: pointer;
        }
        
        .dot.active,
        .dot:hover {
          background-color: #ff0000;
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
        
        ::slotted(img) {
          display: inline-block;
        }
      </style>
      
      <div id="container">
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
        
        <div id="image-container">
          <slot name="image"></slot>
        </div>
      </div>  
      
      <div id="thumbs-container">
        <div id="thumbs-slider"></div>
      </div>    
      
    `;
    const imageSlot = this.shadowRoot.querySelector('slot[name="image"]');

    let ready = false;

    imageSlot.addEventListener('slotchange', () => {
      const images = imageSlot.assignedNodes();

      console.log(images);

      const promises = images.filter(image => !image.complete)
                             .map(image => {
                               return new Promise((resolve, reject) => {
                                 image.addEventListener('load', resolve);
                                 image.addEventListener('error', reject);
                               });
                             });

      const init = e => {
        this.init(images);
        this.showImage(this.curIndex);

        imageSlot.style.display = 'block';
      };

      Promise.all(promises)
      .then(init)
      .catch((err) => {
        console.log(err);
      });
    });

  }

  connectedCallback() {
    const prevButton = this.shadowRoot.querySelector('#prev');
    const nextButton = this.shadowRoot.querySelector('#next');

    prevButton.addEventListener('click', this.previous.bind(this));
    nextButton.addEventListener('click', this.next.bind(this));

  }

  init(images) {
    this.configureImageContainer(images);
    this.configureControls(images);
    this.configureThumbs(images);
  }

  configureImageContainer(images) {
    this.imageContainer = this.shadowRoot.querySelector('#image-container');

    const {width, height} = images[0];

    this.curIndex = 0;
    this.numImages = images.length;

    this.style.width = `${width}px`;
    this.style.height = `${height}px`;

    this.imageOffsets = [0];

    const totalWidth = images.reduce((acc, image) => {
      const width = acc + image.width;
      console.log(image.width);
      this.imageOffsets.push(width);
      return width;
    }, 0);

    this.imageContainer.style.width = `${totalWidth}px`;
    this.imageContainer.style.height = `${height}px`;
  }

  configureThumbs(images) {
    this.thumbsContainer = this.shadowRoot.querySelector('#thumbs-container');
    this.thumbsSlider = this.shadowRoot.querySelector('#thumbs-slider');

    this.thumbsContainerWidth = this.thumbsContainer.offsetWidth;

    this.thumbsSlider.innerHTML = '';

    images.forEach((image, index) => {
      const clone = image.cloneNode();
      clone.classList.add('thumb');
      clone.dataset.index = index;

      this.thumbsSlider.appendChild(clone);
    });

    this.thumbs = [...this.thumbsSlider.querySelectorAll('img')];

    this.thumbOffsets = [0];

    const totalWidth = this.thumbs.reduce((acc, thumb) => {
      const width = acc + thumb.offsetWidth;

      this.thumbOffsets.push(width);
      return width;
    }, 0);

    this.thumbsSlider.style.width = `${totalWidth}px`;
    this.thumbsSliderWidth = totalWidth;

    this.thumbsSlider.addEventListener('click', ({target}) => {
      if(target.classList.contains('thumb')) {
        this.showImage(parseInt(target.dataset.index));
      }
    });
  }

  configureControls(images) {
    const controlsContainer = this.shadowRoot.querySelector('#controls-container');

    controlsContainer.innerHTML = images.reduce((acc, _, index) => {
      return `${acc}<div class="dot" data-index="${index}"></div>`;
    }, ``);

    this.dots = [...this.shadowRoot.querySelectorAll('.dot')];
    this.dots[this.curIndex].classList.add('active');

    controlsContainer.addEventListener('click', ({target}) => {
      if(target.classList.contains('dot')) {
        this.showImage(parseInt(target.dataset.index));
      }
    });
  }

  previous() {
    this.showImage(this.curIndex - 1);
  }

  next() {
    this.showImage(this.curIndex + 1);
  }

  showImage(index) {
    this.curIndex = index < 0 ? 0 :
                    index >= this.numImages - 1 ? this.numImages - 1 : index;

    this.imageContainer.style.marginLeft = `-${this.imageOffsets[this.curIndex]}px`;

    let m = this.thumbOffsets[this.curIndex] > this.thumbsContainerWidth / 2 ?
      0 - this.thumbOffsets[this.curIndex] + this.thumbsContainerWidth / 2 : 0;

    if(Math.abs(m) + this.thumbsContainerWidth > this.thumbsSliderWidth) {
      m = (this.thumbsSliderWidth - this.thumbsContainerWidth) * -1
    }

    this.thumbsSlider.style.marginLeft = `${m}px`;

    this.updateSelectors(this.curIndex);
    this.updateThumbs(this.curIndex);
  }

  updateSelectors(index) {
    this.dots.forEach(dot => dot.classList.remove('active'));
    this.dots[index].classList.add('active');
  }

  updateThumbs(index) {
    this.thumbs.forEach(thumb => thumb.classList.remove('active'));
    this.thumbs[index].classList.add('active');
  }

  attributeChangedCallback(attr, oldVal, newVal) {

  }

  disconnectedCallback() {

  }
}

customElements.define('image-gallery', ImageGallery);
