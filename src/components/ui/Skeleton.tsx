'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Premium Skeleton component for loading states
 * Provides smooth animation for better perceived performance
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
    animation = 'pulse',
}) => {
    const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: '',
        rounded: 'rounded-lg',
    };

    const animationClasses = {
        pulse: 'animate-pulse',
        wave: 'animate-shimmer',
        none: '',
    };

    const style: React.CSSProperties = {
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? '1em' : '100%'),
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
            style={style}
            aria-hidden="true"
        />
    );
};

// Card Skeleton for feature cards
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-white rounded-2xl p-6 border border-gray-100 ${className}`}>
        <Skeleton variant="rounded" width={48} height={48} className="mb-4" />
        <Skeleton variant="text" width="70%" height={20} className="mb-2" />
        <Skeleton variant="text" width="100%" height={14} className="mb-1" />
        <Skeleton variant="text" width="85%" height={14} />
    </div>
);

// Pricing Card Skeleton
export const PricingCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-3xl p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1">
                <Skeleton variant="text" width="60%" height={24} className="mb-2" />
                <Skeleton variant="text" width="80%" height={14} />
            </div>
        </div>
        <Skeleton variant="text" width="50%" height={40} className="mb-6" />
        <div className="space-y-3 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton variant="circular" width={20} height={20} />
                    <Skeleton variant="text" width="85%" height={14} />
                </div>
            ))}
        </div>
        <Skeleton variant="rounded" width="100%" height={48} />
    </div>
);

// Stats Skeleton for hero section
export const StatsSkeleton: React.FC = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/80 rounded-xl p-4 text-center">
                <Skeleton variant="text" width="60%" height={32} className="mx-auto mb-2" />
                <Skeleton variant="text" width="80%" height={14} className="mx-auto" />
            </div>
        ))}
    </div>
);

// Testimonial Skeleton
export const TestimonialSkeleton: React.FC = () => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1">
                <Skeleton variant="text" width="50%" height={16} className="mb-1" />
                <Skeleton variant="text" width="35%" height={12} />
            </div>
        </div>
        <div className="space-y-2">
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="text" width="90%" height={14} />
            <Skeleton variant="text" width="75%" height={14} />
        </div>
    </div>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
    <tr className="border-b border-gray-100">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <Skeleton variant="text" width={i === 0 ? '70%' : '50%'} height={16} />
            </td>
        ))}
    </tr>
);

// Full Page Loading Skeleton
export const PageLoadingSkeleton: React.FC = () => (
    <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-12">
                <Skeleton variant="rounded" width={120} height={32} className="mx-auto mb-4" />
                <Skeleton variant="text" width="60%" height={40} className="mx-auto mb-4" />
                <Skeleton variant="text" width="40%" height={20} className="mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        </div>
    </div>
);

export default Skeleton;
