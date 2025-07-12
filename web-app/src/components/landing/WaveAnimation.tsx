'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function WaveAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const mainGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // Transparent background
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 5, 5);
    const pointLight = new THREE.PointLight(0xffffff, 0.4);
    pointLight.position.set(-5, 3, -5);
    
    scene.add(ambientLight);
    scene.add(directionalLight);
    scene.add(pointLight);

    // Create main group
    const mainGroup = new THREE.Group();
    mainGroupRef.current = mainGroup;
    scene.add(mainGroup);

    // Wave creation functions
    const createWaveSources = (time: number, scale: number) => {
      const sources = [];
      const count = 5;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = scale * (1 + Math.sin(angle * 3) * 0.2);
        
        sources.push({
          position: [
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          ],
          frequency: 2 + Math.sin(angle * 2),
          amplitude: 0.3 + Math.cos(angle) * 0.1,
          phase: time * 3 + angle
        });
      }

      sources.push({
        position: [0, 0, 0],
        frequency: 3,
        amplitude: 0.4,
        phase: time * 4
      });

      return sources;
    };

    const createInterferenceField = (sources: any[], size: number, resolution: number, time: number) => {
      const step = size / resolution;
      const heightMap: number[][] = [];

      for (let i = 0; i <= resolution; i++) {
        heightMap[i] = [];
        const x = (i * step) - (size / 2);
        
        for (let j = 0; j <= resolution; j++) {
          const z = (j * step) - (size / 2);
          let height = 0;
          
          sources.forEach(({ position: [sx, , sz], frequency, amplitude, phase }) => {
            const dx = x - sx;
            const dz = z - sz;
            const distance = Math.sqrt(dx * dx + dz * dz);
            height += Math.sin(distance * frequency - time * 5 + phase) * 
                     amplitude * Math.exp(-distance * 0.3);
          });
          
          heightMap[i][j] = height;
        }
      }

      const linesMaterial = new THREE.LineBasicMaterial({
        color: 0x4361ee, // Blue color matching the site theme
        transparent: true,
        opacity: 0.4
      });

      const linesGroup = new THREE.Group();

      // Create grid lines
      for (let i = 0; i <= resolution; i++) {
        const geometry = new THREE.BufferGeometry();
        const points = [];
        const x = (i * step) - (size / 2);
        
        for (let j = 0; j <= resolution; j++) {
          const z = (j * step) - (size / 2);
          points.push(x, heightMap[i][j], z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const line = new THREE.Line(geometry, linesMaterial);
        linesGroup.add(line);
      }

      for (let j = 0; j <= resolution; j++) {
        const geometry = new THREE.BufferGeometry();
        const points = [];
        const z = (j * step) - (size / 2);
        
        for (let i = 0; i <= resolution; i++) {
          const x = (i * step) - (size / 2);
          points.push(x, heightMap[i][j], z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const line = new THREE.Line(geometry, linesMaterial);
        linesGroup.add(line);
      }

      // Add cross-hatching
      for (let i = 1; i < resolution; i++) {
        for (let j = 1; j < resolution; j++) {
          const x = (i * step) - (size / 2);
          const z = (j * step) - (size / 2);
          const height = heightMap[i][j];
          
          const heightDiff = Math.abs(
            height - (heightMap[i-1][j] + heightMap[i+1][j] + 
                     heightMap[i][j-1] + heightMap[i][j+1]) / 4
          );
          
          if (heightDiff > 0.2) {
            const geometry1 = new THREE.BufferGeometry();
            const points1 = [
              x - step/2, height, z - step/2,
              x + step/2, height, z + step/2
            ];
            geometry1.setAttribute('position', new THREE.Float32BufferAttribute(points1, 3));
            linesGroup.add(new THREE.Line(geometry1, linesMaterial));

            const geometry2 = new THREE.BufferGeometry();
            const points2 = [
              x - step/2, height, z + step/2,
              x + step/2, height, z - step/2
            ];
            geometry2.setAttribute('position', new THREE.Float32BufferAttribute(points2, 3));
            linesGroup.add(new THREE.Line(geometry2, linesMaterial));
          }
        }
      }

      return linesGroup;
    };

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.0013;

      // Clear previous geometry
      mainGroup.children.forEach(child => {
        if (child instanceof THREE.Group) {
          child.children.forEach(line => {
            if (line instanceof THREE.Line) {
              line.geometry.dispose();
              if (line.material instanceof THREE.Material) {
                line.material.dispose();
              }
            }
          });
          mainGroup.remove(child);
        }
      });

      // Create three interference fields
      const sources1 = createWaveSources(timeRef.current, 1.5);
      const field1 = createInterferenceField(sources1, 6, 32, timeRef.current);
      mainGroup.add(field1);

      const sources2 = createWaveSources(timeRef.current + 0.33, 0.8);
      const field2 = createInterferenceField(sources2, 3.2, 32, timeRef.current + 0.33);
      field2.position.set(0, 1.5, 0);
      field2.rotation.set(Math.PI/6, 0, Math.PI/4);
      mainGroup.add(field2);

      const sources3 = createWaveSources(timeRef.current + 0.66, 0.8);
      const field3 = createInterferenceField(sources3, 3.2, 32, timeRef.current + 0.66);
      field3.position.set(0, -1.5, 0);
      field3.rotation.set(-Math.PI/6, 0, -Math.PI/4);
      mainGroup.add(field3);

      // Animate main group rotation
      mainGroup.rotation.y = Math.sin(timeRef.current * 0.3) * 0.2;
      mainGroup.rotation.x = Math.cos(timeRef.current * 0.2) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ minHeight: '500px' }}
    />
  );
}