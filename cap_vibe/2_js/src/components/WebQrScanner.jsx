import React, { useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';

/**
 * Web QR scanner using jsQR + getUserMedia.
 * Requires HTTPS or localhost. On permission denied or failure, parent should show manual input.
 */
export function WebQrScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const onScanRef = useRef(onScan);

  onScanRef.current = onScan;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (video.readyState !== video.HAVE_ENOUGH_DATA || !ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      stopStream();
      onScanRef.current?.(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopStream]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.('Camera not available');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      tick();
    } catch (err) {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = fallback;
        if (videoRef.current) {
          videoRef.current.srcObject = fallback;
          await videoRef.current.play();
        }
        tick();
      } catch (fallbackErr) {
        onError?.(fallbackErr?.message ?? 'Camera access denied');
      }
    }
  }, [onError, tick]);

  return (
    <div className="space-y-3">
      <button
        onClick={startCamera}
        className="btn-primary w-full"
      >
        Start camera
      </button>
      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[4/3]">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
