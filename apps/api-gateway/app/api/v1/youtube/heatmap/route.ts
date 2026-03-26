import { NextResponse } from 'next/server';
import { gotScraping } from 'got-scraping';

// 6.5 YouTube Video Heatmap Scraper
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { video_id } = await req.json();
    if (!video_id) throw new Error('video_id is required');

    const url = `https://www.youtube.com/watch?v=${video_id}`;
    const response = await gotScraping.get(url, { headerGeneratorOptions: { browsers: ['chrome'] } });

    // YouTube embeds engagement heatmap markers inside the ytInitialPlayerResponse
    const match = response.body.match(/"markerMap":\[(.*?)\]/);
    let heatmapData = null;

    if (match) {
        try {
            const markers = JSON.parse(`[${match[1]}]`);
            // Find the engagement heatmap marker list (usually type 2)
            const engagementList = markers.find((m: any) => m.type === 'MARKER_TYPE_HEATMAP');
            if (engagementList && engagementList.value?.heatMarkers) {
                heatmapData = engagementList.value.heatMarkers.map((hm: any) => ({
                    start_time: hm.timeRangeStartMillis / 1000,
                    end_time: (hm.timeRangeStartMillis + hm.markerDurationMillis) / 1000,
                    intensity_score: hm.heatMarkerIntensityScoreNormalized
                }));
            }
        } catch(e) {}
    }

    if (!heatmapData) throw new Error("Heatmap data not found. Video may not have enough views or engagement.");

    return NextResponse.json({
      success: true,
      data: { video_id, heatmap_data: heatmapData },
      metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },
      error: null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime }, error: error.message }, { status: 400 });
  }
}
