'use client';

import { useEffect, useRef } from 'react';

interface Point {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export default function NeuralBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);
        const points: Point[] = [];
        const numPoints = Math.min(Math.floor((width * height) / 25000), 60); // Reduced density for cleaner look
        const connectionDistance = 250; // Longer connections
        const mouse = { x: 0, y: 0 };

        // Initialize points
        for (let i = 0; i < numPoints; i++) {
            points.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3, // Slower, more majestic drift
                vy: (Math.random() - 0.5) * 0.3,
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Update and draw points
            points.forEach((point, i) => {
                // Move
                point.x += point.vx;
                point.y += point.vy;

                // Bounce off edges
                if (point.x < 0 || point.x > width) point.vx *= -1;
                if (point.y < 0 || point.y > height) point.vy *= -1;

                // Mouse interaction (gentle repulsion)
                const dx = mouse.x - point.x;
                const dy = mouse.y - point.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 300) { // Larger interaction radius
                    point.x -= dx * 0.005;
                    point.y -= dy * 0.005;
                }

                // Draw node
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2); // Larger nodes (2 -> 4)
                ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
                ctx.fill();

                // Connect
                for (let j = i + 1; j < points.length; j++) {
                    const p2 = points[j];
                    const dx = point.x - p2.x;
                    const dy = point.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.6 * (1 - dist / connectionDistance)})`; // Slightly more opaque lines
                        ctx.lineWidth = 1; // Thicker lines
                        ctx.moveTo(point.x, point.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(animate);
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };


        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        const animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0"
        />
    );
}
