import os
import glob
import re

seo_tools_dir = 'apps/api-gateway/app/api/v1/seo-tools'
files = glob.glob(os.path.join(seo_tools_dir, '**/route.ts'), recursive=True)

for f in files:
    with open(f, 'r') as file:
        content = file.read()

    modified = False
    lines = content.split('\n')

    for i, line in enumerate(lines):
        # For endpoints where parsed is Record<string, unknown> | null | {}
        # we need to ensure that property access is correctly casted.

        # 1. parsed.suggestions -> (parsed as Record<string, unknown>)?.suggestions
        if 'parsed.suggestions' in line:
            lines[i] = line.replace('parsed.suggestions', '((parsed as Record<string, unknown>)?.suggestions as unknown[])')
            modified = True

        if 'parsed?.suggestions' in line and '(parsed as' not in line:
            lines[i] = line.replace('parsed?.suggestions', '((parsed as Record<string, unknown>)?.suggestions as unknown[])')
            modified = True

        # 2. parsed.results -> (parsed as Record<string, unknown>)?.results
        if 'parsed.results' in line:
            lines[i] = line.replace('parsed.results', '((parsed as Record<string, unknown>)?.results as unknown[])')
            modified = True

        if 'parsed?.results' in line and '(parsed as' not in line:
            lines[i] = line.replace('parsed?.results', '((parsed as Record<string, unknown>)?.results as unknown[])')
            modified = True

        # 3. data.candidates -> (data as Record<string, unknown>)?.candidates
        if 'data.candidates' in line:
            lines[i] = line.replace('data.candidates', '((data as Record<string, unknown>)?.candidates as unknown[])')
            modified = True

        # 4. parsed[1] -> (parsed as unknown[])[1]
        if 'parsed[1]' in line:
            lines[i] = line.replace('parsed[1]', '(parsed as unknown[])[1]')
            modified = True

        # 5. Fix `.map((item: { ... })` to `.map((item: any)` to strictly remove `any` by using `unknown` and casting item.
        # But `map((item: unknown) => ...)` is better.
        # It's easier to find `.map((item:` and handle it, but there are many variations.

    if modified:
        with open(f, 'w') as file:
            file.write('\n'.join(lines))
        print(f"Updated typings in {f}")
