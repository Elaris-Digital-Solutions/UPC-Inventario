
export const getOptimizedImageUrl = (url: string, width: number = 500, brightness: number = 100, contrast: number = 100, crop?: { x: number; y: number; width?: number; height?: number }) => {
  if (!url) return '';

  // Check if it's a Cloudinary URL
  if (url.includes('cloudinary.com')) {
    // If it already has transformations, we might want to replace or append. 
    // For simplicity, let's assume standard upload URL structure.
    // Pattern: /upload/v... or /upload/folder/v...

    // We want to insert transformation after /upload/
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const prefix = url.substring(0, uploadIndex + 8); // include '/upload/'
      const suffix = url.substring(uploadIndex + 8);

      // Calculate Cloudinary values (offset from 100)
      const b = brightness - 100;
      const c = contrast - 100;

      // Build transformations string (separate components with slashes)
      let transforms = '';

      // Add effects first
      if (b !== 0) transforms += `e_brightness:${b}/`;
      if (c !== 0) transforms += `e_contrast:${c}/`;

      // Crop/Position logic
      // Crop/Position logic
      if (crop && crop.width && crop.height) {
        // Use relative crop (percentages 0-100 converted to 0.0-1.0)
        // c_crop with fl_relative takes x,y as Top-Left coordinates
        const x = (crop.x / 100).toFixed(4);
        const y = (crop.y / 100).toFixed(4);
        const w = (crop.width / 100).toFixed(4);
        const h = (crop.height / 100).toFixed(4);

        transforms += `c_crop,fl_relative,x_${x},y_${y},w_${w},h_${h}/`;
      } else if (crop) {
        // Fallback for legacy focus point (center crop)
        // Treat x,y as center. width/height not present.
        // Previous logic used g_xy_center.
        transforms += `c_fill,g_xy_center,x_${(crop.x / 100).toFixed(2)},y_${(crop.y / 100).toFixed(2)},fl_relative/`;
      } else {
        // Default filling/cropping
        transforms += `c_fill,g_auto/`; // defaulting to g_auto if no specific crop
      }

      // Add standard optimizations
      transforms += `w_${width},q_auto,f_auto`;

      return `${prefix}${transforms}/${suffix}`;
    }
  }

  return url;
};

export const getImageSettings = (url: string, product: { brightness?: number; contrast?: number; imageSettings?: Record<string, { brightness: number; contrast: number; crop?: { x: number; y: number; width: number; height: number } }> }) => {
  if (product.imageSettings && product.imageSettings[url]) {
    return product.imageSettings[url];
  }
  return {
    brightness: product.brightness ?? 100,
    contrast: product.contrast ?? 100,
    crop: undefined
  };
};
