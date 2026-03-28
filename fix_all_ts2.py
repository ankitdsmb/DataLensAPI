import os
import glob
import re

seo_tools_dir = 'apps/api-gateway/app/api/v1/seo-tools'
files = glob.glob(os.path.join(seo_tools_dir, '**/route.ts'), recursive=True)

for f in files:
    with open(f, 'r') as file:
        content = file.read()

    modified = False

    if 'as unknown[]' in content and '.map(' in content:
        content = content.replace('as unknown[])', 'as Array<Record<string, unknown>>)')
        content = content.replace('as unknown[]', 'as Array<Record<string, unknown>>')
        modified = True

    if 'parsed?' in content and '(parsed as Record<string, unknown>)?' not in content:
        content = content.replace('parsed?.', '(parsed as Record<string, unknown>)?.')
        modified = True

    if 'data?' in content and '(data as Record<string, unknown>)?' not in content:
        content = content.replace('data?.', '(data as Record<string, unknown>)?.')
        modified = True

    if 'item.value' in content and 'item: { value?: string }' not in content:
        content = content.replace('item.value', '(item as Record<string, unknown>).value')
        modified = True

    if 'item.trackName' in content and 'item: { trackName?: string }' not in content:
        content = content.replace('item.trackName', '(item as Record<string, unknown>).trackName')
        modified = True

    # Some files use parsed[1], where parsed is Array.
    # In my previous step, I changed safeJsonParse<Record> to safeJsonParse<unknown[]>
    if 'safeJsonParse<unknown[]>' in content:
        if 'parsed[1]' in content:
            content = content.replace('parsed[1]', '(parsed as unknown[])[1]')
            modified = True
        if 'Array.isArray(parsed)' in content:
            # this is fine, TS knows it's unknown[]
            pass

    if modified:
        with open(f, 'w') as file:
            file.write(content)
        print(f"Fixed {f}")
