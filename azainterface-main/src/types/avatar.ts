export type AvatarBaseColor = 'pink' | 'gold' | 'blue' | 'lavender' | 'mint';

export type AvatarAccessory = 'none' | 'crown' | 'aviator' | 'glasses' | 'partyhat' | 'flowers';

export interface AvatarConfig {
  baseColor: AvatarBaseColor;
  accessory: AvatarAccessory;
  background: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  baseColor: 'pink',
  accessory: 'none',
  background: '#FFD1DC',
};

export interface AvatarItem {
  id: string;
  label: string;
  preview: string; // image src or color
  requiredXp?: number;
  requiredLevel?: string;
}
