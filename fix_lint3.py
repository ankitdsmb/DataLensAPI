import os
def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        content = content.replace("const emails = [...new Set(html.match(emailRegex) || [])];", "const emails = Array.from(new Set(html.match(emailRegex) || []));")
        content = content.replace("const phones = [...new Set(html.match(phoneRegex) || [])];", "const phones = Array.from(new Set(html.match(phoneRegex) || []));")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file("/app/apps/api-gateway/app/api/v1/osint/website-contact-extractor-fast/route.ts")
fix_file("/app/apps/api-gateway/app/api/v1/osint/website-contact-extractor/route.ts")
