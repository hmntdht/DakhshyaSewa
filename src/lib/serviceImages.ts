/**
 * Maps service slugs to their corresponding branded image paths.
 * All images are located in /public/brand/images/.
 * Falls back to undefined so callers can decide how to handle a missing image.
 */
export const SERVICE_IMAGES: Record<string, string> = {
  'house-cleaning':            '/brand/images/Nepali Home Cleaning Scene.png',
  'kitchen-help':              '/brand/images/Warm Kitchen Vegetable Prep.png',
  'birthday-decoration':       '/brand/images/Cozy Birthday Decorating Celebration.png',
  'tuition':                   '/brand/images/Offline and Online Tuition Comparison.png',
  'elderly-companionship':     '/brand/images/Shared Memories on the Sofa.png',
  'child-care-companionship':  '/brand/images/Warm Home Learning with Colourful Blocks.png',
};

/** Returns the image path for a slug, or undefined if not found. */
export function getServiceImage(slug: string): string | undefined {
  return SERVICE_IMAGES[slug];
}
