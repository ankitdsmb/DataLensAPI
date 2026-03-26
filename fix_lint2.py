import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue: the previous script replaced `return NextResponse.json({` with `return {;`
    # if `data:` was on the next line.
    # We will do a full manual restore from git for those specific files, and write a safer AST-like regex or manual replacement.
    pass

# We will just fix the syntax errors manually since there are only 3 files.
def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        content = content.replace("return {;", "return {")
        content = content.replace("}, { status: 400 });", "")
        content = content.replace("metadata: { timestamp: new Date().toISOString(), execution_time_ms: Date.now() - startTime },", "")
        content = content.replace("error: null", "")
        content = content.replace("success: true,", "")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file("/app/apps/api-gateway/app/api/v1/ai/bing-copilot-advanced/route.ts")
fix_file("/app/apps/api-gateway/app/api/v1/food/epicurious-scraper/route.ts")
fix_file("/app/apps/api-gateway/app/api/v1/9gag/downloader/route.ts")
