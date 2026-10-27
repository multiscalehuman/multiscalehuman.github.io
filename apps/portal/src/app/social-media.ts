import { SocialMediaButtonDefinition } from '@atlasng/design-system/buttons/social-media-button';

/** CIFAR social media accounts shown in the footer. The icons come from the AtlasNG built-in classes. */
export const SOCIAL_MEDIA_DEFS: SocialMediaButtonDefinition[] = [
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/CIFARnews', classes: ['facebook'] },
  { id: 'x', label: 'X (formerly Twitter)', url: 'https://x.com/CIFAR_News', classes: ['x'] },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/user/CIFARVideo', classes: ['youtube'] },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/company/cifar', classes: ['linkedin'] },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/cifarnews', classes: ['instagram'] },
];

/** Order of the social media buttons in the footer. */
export const SOCIAL_MEDIA_IDS = SOCIAL_MEDIA_DEFS.map((def) => def.id);
