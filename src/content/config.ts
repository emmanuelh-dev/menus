import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		// A quién le habla el artículo. `negocio` es contenido para el dueño del
		// restaurante —a quien le vendemos—; `directorio` son las guías para
		// quien busca dónde comer o dormir, que traen tráfico pero no compran.
		// Sin esto la portada no puede hablarle a uno sin confundir al otro.
		audiencia: z.enum(['negocio', 'directorio']).default('negocio'),
	}),
});

export const collections = { blog };
