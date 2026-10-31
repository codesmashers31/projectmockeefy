// client/src/components/ImageCropperModal.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Check,
  X,
  User,
  RefreshCw,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  fileName?: string;
  title?: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
}

const CROP_BOX_SIZE = 250; // Size of the square crop area in pixels
const OUTPUT_SIZE = 600;   // Output 600x600 avatar for crystal clear resolution

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  fileName = 'profile_photo.jpg',
  title = 'Adjust & Crop Profile Photo',
  onClose,
  onCropComplete
}) => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Transform states
  // position { x, y } represents the offset of the image center relative to the crop box center (0, 0)
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.5);
  const [maxScale, setMaxScale] = useState(3.5);
  const [coverScale, setCoverScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Image and initialize positioning
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    setLoading(true);
    setLoadError(null);

    const img = new Image();
    // Allow crossOrigin for remote URLs to avoid canvas taint
    if (imageSrc.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      setImageElement(img);
      const nw = img.naturalWidth || 400;
      const nh = img.naturalHeight || 400;

      // Scale calculations:
      // cover: image fills the entire crop box
      // fit: image fits inside crop box (allows seeing entire wide banner)
      const cScale = Math.max(CROP_BOX_SIZE / nw, CROP_BOX_SIZE / nh);
      const fScale = Math.min(CROP_BOX_SIZE / nw, CROP_BOX_SIZE / nh);

      setCoverScale(cScale);
      const calculatedMin = Math.min(fScale * 0.9, cScale * 0.5);
      const calculatedMax = Math.max(cScale * 3.5, 2.5);

      setMinScale(calculatedMin);
      setMaxScale(calculatedMax);
      setScale(cScale);

      // Default positioning:
      // If portrait (height > width), anchor towards top so head/hair is fully visible
      const renderedH = nh * cScale;
      const defaultY = nh > nw ? Math.max(0, (renderedH - CROP_BOX_SIZE) / 2 - 20) : 0;

      setPosition({ x: 0, y: defaultY });
      setRotation(0);
      setLoading(false);
    };

    img.onerror = () => {
      setLoadError('Failed to load image. Please select a valid photo file.');
      setLoading(false);
    };

    img.src = imageSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isOpen, imageSrc]);

  // Pointer dragging handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imageElement) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  // Zoom control
  const handleZoomSlider = (newScale: number) => {
    const clamped = Math.max(minScale, Math.min(maxScale, newScale));
    setScale(clamped);
  };

  const handleStepZoom = (delta: number) => {
    handleZoomSlider(scale + delta * ((maxScale - minScale) / 15));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    handleZoomSlider(scale * (1 + delta));
  };

  // Presets
  const handleAlignTop = () => {
    if (!imageElement) return;
    const renderedH = imageElement.naturalHeight * scale;
    // Align top of image with top of crop box
    setPosition({
      x: position.x,
      y: (renderedH - CROP_BOX_SIZE) / 2
    });
  };

  const handleAlignCenter = () => {
    setPosition({ x: 0, y: 0 });
  };

  const handleFitWhole = () => {
    if (!imageElement) return;
    const fScale = Math.min(CROP_BOX_SIZE / imageElement.naturalWidth, CROP_BOX_SIZE / imageElement.naturalHeight);
    setScale(fScale);
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    if (!imageElement) return;
    setScale(coverScale);
    setRotation(0);
    const nh = imageElement.naturalHeight;
    const nw = imageElement.naturalWidth;
    const renderedH = nh * coverScale;
    const defaultY = nh > nw ? Math.max(0, (renderedH - CROP_BOX_SIZE) / 2 - 20) : 0;
    setPosition({ x: 0, y: defaultY });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Export cropped avatar via HTML5 Canvas
  const handleSaveCrop = useCallback(() => {
    if (!imageElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Canvas center
    const center = OUTPUT_SIZE / 2;
    const scaleFactor = OUTPUT_SIZE / CROP_BOX_SIZE;

    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate dimensions on canvas
    const drawW = imageElement.naturalWidth * scale * scaleFactor;
    const drawH = imageElement.naturalHeight * scale * scaleFactor;
    const drawX = position.x * scaleFactor - drawW / 2;
    const drawY = position.y * scaleFactor - drawH / 2;

    ctx.drawImage(imageElement, drawX, drawY, drawW, drawH);

    // Convert canvas to JPEG blob / file
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], fileName.replace(/\.[^/.]+$/, '') + '.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        const previewUrl = URL.createObjectURL(blob);
        onCropComplete(croppedFile, previewUrl);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  }, [imageElement, scale, position, rotation, fileName, onCropComplete, onClose]);

  if (!isOpen) return null;

  // Zoom percentage display relative to cover scale
  const zoomPercent = Math.round((scale / (coverScale || 1)) * 100);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0755E8] flex items-center justify-center border border-blue-200/60 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-xs text-slate-500 font-medium">
                The full image is kept safely. Drag to frame your head and avatar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Staging Canvas */}
        <div className="p-4 sm:p-6 flex flex-col items-center bg-slate-900/5 select-none">
          {loading ? (
            <div className="w-full h-[320px] rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-300">Loading full photo...</span>
            </div>
          ) : loadError ? (
            <div className="w-full h-[320px] rounded-2xl bg-red-50 border border-red-200 flex flex-col items-center justify-center text-red-600 p-4 text-center">
              <span className="text-xs font-bold">{loadError}</span>
              <button
                onClick={onClose}
                className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-3">
              {/* Full Staging Canvas where entire photo is visible */}
              <div
                ref={containerRef}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-full h-[300px] sm:h-[340px] rounded-2xl overflow-hidden bg-slate-950 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
              >
                {/* 1. Underlying Full Image (Visible across entire canvas) */}
                {imageElement && (
                  <img
                    src={imageElement.src}
                    alt="Full source photo"
                    draggable={false}
                    className="absolute pointer-events-none max-w-none origin-center"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: `${imageElement.naturalWidth * scale}px`,
                      height: `${imageElement.naturalHeight * scale}px`,
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg)`
                    }}
                  />
                )}

                {/* 2. Active Crop Window Overlay (Dims the outside, keeps crop area bright) */}
                <div
                  className="absolute pointer-events-none rounded-xl"
                  style={{
                    width: CROP_BOX_SIZE,
                    height: CROP_BOX_SIZE,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 9999px rgba(10, 15, 30, 0.65)'
                  }}
                >
                  {/* Subtle border around crop box */}
                  <div className="absolute inset-0 rounded-xl border border-white/50" />

                  {/* 4 Distinct Corner Framing Brackets (Like camera/focus view) */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-md shadow-xs" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-md shadow-xs" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-md shadow-xs" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-md shadow-xs" />

                  {/* Rule of Thirds Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>

                  {/* Circular Avatar Guide Ring */}
                  <div className="absolute inset-1.5 rounded-full border border-dashed border-white/30 pointer-events-none" />

                  {/* Move hint pill */}
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-white/10 pointer-events-none whitespace-nowrap">
                    <Move className="w-3 h-3 text-blue-400" />
                    <span>Drag photo to align</span>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                <button
                  type="button"
                  onClick={handleAlignTop}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-[#0755E8] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Align head to top of frame to prevent cutting hair"
                >
                  <User className="w-3.5 h-3.5 text-[#0755E8]" />
                  <span>Fit Head (Top)</span>
                </button>
                <button
                  type="button"
                  onClick={handleAlignCenter}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-[#0755E8] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Center photo in frame"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={handleFitWhole}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-[#0755E8] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Fit whole image inside crop box"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fit All</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-[#0755E8] text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rotate</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Reset alignment"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Zoom Slider and Live Preview */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <button
              type="button"
              onClick={() => handleStepZoom(-1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer active:scale-95"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={minScale}
              max={maxScale}
              step={(maxScale - minScale) / 100}
              value={scale}
              onChange={(e) => handleZoomSlider(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0755E8]"
            />
            <button
              type="button"
              onClick={() => handleStepZoom(1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer active:scale-95"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-600 w-12 text-right">
              {zoomPercent}%
            </span>
          </div>

          {/* Mini Live Preview Avatar */}
          <div className="flex items-center gap-2.5 shrink-0 pl-2 sm:border-l sm:border-slate-100">
            <div className="text-[11px] text-slate-400 font-semibold text-right leading-tight">
              Avatar
              <br />
              Preview
            </div>
            {/* 44x44 Avatar Badge matching Mockeefy header */}
            <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200 bg-slate-900 relative">
              {imageElement && (
                <img
                  src={imageElement.src}
                  alt="Avatar preview"
                  className="absolute pointer-events-none max-w-none origin-center"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: `${imageElement.naturalWidth * scale * (44 / CROP_BOX_SIZE)}px`,
                    height: `${imageElement.naturalHeight * scale * (44 / CROP_BOX_SIZE)}px`,
                    transform: `translate(calc(-50% + ${position.x * (44 / CROP_BOX_SIZE)}px), calc(-50% + ${position.y * (44 / CROP_BOX_SIZE)}px)) rotate(${rotation}deg)`
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={loading || !!loadError}
            className="px-5 py-2.5 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply & Save Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
