import { z } from 'zod';
import { strategies, themeIds } from './types';

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

export const customDesignSpec = z.strictObject({
  theme:z.enum(themeIds),
  headline:z.string().trim().min(1).max(150),
  palette:z.tuple([hex,hex,hex,hex]),
  layout:z.enum(strategies),
});
export type CustomDesignSpec = z.infer<typeof customDesignSpec>;

/**
 * Implement on the server when a provider is configured.
 * Callers send theme preferences and dimensions without the user's photos.
 * Validate the response with customDesignSpec before passing it to the layout engine.
 */
export interface CustomDesignProvider {
  propose(input: { prompt:string; graduateCount:number; aspectRatio:number }): Promise<unknown>;
}
