import { useEffect, useRef } from 'react';

export interface StreamingMetrics {
  chunksReceived: number;
  updatesRendered: number;
  averageChunkSize: number;
  droppedFrames: number;
  renderTime: number;
}

export function useStreamingPerformance() {
  const metricsRef = useRef<StreamingMetrics>({
    chunksReceived: 0,
    updatesRendered: 0,
    averageChunkSize: 0,
    droppedFrames: 0,
    renderTime: 0
  });
  
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  
  useEffect(() => {
    let animationFrameId: number;
    
    const checkFrameRate = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      
      // Check if we dropped frames (> 16.67ms for 60fps)
      if (delta > 17) {
        metricsRef.current.droppedFrames++;
      }
      
      lastFrameTimeRef.current = now;
      frameCountRef.current++;
      
      animationFrameId = requestAnimationFrame(checkFrameRate);
    };
    
    animationFrameId = requestAnimationFrame(checkFrameRate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  const recordChunk = (size: number) => {
    const metrics = metricsRef.current;
    metrics.chunksReceived++;
    metrics.averageChunkSize = 
      (metrics.averageChunkSize * (metrics.chunksReceived - 1) + size) / 
      metrics.chunksReceived;
  };
  
  const recordRender = (renderTime: number) => {
    const metrics = metricsRef.current;
    metrics.updatesRendered++;
    metrics.renderTime = 
      (metrics.renderTime * (metrics.updatesRendered - 1) + renderTime) / 
      metrics.updatesRendered;
  };
  
  const getMetrics = () => ({ ...metricsRef.current });
  
  return { recordChunk, recordRender, getMetrics };
}