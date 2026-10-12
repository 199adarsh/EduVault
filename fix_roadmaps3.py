import re
file_path = r'd:\PROJECTS\Java\EduVault\backend\src\main\java\com\eduvault\repository\LocalJsonDatabase.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'(roadmaps\.clear\(\);\s*).*?(// Chai aur Javascript — Complete Hindi Series \(51 videos, 1 per phase\))'

new_content, count = re.subn(pattern, r'\1\2', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print(f'Replaced {count} occurrences')
