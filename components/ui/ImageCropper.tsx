'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';

export interface Point {
  x: number;
  y: number;
}

export interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Safely limit the output canvas
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;
  
  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1080;
  
  if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / targetWidth, MAX_HEIGHT / targetHeight);
      targetWidth *= ratio;
      targetHeight *= ratio;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // react-easy-crop's pixelCrop is relative to the *natural* scale. 
  // We draw precisely from natural space -> target space
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    // Compress as JPEG 0.8 quality
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const file = new File([blob], 'cropped-cover.jpg', { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      0.8
    );
  });
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel, aspectRatio = 16 / 9 }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteEvent = useCallback((_croppedArea: Area, croppedAreaPixelsOutput: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsOutput);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedFile) {
        onCropComplete(croppedFile);
      }
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      >
        <div className="relative flex h-full max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-stone-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 p-4">
            <h3 className="text-lg font-semibold text-white">Adjust Cover Photo</h3>
            <button
              onClick={onCancel}
              className="rounded-full bg-stone-800 p-2 text-stone-400 hover:bg-stone-700 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          
          {/* Cropper Workspace */}
          <div className="relative flex-1 bg-stone-950">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteEvent}
              onZoomChange={setZoom}
              objectFit="vertical-cover"
            />
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col gap-4 border-t border-stone-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-4 px-4">
              <span className="text-xs text-stone-400">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-stone-700 accent-amber-500 hover:bg-stone-600"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isProcessing}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Processing...
                  </>
                ) : (
                  'Crop & Upload'
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
