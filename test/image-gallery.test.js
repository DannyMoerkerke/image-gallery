import '../src/elements/image-gallery.js';

describe('image-gallery', () => {
  let element;

  const images = `
    <img src="src/img/IMG_0791.png" slot="image">
    <img src="src/img/IMG_0829.png" slot="image">
    <img src="src/img/IMG_0848.png" slot="image">
    <img src="src/img/IMG_0860.png" slot="image">
    <img src="src/img/IMG_0924.png" slot="image">
    <img src="src/img/IMG_0927.png" slot="image">
    <img src="src/img/IMG_0955.png" slot="image">
  `;

  beforeEach(done => {
    element = document.createElement('image-gallery');

    element.addEventListener('ready', () => done());

    element.insertAdjacentHTML('afterbegin', images);

    document.body.appendChild(element);

  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should show the next image', () => {
    assert.equal(element.curIndex, 0);

    element.next();

    assert.equal(element.curIndex, 1);
  });
});
