import { withScrapingHandler, stealthGet } from '@forensic/scraping-core';
import * as cheerio from 'cheerio';

export const POST = withScrapingHandler(async (req: Request) => {
    const { recipe_url } = await req.json();
    if (!recipe_url) throw new Error('recipe_url is required');

    const response = await stealthGet(recipe_url);
    const html = response.body;
    const $ = cheerio.load(html);

    const jsonLdScripts = $('script[type="application/ld+json"]');
    let recipeData: any = null;

    jsonLdScripts.each((_, script) => {
      try {
        const json = JSON.parse($(script).html() || '{}');
        let schemas = Array.isArray(json) ? json : [json];
        for (const schema of schemas) {
           if (schema['@type'] === 'Recipe' || schema['@type']?.includes('Recipe')) {
              recipeData = schema;
              break;
           }
        }
      } catch (e) { }
    });

    if (!recipeData) {
       const title = $('h1').text().trim();
       const ingredients: string[] = [];
       $('[class*="Ingredient"], [data-testid="IngredientList"]').find('li').each((_, el) => {
          ingredients.push($(el).text().trim());
       });

       return {
             source_url: recipe_url,
             name: title,
             ingredients,
             instructions: "Parsed from HTML. JSON-LD missing."
       };
    }

    return {
        source_url: recipe_url,
        name: recipeData.name,
        description: recipeData.description,
        image: Array.isArray(recipeData.image) ? recipeData.image[0] : (recipeData.image?.url || recipeData.image),
        author: recipeData.author ? (Array.isArray(recipeData.author) ? recipeData.author[0].name : recipeData.author.name) : null,
        prep_time: recipeData.prepTime,
        cook_time: recipeData.cookTime,
        total_time: recipeData.totalTime,
        recipe_yield: recipeData.recipeYield,
        ingredients: recipeData.recipeIngredient || [],
        instructions: recipeData.recipeInstructions ? recipeData.recipeInstructions.map((step: any) => step.text || step).filter(Boolean) : []
    };
});
