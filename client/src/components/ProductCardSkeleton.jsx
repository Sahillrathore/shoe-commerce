import React from "react";

export default function ProductCardSkeleton({ className = "" }) {
  return (
    <div className={`bg-white rounded-lg p-3 shadow-sm ${className}`}>
      {/* image placeholder */}
      <div className="w-full h-44 sm:h-44 md:h-48 bg-gray-200 rounded-md overflow-hidden mb-3 relative">
        {/* shimmer bar */}
        <div className="absolute inset-0 animate-pulse" />
      </div>

      {/* title lines */}
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3 animate-pulse" />

      {/* price + add button placeholders */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
        <div className="h-8 w-20 rounded-md bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
