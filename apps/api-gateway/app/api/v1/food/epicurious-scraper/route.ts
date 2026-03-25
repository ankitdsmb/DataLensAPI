import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';

// 5.5 Epicurious Recipes Scraper
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { recipe_url } = body;

    if (!recipe_url) throw new Error('recipe_url is required');

    const response = await gotScraping.get(recipe_url, {
      headerGeneratorOptions: { browsers: ['chrome'] }
    });

    const html = response.body;
    const $ = cheerio.load(html);

    // Parse JSON-LD metadata for Recipes
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let recipeData: any = null;

    jsonLdScripts.each((_, script) => {
      try {
        const json = JSON.parse($(script).html() || '{}');
        // JSON-LD can be an array of objects or a single object. Find the @type Recipe.
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
       // Fallback logic for HTML parsing
       const title = $('h1').text().trim();
       const ingredients: string[] = [];
       $('[class*="Ingredient"], [data-testid="IngredientList"]').find('li').each((_, el) => {
          ingredients.push($(el).text().trim());
       });

       return NextResponse.json({
          success: true,
          data: {
             source_url: recipe_url,
             name: title,
             ingredients,
             instructions: "Parsed from HTML. JSON-LD missing."
          },
          metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
          error: null
       });
    }

    // Map JSON-LD to desired schema
    return NextResponse.json({
      success: true,
      data: {
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
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      data: null,
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
