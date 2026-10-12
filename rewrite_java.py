file_path = r'd:\PROJECTS\Java\EduVault\backend\src\main\java\com\eduvault\repository\LocalJsonDatabase.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
match = re.search(r'(private void seedRoadmaps\(\) throws IOException \{)(.*?)(public synchronized void saveRoadmaps\(\) \{)', content, re.DOTALL)
if match:
    # replace seedRoadmaps body
    new_body = """
        roadmaps.clear();
        try {
            org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("seed_roadmaps.json");
            if (resource.exists()) {
                java.util.List<com.eduvault.model.PredefinedRoadmap> defaultRoadmaps = mapper.readValue(
                        resource.getInputStream(),
                        new com.fasterxml.jackson.core.type.TypeReference<java.util.List<com.eduvault.model.PredefinedRoadmap>>() {}
                );
                roadmaps.addAll(defaultRoadmaps);
            } else {
                log.warn("seed_roadmaps.json not found in classpath");
            }
        } catch (Exception e) {
            log.error("Error loading seed_roadmaps.json", e);
        }
        saveRoadmaps();
    }

    """
    
    new_content = content[:match.start(1)] + "private void seedRoadmaps() throws IOException {" + new_body + "public synchronized void saveRoadmaps() {" + content[match.end(3):]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced seedRoadmaps.")
else:
    print("Could not find seedRoadmaps pattern.")
