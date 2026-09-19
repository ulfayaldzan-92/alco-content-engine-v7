export interface ProductAssetReference {
  id: string;
  name: string;
  kind: 'screenshot' | 'logo' | 'screen_recording';
}

export interface ProductAssetContext {
  product_name: string;
  product_type: string;
  screenshots: ProductAssetReference[];
  feature_focus: string[];
  demo_steps: string[];
  logo_reference?: ProductAssetReference | null;
  screen_recording_reference?: ProductAssetReference | null;
}
