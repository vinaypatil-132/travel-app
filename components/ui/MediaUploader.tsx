'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageCropper } from './ImageCropper';

export interface MediaUploaderProps {
  onUploadSuccess: (url: string, mediaType: 'IMAGE' | 'VIDEO') => Promise<void> | void;
  onUploadError?: (error: Error) => void;
  onUploadComplete?: () => void;
  accept?: 'image/*' | 'video/*' | 'image/*,video/*' | string;
  maxSizeMB?: number;
  className?: string;
  label?: string;
  isCustomizingCover?: boolean; // For styling cover vs gallery differently
  multiple?: boolean;
  cropAspectRatio?: number;
}

export function MediaUploader({ 
  onUploadSuccess, 
  onUploadError,
  onUploadComplete, // Added new prop
  accept = 'image/*,video/*',
  maxSizeMB = 50, // Default generous, validated strictly inside based on type
  className,
  label = "Click or drag to upload media",
  isCustomizingCover = false,
  multiple = false,
  cropAspectRatio
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): Error | null => {
    // 1. Extension / Type Validation
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) return new Error('Invalid file type');
    
    // Explicit allowed types
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideos = ['video/mp4', 'video/webm'];
    
    if (isImage && !allowedImages.includes(file.type)) {
      return new Error('Images must be JPEG, PNG, or WebP');
    }
    
    if (isVideo && !allowedVideos.includes(file.type)) {
      return new Error('Videos must be MP4 or WebM');
    }

    // 2. Size Validation
    const sizeInMB = file.size / (1024 * 1024);
    if (isImage && sizeInMB > 5) return new Error('Images must be 5MB or smaller');
    if (isVideo && sizeInMB > 50) return new Error('Videos must be 50MB or smaller');
    
    return null;
  };

  const handleUpload = async (files: File[]) => {
    setError(null);
    if (!files.length) return;

    // Filter out invalid files first to prevent the whole batch from failing
    const validFiles = files.filter(f => validateFile(f) === null);
    const rejectedCount = files.length - validFiles.length;
    
    if (rejectedCount > 0 && validFiles.length === 0) {
      setError(`All ${rejectedCount} files were rejected due to size or type.`);
      return;
    }

    setIsUploading(true);
    setUploadStats({ current: 1, total: validFiles.length });
    setProgress(0);

    let hasErrors = false;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadStats({ current: i + 1, total: validFiles.length });
      setProgress(10);

      try {
        // 1. Get Signed URL from B2 API via GET
        const res = await fetch(`/api/upload/signed-url?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`);

        if (!res.ok) {
          throw new Error('Failed to get upload signature from server');
        }

        const { url: uploadUrl, key } = await res.json();
        setProgress(30);

        // 2. Direct fetch upload to B2 via S3 compatible PUT
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file
        });
        
        setProgress(90);

        if (!uploadRes.ok) {
          throw new Error(`Cloud storage rejected the file: HTTP ${uploadRes.status}`);
        }

        setProgress(100);
        
        const mediaTypeLiteral = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        const proxyUrl = `/api/media/${key}`; 
        
        // Wait for parent component database insertions to finish sequentially
        await onUploadSuccess(proxyUrl, mediaTypeLiteral);
        
      } catch (err: unknown) {
        hasErrors = true;
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Upload Error:', err);
        if (onUploadError) onUploadError(err instanceof Error ? err : new Error(errorMessage));
      }
    }

    if (rejectedCount > 0) {
      setError(`${rejectedCount} files skipped due to size or type limits.`);
    } else if (hasErrors) {
      setError("Some files failed to upload.");
    }

    // Reset after a tiny delay for UX
    setTimeout(() => {
      setIsUploading(false);
      setProgress(0);
      setUploadStats({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUploadComplete) onUploadComplete();
    }, 800);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelection = (files: File[]) => {
    if (!files.length) return;

    // If a crop ratio is provided and it's a single image, intercept the upload logic
    if (cropAspectRatio && files.length === 1 && files[0].type.startsWith('image/')) {
      const file = files[0];
      const valid = validateFile(file);
      if (valid !== null) {
        setError(valid.message);
        return;
      }
      setPendingCropFile(file);
      setCropImageSrc(URL.createObjectURL(file));
      return;
    }

    // Otherwise, proceed as usual to batch uploading
    handleUpload(files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(Array.from(e.dataTransfer.files));
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(Array.from(e.target.files));
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setCropImageSrc(null);
    setPendingCropFile(null);
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc); // Cleanup
    handleUpload([croppedFile]);
  };

  const handleCropCancel = () => {
    setCropImageSrc(null);
    setPendingCropFile(null);
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      {cropImageSrc && cropAspectRatio && (
        <ImageCropper
          imageSrc={cropImageSrc}
          aspectRatio={cropAspectRatio}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
      <div 
        className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
        isDragging ? "border-amber-500 bg-amber-50" : "border-stone-300 bg-stone-50 hover:bg-stone-100",
        isCustomizingCover ? "h-40 w-full" : "aspect-video w-full max-w-sm",
        className
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        accept={accept} 
        className="hidden" 
        disabled={isUploading}
        multiple={multiple}
      />
      
      <AnimatePresence mode="wait">
        {isUploading ? (
          <motion.div 
            key="uploading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-amber-500" />
            <p className="text-sm font-medium text-stone-600">
              {uploadStats.total > 1 ? `Uploading ${uploadStats.current} of ${uploadStats.total}...` : 'Uploading...'} {progress}%
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center p-4 text-center"
          >
            <div className="mb-2 rounded-full bg-stone-200 p-3 text-stone-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <p className="text-sm font-medium text-stone-700">{label}</p>
            <p className="mt-1 text-xs text-stone-500">
              {accept.includes('video') ? 'JPEG, PNG, WEBP (≤5MB) or MP4, WEBM (≤50MB)' : 'JPEG, PNG, WEBP (≤5MB)'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
