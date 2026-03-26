import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'withScrapingHandler' in content:
        return False

    print(f"Refactoring: {filepath}")

    # Inject import
    if "import { withScrapingHandler } from '@forensic/scraping-core';" not in content:
        content = "import { withScrapingHandler, stealthGet, stealthMobileGet } from '@forensic/scraping-core';\n" + content

    # Replace old import
    content = re.sub(r"import\s*{\s*gotScraping\s*}\s*from\s*'got-scraping'\s*;\s*", "", content)

    # Find the POST function
    post_match = re.search(r"export\s+async\s+function\s+POST\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*Request\s*\)\s*{", content)
    if not post_match:
        print(f"Skipping {filepath} (No POST export)")
        return False

    req_arg = post_match.group(1)

    # Find try block. We just look for everything between `try {` and `} catch`
    # Note: Regex might fail if there are nested try/catch blocks. We do a simpler string split approach.
    try_index = content.find("try {", post_match.end())
    catch_index = content.rfind("} catch")

    if try_index == -1 or catch_index == -1:
        print(f"Skipping {filepath} (Cannot find try/catch bounds)")
        return False

    try_body = content[try_index + 5 : catch_index]

    # Clean up try body
    try_body = re.sub(r"const\s+startTime\s*=\s*Date\.now\(\)\s*;", "", try_body)

    # Replace gotScraping.get
    try_body = re.sub(r"gotScraping\.get", "stealthGet", try_body)

    # Re-map the NextResponse.json to just return the data payload
    # Finding `return NextResponse.json({ ... data: X, metadata: ... })`
    res_match = re.search(r"return\s+NextResponse\.json\s*\(\s*{\s*success:\s*true,\s*data:\s*(.*?),\s*metadata:", try_body, re.DOTALL)
    if res_match:
        data_expr = res_match.group(1).strip()
        # Find the end of the return statement
        return_start = try_body.rfind("return NextResponse.json")
        return_end = try_body.find(");", return_start)
        if return_start != -1 and return_end != -1:
            try_body = try_body[:return_start] + f"return {data_expr};\n" + try_body[return_end+2:]
    else:
        print(f"Could not auto-extract data payload for {filepath}")
        return False

    new_post_func = f"""
export const POST = withScrapingHandler(async ({req_arg}: Request) => {{
{try_body}
}});
"""

    # Replace old POST with new POST
    content = content[:post_match.start()] + new_post_func

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    return True

def walk_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == "route.ts":
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    api_dir = "/app/apps/api-gateway/app/api/v1"
    if os.path.exists(api_dir):
        walk_directory(api_dir)
        print("Refactoring complete.")
    else:
        print("API directory not found.")
