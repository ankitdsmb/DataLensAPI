import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue: Some files had early `return NextResponse.json()` inside the try block (like 9gag/downloader).
    # Since we removed `const startTime = Date.now()` from the top, the manual `NextResponse.json` calls inside
    # the function body fail because `startTime` is undefined.
    # The refactor script only replaced the LAST `NextResponse.json`.

    # We need to replace all `return NextResponse.json({... data: X ...})` inside the new wrapped body with just `return X`.

    lines = content.split('\n')
    new_lines = []
    skip_mode = False

    for i, line in enumerate(lines):
        if "return NextResponse.json({" in line or "return NextResponse.json( {" in line:
            # We found an un-refactored return. We need to extract the data payload.
            # Look ahead to find data
            data_val = None
            for j in range(i, min(i+15, len(lines))):
                m = re.search(r"data:\s*(.*?)(,|$)", lines[j])
                if m:
                    data_val = m.group(1).strip()
                    if data_val.endswith(','): data_val = data_val[:-1]
                    break

            if data_val:
                new_lines.append(f"        return {data_val};")
                skip_mode = True
            else:
                new_lines.append(line)
        elif skip_mode:
            # We skip lines until we hit the closing parenthesis of NextResponse.json
            if "});" in line or "} );" in line or "}, { status: " in line:
                skip_mode = False
        else:
            new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))

def walk_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == "route.ts":
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    api_dir = "/app/apps/api-gateway/app/api/v1"
    if os.path.exists(api_dir):
        walk_directory(api_dir)
        print("Lint refactoring complete.")
