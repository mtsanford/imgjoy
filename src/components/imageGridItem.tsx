import React, { useRef } from 'react';
import useDoubleClick from 'use-double-click';
import { ipcRenderer } from 'electron';
import { pathToUrl } from '../lib/util';

import log from '../lib/log';

const ImageGridItem = (props) => {
  const imageRef = useRef();
  const { imagePath } = props;
  const imageUrl = pathToUrl(imagePath);

  useDoubleClick({
    onSingleClick: () => {},
    onDoubleClick: () => {
      window.open(imagePath);
    },
    ref: imageRef,
  });

  const dragStartHandler = (event) => {
    event.preventDefault();
    ipcRenderer.send('ondragstart', imagePath);
  };

  return (
    <div
      ref={imageRef}
      className="image-grid-item-image"
      style={{ backgroundImage: `url(${imageUrl})` }}
      draggable="true"
      onDragStart={dragStartHandler}
    />
  );
};

export default ImageGridItem;