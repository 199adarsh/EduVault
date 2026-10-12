import re

file_path = r'd:\PROJECTS\Java\EduVault\backend\src\main\java\com\eduvault\repository\LocalJsonDatabase.java'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The JS roadmap is the one we want to keep
js_roadmap_match = re.search(r'(// Chai aur Javascript.*?\.build\(\)\);)', content, re.DOTALL)
if not js_roadmap_match:
    print("Could not find JS roadmap")
    exit(1)

js_roadmap = js_roadmap_match.group(1)

# Modify title and id
js_roadmap = js_roadmap.replace('.id("learn-javascript")', '.id("learn-javascript")') # Already learn-javascript
js_roadmap = js_roadmap.replace('.title("Learn JavaScript")', '.title("Learn JavaScript")')
js_roadmap = js_roadmap.replace('// Chai aur Javascript — Complete Hindi Series (51 videos, 1 per phase)', '// Learn JavaScript')

pattern = r'(private void seedRoadmaps\(\) throws IOException \{\s*roadmaps\.clear\(\);\s*)(.*?)(\s*saveRoadmaps\(\);\s*\})'

def replacer(match):
    return match.group(1) + "\n        " + js_roadmap + "\n\n" + match.group(3)

new_content, count = re.subn(pattern, replacer, content, flags=re.DOTALL)

if count > 0:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced.")
else:
    print("Failed to match seedRoadmaps.")

