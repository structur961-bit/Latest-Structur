import React, { useEffect, useRef, useState } from 'react';
import { Barcode, Camera, Keyboard, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function BarcodeScannerDialog({ open, onOpenChange, onDetected }) {
  const callbacks = useRef({ onDetected, onOpenChange });
  callbacks.current = { onDetected, onOpenChange };
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [manualCode, setManualCode] = useState('');
  const [state, setState] = useState({ loading: false, message: '' });

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ loading: false, message: 'Camera access is unavailable. Use the field below or a USB/Bluetooth scanner.' });
        return;
      }
      if (!('BarcodeDetector' in window)) {
        setState({ loading: false, message: 'Camera barcode detection is not supported by this browser. Chrome or Edge on Android works best; you can still use a hardware scanner below.' });
        return;
      }

      setState({ loading: true, message: 'Starting camera…' });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setState({ loading: false, message: 'Point the camera at a barcode.' });
        const detector = new (/** @type {any} */ (window).BarcodeDetector)({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','codabar','qr_code'] });

        const detect = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const code = results?.[0]?.rawValue?.trim();
            if (code) {
              navigator.vibrate?.(120);
              if (cancelled) return;
              callbacks.current.onDetected(code);
              callbacks.current.onOpenChange(false);
              return;
            }
          } catch {
            // A frame may be unavailable while the camera is warming up.
          }
          timerRef.current = window.setTimeout(detect, 250);
        };
        detect();
      } catch (error) {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (cancelled) return;
        setState({ loading: false, message: error?.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access or use the scanner field below.' : 'The camera could not start. Use the scanner field below.' });
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  const submitManual = event => {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    onDetected(code);
    setManualCode('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Barcode className="h-5 w-5" /> Scan barcode</DialogTitle></DialogHeader>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.25)]" />
          {state.loading && <div className="absolute inset-0 flex items-center justify-center text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {!state.loading && !streamRef.current && <div className="absolute inset-0 flex items-center justify-center"><Camera className="h-10 w-10 text-white/30" /></div>}
        </div>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <form onSubmit={submitManual} className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <label className="flex items-center gap-2 text-sm font-medium"><Keyboard className="h-4 w-4" /> Hardware scanner or manual code</label>
          <div className="flex gap-2"><Input autoFocus value={manualCode} onChange={event => setManualCode(event.target.value)} placeholder="Scan or type the barcode" /><Button type="submit" disabled={!manualCode.trim()}>Use code</Button></div>
          <p className="text-xs text-muted-foreground">Most USB and Bluetooth scanners type the number automatically. Scan, then press Enter.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
