import { NextResponse } from 'next/server';

// 5.8 Power Data Transformer
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { dataset, operations = [] } = await req.json();
    if (!dataset || !Array.isArray(dataset)) throw new Error('Valid dataset array is required');

    let processedData = [...dataset];

    // Simple implementation of data transformation pipeline (in memory instead of pandas/duckdb for the lite version)
    for (const op of operations) {
        if (op === 'trim') {
            processedData = processedData.map((row: any) => {
                const newRow = { ...row };
                Object.keys(newRow).forEach(key => {
                    if (typeof newRow[key] === 'string') newRow[key] = newRow[key].trim();
                });
                return newRow;
            });
        }
        else if (op === 'deduplicate') {
            // Very naive deduplication via JSON stringify
            const seen = new Set();
            processedData = processedData.filter((row: any) => {
                const key = JSON.stringify(row);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
    }

    return NextResponse.json({
      success: true,
      data: {
        original_count: dataset.length,
        processed_count: processedData.length,
        processed_dataset: processedData
      },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
