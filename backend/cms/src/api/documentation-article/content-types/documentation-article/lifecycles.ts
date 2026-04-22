/**
 * Lifecycle hook: valida que la categoría asignada a un artículo
 * pertenezca al mismo documentation_space que el artículo.
 *
 * Previene inconsistencias de datos desde el Admin Panel, tanto al crear
 * como al editar parcialmente (solo category o solo documentation_space).
 */

type StrapiDoc = Record<string, any>;

/** Extrae el documentId de un campo de relación tal como lo envía el Admin Panel de Strapi v5 */
function extractDocumentId(ref: any): string | null {
  if (!ref) return null;
  // Formato de Admin Panel: { connect: [{ id: 'documentId' }] }
  return ref?.connect?.[0]?.id ?? ref?.set?.[0]?.id ?? ref?.documentId ?? ref?.id ?? null;
}

/**
 * Resuelve el documentId del documentation_space de una categoría dado su documentId.
 * Retorna null si la categoría no tiene espacio asignado.
 */
async function resolveSpaceOfCategory(
  categoryDocumentId: string,
  strapi: any
): Promise<string | null> {
  const category = await strapi
    .documents('api::documentation-category.documentation-category')
    .findOne({ documentId: categoryDocumentId, populate: ['documentation_space'] });

  return category?.documentation_space?.documentId ?? null;
}

async function validate(
  categoryRef: any,
  spaceRef: any,
  articleDocumentId: string | undefined,
  strapi: any
): Promise<void> {
  let categoryDocumentId = extractDocumentId(categoryRef);
  let spaceDocumentId = extractDocumentId(spaceRef);

  // Si falta alguno de los dos, intentar completarlo desde el artículo actual
  if ((!categoryDocumentId || !spaceDocumentId) && articleDocumentId) {
    const current: StrapiDoc = await strapi
      .documents('api::documentation-article.documentation-article')
      .findOne({
        documentId: articleDocumentId,
        populate: ['category', 'documentation_space'],
      });

    if (!categoryDocumentId) {
      categoryDocumentId = current?.category?.documentId ?? null;
    }
    if (!spaceDocumentId) {
      spaceDocumentId = current?.documentation_space?.documentId ?? null;
    }
  }

  // Sin los dos valores no hay nada que comparar
  if (!categoryDocumentId || !spaceDocumentId) return;

  const categorySpaceDocumentId = await resolveSpaceOfCategory(categoryDocumentId, strapi);

  if (categorySpaceDocumentId === null) return; // categoría sin espacio asignado todavía

  if (categorySpaceDocumentId !== spaceDocumentId) {
    throw new Error(
      'La categoría seleccionada no pertenece al mismo espacio de documentación que el artículo.'
    );
  }
}

export default {
  async beforeCreate(event: { params: { data: StrapiDoc } }) {
    const strapi = (global as any).strapi;
    const { data } = event.params;
    await validate(data.category, data.documentation_space, undefined, strapi);
  },

  async beforeUpdate(event: { params: { data: StrapiDoc; where: { documentId?: string } } }) {
    const strapi = (global as any).strapi;
    const { data, where } = event.params;

    // Solo activar si se toca category o documentation_space
    if (!data.category && !data.documentation_space) return;

    await validate(data.category, data.documentation_space, where?.documentId, strapi);
  },
};
