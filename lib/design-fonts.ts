export const designFonts = {
  serif:'Playfair Display Variable',
  display:'Anton',
  studio:'Plus Jakarta Sans Variable',
  geometric:'Space Grotesk Variable',
};
let loading: Promise<unknown> | undefined;
export function loadDesignFonts() {
  return loading ??= Promise.all([
    document.fonts.load(`900 48px "${designFonts.serif}"`),
    document.fonts.load(`400 48px "${designFonts.display}"`),
    document.fonts.load(`850 48px "${designFonts.studio}"`),
    document.fonts.load(`700 48px "${designFonts.geometric}"`),
  ]).catch(() => { loading = undefined; });
}
