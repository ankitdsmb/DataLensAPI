import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// 3.7 Bank Routing Number Lookup

export const POST = withScrapingHandler(async (req: Request) => {

    const { routing_number } = await req.json();
    if (!routing_number || routing_number.length !== 9) throw new Error('Valid 9-digit routing_number is required');

    // Fetch routing info from public registry or routingnumber.aba.com equivalent
    // Using a known public directory for demonstration
    const url = `https://www.usbanklocations.com/routing-number-${routing_number}.html`;
    const response = await stealthGet(url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    if (response.statusCode === 404) throw new Error("Routing number not found");

    const $ = cheerio.load(response.body);

    // Parse table data
    let bankName = null;
    let bankAddress = null;
    let bankCity = null;
    let bankState = null;
    let bankZip = null;

    $('table tr').each((_, element) => {
        const rowText = $(element).text().toLowerCase();
        if (rowText.includes('bank name:')) {
            bankName = $(element).find('td').last().text().trim();
        }
        if (rowText.includes('address:')) {
            bankAddress = $(element).find('td').last().text().trim();
        }
        if (rowText.includes('city:')) {
            bankCity = $(element).find('td').last().text().trim();
        }
        if (rowText.includes('state:')) {
            bankState = $(element).find('td').last().text().trim();
        }
        if (rowText.includes('zip code:')) {
            bankZip = $(element).find('td').last().text().trim();
        }
    });

    if (!bankName) throw new Error("Could not extract bank data. Structure changed.");

    return {
        routing_number,
        bank: bankName,
        address: bankAddress,
        city: bankCity,
        state: bankState,
        zip: bankZip
      };


});
