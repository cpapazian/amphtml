/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {CSS} from '../../../build/amp-fit-text-0.1.css';
import {getLengthNumeral, isLayoutSizeDefined} from '../../../src/layout';
import {px, setStyle, setStyles} from '../../../src/style';

const TAG = 'amp-fit-text';
const LINE_HEIGHT_EM_ = 1.15;


class AmpFitText extends AMP.BaseElement {

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Element} */
    this.content_ = null;

    /** @private {?Element} */
    this.contentWrapper_ = null;

    /** @private {?Element} */
    this.measurer_ = null;

    /** @private {number} */
    this.minFontSize_ = -1;

    /** @private {number} */
    this.maxFontSize_ = -1;

    // fit|truncate|truncate-js
    // this.overflowMethod_ = 'fit';
    this.overflowMethod_ = this.element.getAttribute('overflow') || 'fit';
    // this.overflowMode
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  /** @override */
  buildCallback() {
    this.content_ = this.element.ownerDocument.createElement('div');
    this.applyFillContent(this.content_);
    this.content_.classList.add('i-amphtml-fit-text-content');
    setStyles(this.content_, {zIndex: 2});

    this.contentWrapper_ = this.element.ownerDocument.createElement('div');
    if (this.overflowMethod_ === 'fit') {
      setStyles(this.contentWrapper_, {lineHeight: `${LINE_HEIGHT_EM_}em`});
    }
    this.content_.appendChild(this.contentWrapper_);

    this.measurer_ = this.element.ownerDocument.createElement('div');
    // Note that "measurer" cannot be styled with "bottom:0".
    setStyles(this.measurer_, {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 1,
      visibility: 'hidden',
      // lineHeight: `${LINE_HEIGHT_EM_}em`,
    });

    this.getRealChildNodes().forEach(node => {
      this.contentWrapper_.appendChild(node);
    });
    this.measurer_./*OK*/innerHTML = this.contentWrapper_./*OK*/innerHTML;
    this.element.appendChild(this.content_);
    this.element.appendChild(this.measurer_);

    if (this.overflowMethod_ === 'fit') {
      setStyles(this.measurer_, {
        lineHeight: `${LINE_HEIGHT_EM_}em`,
      });
      this.minFontSize_ = getLengthNumeral(this.element.getAttribute(
          'min-font-size')) || 6;

      this.maxFontSize_ = getLengthNumeral(this.element.getAttribute(
          'max-font-size')) || 72;
    } else {
      this.fontSize_ = getLengthNumeral(this.element.getAttribute('font-size'));
    }
  }

  /** @override */
  prerenderAllowed() {
    return true;
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  layoutCallback() {
    if (this.overflowMethod_ === 'fit') {
      this.updateFontSize_();
    } else {
      this.updateText_();
    }
    return Promise.resolve();
  }

  /** @private */
  updateFontSize_() {
    const maxHeight = this.element./*OK*/offsetHeight;
    const maxWidth = this.element./*OK*/offsetWidth;
    const fontSize = calculateFontSize_(this.measurer_, maxHeight, maxWidth,
        this.minFontSize_, this.maxFontSize_);
    setStyle(this.contentWrapper_, 'fontSize', px(fontSize));
    updateOverflow_(this.contentWrapper_, this.measurer_, maxHeight,
        fontSize, this.overflowMethod_);
  }

  updateText_() {
    const maxHeight = this.element./*OK*/offsetHeight;
    const fontSize = this.fontSize_;
    if (fontSize) {
      // clamp ...
      console.log(fontSize, px(fontSize));
      setStyle(this.contentWrapper_, 'fontSize', px(fontSize));
      updateOverflow_(this.contentWrapper_, this.measurer_, maxHeight,
          fontSize, this.overflowMethod_);
    } else {
      truncate_(this.contentWrapper_, this.measurer_, maxHeight);
    }
  }
}

function truncate_(content, measurer, height) {
  const overflown = measurer./*OK*/offsetHeight > height;
  if (!overflown) {
    return;
  }
  const children = measurer.childNodes;
  console.log(children);
  let index = children.length - 1;
  while (index > 0 && children[0].nodeType !== Node.TEXT_NODE) {
    index--;
  }
  console.log(index);
  if (index < 0) {
    return;
  }
  const node = children[index];
  // console.log(node, node.textContent;);
  const chars = node.textContent.split('');
  // console.log(node, chars);
  // console.log(height);
  while (measurer./*OK*/offsetHeight > height) {
    // console.log(measurer.offsetHeight);
    chars.pop();
    // console.log(w);
    node.textContent = chars.join('') + '…';
  }
  // console.log(chars);
  content.childNodes[index].textContent = chars.join('') + '…';
  // console.log(content.offsetHeight);
}

/**
 * @param {Element} measurer
 * @param {number} expectedHeight
 * @param {number} expectedWidth
 * @param {number} minFontSize
 * @param {number} maxFontSize
 * @return {number}
 * @private  Visible for testing only!
 */
export function calculateFontSize_(measurer, expectedHeight, expectedWidth,
  minFontSize, maxFontSize) {
  maxFontSize++;
  // Binomial search for the best font size.
  while (maxFontSize - minFontSize > 1) {
    const mid = Math.floor((minFontSize + maxFontSize) / 2);
    setStyle(measurer, 'fontSize', px(mid));
    const height = measurer./*OK*/offsetHeight;
    const width = measurer./*OK*/offsetWidth;
    if (height > expectedHeight || width > expectedWidth) {
      maxFontSize = mid;
    } else {
      minFontSize = mid;
    }
  }
  return minFontSize;
}

export function calculateWordTruncation_(content, measurer, expectedHeight) {
  const words = measurer.textContent.trim().split(' ');
  const height = measurer./*OK*/offsetHeight;
  console.log(words, expectedHeight, height);
  // let length = words.length - 1;
  // let index = maxIndex;

  while (measurer./*OK*/offsetHeight > expectedHeight) {
    // index--;
    words.pop();
    measurer.textContent = words.join(' ') + '...';
  }

  console.log(words, measurer.textContent);
  return measurer.textContent;
}

/**
 * @param {Element} content
 * @param {Element} measurer
 * @param {number} maxHeight
 * @param {number} fontSize
 * @private  Visible for testing only!
 */
export function updateOverflow_(content, measurer, maxHeight, fontSize) {
  setStyle(measurer, 'fontSize', px(fontSize));
  const overflown = measurer./*OK*/offsetHeight > maxHeight;
  const lineHeight = fontSize * LINE_HEIGHT_EM_;
  const numberOfLines = Math.floor(maxHeight / lineHeight);

  content.classList.toggle('i-amphtml-fit-text-content-overflown', overflown);
  setStyles(content, {
    lineClamp: overflown ? numberOfLines : '',
    maxHeight: overflown ? px(lineHeight * numberOfLines) : '',
  });
}


AMP.extension(TAG, '0.1', AMP => {
  AMP.registerElement(TAG, AmpFitText, CSS);
});
