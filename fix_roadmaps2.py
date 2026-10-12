file_path = r'd:\PROJECTS\Java\EduVault\backend\src\main\java\com\eduvault\repository\LocalJsonDatabase.java'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'private void seedRoadmaps()' in line:
        start_idx = i
    if 'public synchronized void saveRoadmaps()' in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    js_roadmap = []
    in_js = False
    for i in range(start_idx, end_idx):
        if 'roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()' in lines[i] and 'learn-javascript' in lines[i+1]:
            in_js = True
        
        if in_js:
            js_roadmap.append(lines[i])
            if '.build());' in lines[i]:
                in_js = False
    
    new_lines = lines[:start_idx+1]
    new_lines.append('        roadmaps.clear();\n\n')
    new_lines.extend(js_roadmap)
    new_lines.append('\n        saveRoadmaps();\n    }\n\n')
    new_lines.extend(lines[end_idx:])
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print('Done')
else:
    print('Not found')
