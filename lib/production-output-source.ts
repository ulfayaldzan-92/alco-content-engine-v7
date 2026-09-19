export type ProductionOutputSource =
  | 'none'
  | 'initial_draft'
  | 'stored_output'
  | 'generated_output'
  | 'user_edited_output';

export const isAuthoritativeProductionOutputSource = (
  source: ProductionOutputSource
): boolean => {
  return (
    source === 'stored_output' ||
    source === 'generated_output' ||
    source === 'user_edited_output'
  );
};
