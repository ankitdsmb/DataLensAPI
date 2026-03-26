filepath = "/app/apps/api-gateway/app/api/v1/apps/google-play-scraper/route.ts"
with open(filepath, "r") as f:
    content = f.read()

# Try to find and replace the problematic exact string
content = content.replace("const scriptText = $('script:contains(\"AF_initDataCallback({key: \\'ds:5\\'\")').text()", "const scriptText = $('script:contains(\"AF_initDataCallback({key: \\'ds:5\\'\")').text()")
# Let's just rewrite the line entirely to be safe
content = content.replace("const scriptText = $('script:contains(\"AF_initDataCallback({key: \\'ds:5\\'\")').text()", "const scriptText = $('script:contains(\\'AF_initDataCallback({key: \"ds:5\"\\')').text()")

# A simpler approach: use double quotes for the attribute value inside contains
lines = content.split('\n')
for i, line in enumerate(lines):
    if "AF_initDataCallback({key:" in line:
        lines[i] = "      const scriptText = $('script:contains(\\'AF_initDataCallback({key: \"ds:5\"\\')').text()"

with open(filepath, "w") as f:
    f.write('\n'.join(lines))
