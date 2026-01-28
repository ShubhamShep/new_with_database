import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * CameraCapture Component
 * Provides camera access for taking photos or selecting from gallery
 * Includes image preview, compression, and retake functionality
 */
const CameraCapture = ({
    label = 'Photo',
    onCapture,
    currentPhoto = null,
    required = false,
    maxSizeMB = 1
}) => {
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('environment'); // 'user' for front camera
    const [isLoading, setIsLoading] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // Set initial preview from currentPhoto
    useEffect(() => {
        if (currentPhoto && !previewUrl) {
            if (typeof currentPhoto === 'string') {
                setPreviewUrl(currentPhoto);
            } else if (currentPhoto instanceof File) {
                setPreviewUrl(URL.createObjectURL(currentPhoto));
            }
        }
    }, [currentPhoto, previewUrl]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [stream, previewUrl]);

    /**
     * Start camera stream
     */
    const startCamera = async () => {
        setError(null);
        setIsLoading(true);

        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            setShowCamera(true);
        } catch (err) {
            console.error('Camera error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Camera permission denied. Please allow camera access.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device.');
            } else {
                setError('Failed to access camera. Try selecting from gallery instead.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Stop camera stream
     */
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    }, [stream]);

    /**
     * Switch between front and back camera
     */
    const switchCamera = async () => {
        stopCamera();
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        setTimeout(() => startCamera(), 100);
    };

    /**
     * Compress image to reduce file size
     */
    const compressImage = (canvas, targetSizeMB) => {
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Reduce quality until under target size
        while (dataUrl.length > targetSizeMB * 1024 * 1024 * 1.37 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        return dataUrl;
    };

    /**
     * Convert data URL to File object
     */
    const dataURLtoFile = (dataUrl, filename) => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    /**
     * Capture photo from video stream
     */
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0);

        // Compress and convert to file
        const dataUrl = compressImage(canvas, maxSizeMB);
        const file = dataURLtoFile(dataUrl, `photo_${Date.now()}.jpg`);

        setCapturedImage(file);
        setPreviewUrl(dataUrl);
        stopCamera();

        if (onCapture) {
            onCapture(file);
        }
    };

    /**
     * Handle file selection from gallery
     */
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);

        try {
            // Create image element to load the file
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.onload = () => {
                    // Compress if needed
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d');

                    // Scale down if too large
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 1920;

                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height / width) * maxDimension;
                            width = maxDimension;
                        } else {
                            width = (width / height) * maxDimension;
                            height = maxDimension;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = compressImage(canvas, maxSizeMB);
                    const compressedFile = dataURLtoFile(dataUrl, file.name);

                    setCapturedImage(compressedFile);
                    setPreviewUrl(dataUrl);
                    setIsLoading(false);

                    if (onCapture) {
                        onCapture(compressedFile);
                    }
                };
                img.src = e.target.result;
            };

            reader.readAsDataURL(file);
        } catch (err) {
            console.error('File processing error:', err);
            setError('Failed to process image');
            setIsLoading(false);
        }
    };

    /**
     * Clear captured photo
     */
    const clearPhoto = () => {
        setCapturedImage(null);
        setPreviewUrl(null);
        if (onCapture) {
            onCapture(null);
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
                {label} {required && '*'}
            </label>

            {/* Hidden canvas for image processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-[2000] flex flex-col">
                    {/* Camera Header */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                        <button
                            onClick={stopCamera}
                            className="text-white text-2xl font-light p-2"
                        >
                            ✕
                        </button>
                        <span className="text-white font-medium">{label}</span>
                        <button
                            onClick={switchCamera}
                            className="text-white p-2"
                            title="Switch Camera"
                        >
                            🔄
                        </button>
                    </div>

                    {/* Video Preview */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="flex-1 w-full object-cover"
                    />

                    {/* Capture Button */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-black/70 to-transparent">
                        <button
                            onClick={capturePhoto}
                            className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                        >
                            <div className="w-16 h-16 bg-white rounded-full border-4 border-gray-400" />
                        </button>
                    </div>
                </div>
            )}

            {/* Preview or Capture Buttons */}
            {previewUrl ? (
                <div className="relative">
                    {/* Image Preview */}
                    <img
                        src={previewUrl}
                        alt="Captured"
                        className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                    />

                    {/* Preview Actions */}
                    <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                            type="button"
                            onClick={clearPhoto}
                            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg hover:bg-red-600 transition-colors"
                        >
                            🗑️ Remove
                        </button>
                        <button
                            type="button"
                            onClick={startCamera}
                            className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg hover:bg-blue-600 transition-colors"
                        >
                            📷 Retake
                        </button>
                    </div>

                    {/* Success indicator */}
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        ✓ Photo captured
                    </div>
                </div>
            ) : (
                <div className="flex gap-3">
                    {/* Take Photo Button */}
                    <button
                        type="button"
                        onClick={startCamera}
                        disabled={isLoading}
                        className="flex-1 py-4 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-md hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span className="animate-spin">⏳</span>
                        ) : (
                            <>
                                <span className="text-xl">📷</span>
                                <span>Take Photo</span>
                            </>
                        )}
                    </button>

                    {/* Choose from Gallery Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="flex-1 py-4 px-4 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium shadow-md hover:from-gray-200 hover:to-gray-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <span className="text-xl">🖼️</span>
                        <span>Gallery</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default CameraCapture;
