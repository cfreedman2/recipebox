import { pestoSalmonDemo } from '../data/pestoSalmonDemo'

/** @returns {import('./recipes').RecipeRecord[]} */
export function getDemoRecipes() {
  return [
    {
      id: 'demo-pesto-salmon',
      user_id: 'demo-user',
      title: pestoSalmonDemo.title,
      category: pestoSalmonDemo.category,
      subtitle: '',
      servings: pestoSalmonDemo.servings,
      ingredients: pestoSalmonDemo.ingredients,
      steps: pestoSalmonDemo.steps,
      imageSrc: '',
      instructions: pestoSalmonDemo.steps.join('\n'),
      created_at: new Date().toISOString(),
    },
  ]
}
