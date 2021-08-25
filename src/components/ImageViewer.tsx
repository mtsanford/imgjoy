import React, { useRef, useEffect } from 'react';
import { useImmerReducer } from 'use-immer';
import { useSelector, useDispatch } from 'react-redux';

import { pathToUrl, clipRect } from '../lib/util';
import { fitRect, clientToImageRect } from '../lib/fit-essential-rect';
import { currentImageActions } from '../store/current-image-slice';
import useClientRect from '../hooks/use-client-rect';

const imagePositionDefault = {
  dragging: false,
  startMousePos: {
    x: 0,
    y: 0,
  },
  lastMousePos: {
    x: 0,
    y: 0,
  },
  clientRect: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  selectRect: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  imageRect: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  essentialRect: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  renderedImageRect: {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
};

// IMPORTANT: Using immer!
const imagePositionReducer = (state, action) => {
  // action.payload.clientRect and mousePos will be in window coordinates.
  // We want client corrdinates
  let mousePos = { x: 0, y: 0 };
  let normalizedClientRect = { left: 0, top: 0, width: 0, height: 0 };

  if (action.payload.clientRect) {
    normalizedClientRect = {
      left: 0,
      top: 0,
      width: action.payload.clientRect.width,
      height: action.payload.clientRect.height,
    };
    if (action.payload.mousePos) {
      mousePos = {
        x: action.payload.mousePos.x - action.payload.clientRect.left,
        y: action.payload.mousePos.y - action.payload.clientRect.top,
      };
    }
  }

  if (action.type === 'init') {
    state.imageRect = action.payload.imageRect;
    state.essentialRect = action.payload.imageRect; // initially show whole image
    state.renderedImageRect = fitRect(
      state.imageRect,
      state.essentialRect,
      normalizedClientRect
    );
    return;
  }

  // if (action.type === 'resize') {
  //   state.renderedImageRect = fitRect(
  //     state.imageRect,
  //     state.essentialRect,
  //     normalizedClientRect
  //   );
  //   return;
  // }

  if (action.type === 'mouseDown') {
    state.startMousePos = mousePos;
    state.dragging = true;

    state.selectRect = {
      left: mousePos.x,
      top: mousePos.y,
      width: 0,
      height: 0,
    };

    return;
  }

  if (action.type === 'mouseMove' || action.type === 'mouseUp') {
    if (state.dragging) {
      state.selectRect = {
        left: Math.min(state.startMousePos.x, mousePos.x),
        top: Math.min(state.startMousePos.y, mousePos.y),
        width: Math.abs(mousePos.x - state.startMousePos.x),
        height: Math.abs(mousePos.y - state.startMousePos.y),
      };
    }
  }

  if (action.type === 'mouseMove') {
    return;
  }

  if (action.type === 'mouseUp') {
    const essentialRect = clientToImageRect(
      state.imageRect,
      state.renderedImageRect,
      state.selectRect
    );
    const clipped = clipRect(essentialRect, state.imageRect);
    if (clipped.width > 0 && clipped.height > 0) {
      state.essentialRect = clipped;
      // state.renderedImageRect = fitRect(
      //   state.imageRect,
      //   state.essentialRect,
      //   normalizedClientRect
      // );
    }
    state.dragging = false;
    return;
  }
};

const getMousePos = (event) => ({
  x: event.nativeEvent.offsetX,
  y: event.nativeEvent.offsetY,
});

const ImageViewer = (props) => {
  let imageStyles;
  let essentialRectStyles;

  const dispatch = useDispatch();
  const [imageViewerRef, clientRect] = useClientRect();
  const currentImage = useSelector((state) => state.currentImage);
  const imagePath = currentImage.filePath;
  const imageUrl = pathToUrl(imagePath);

  const [positionState, positionDispatch] = useImmerReducer(
    imagePositionReducer,
    imagePositionDefault
  );

  const drawImage = currentImage.isValid && clientRect;

  useEffect(() => {
    if (!drawImage) {
      return;
    }

    positionDispatch({
      type: 'init',
      payload: {
        clientRect,
        imageRect: currentImage.imageRect,
      },
    });
  }, [currentImage.isValid, currentImage.filePath, positionDispatch]);

  useEffect(() => {
    dispatch(currentImageActions.setEssentialRect(positionState.essentialRect));
  }, [positionState.essentialRect, dispatch]);

  if (drawImage) {
    const renderedImageRect = fitRect(
      currentImage.imageRect,
      currentImage.imageRect,
      clientRect
    );
    imageStyles = {
      position: 'absolute',
      left: `${renderedImageRect.left}px`,
      top: `${renderedImageRect.top}px`,
      width: `${renderedImageRect.width}px`,
      height: `${renderedImageRect.height}px`,
      pointerEvents: 'none',
    };

    essentialRectStyles = {};
  }

  const mouseHandler = (type, event) => {
    // console.log(type);
    // console.log(event);
    positionDispatch({
      type,
      payload: {
        clientRect,
        mousePos: getMousePos(event),
      },
    });
  };

  const selectStyles = {
    position: 'absolute',
    left: `${positionState.selectRect.left}px`,
    top: `${positionState.selectRect.top}px`,
    width: `${positionState.selectRect.width}px`,
    height: `${positionState.selectRect.height}px`,
    visibility: positionState.dragging ? 'visible' : 'hidden',
    pointerEvents: 'none',
  };

  return (
    <div className="image-viewer" ref={imageViewerRef}>
      <div className="image-viewer-select" style={selectStyles} />
      {drawImage && (<div
        className="image-viewer-essential-rect"
        style={essentialRectStyles}
      />)}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="image-viewer-overlay"
        onMouseDown={mouseHandler.bind(this, 'mouseDown')}
        onMouseMove={mouseHandler.bind(this, 'mouseMove')}
        onMouseUp={mouseHandler.bind(this, 'mouseUp')}
      />
      {drawImage && (
        <img
          className="image-viewer-image"
          src={imageUrl}
          alt=""
          style={imageStyles}
        />
      )}
    </div>
  );
};

export default ImageViewer;
