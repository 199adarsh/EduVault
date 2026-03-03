package com.eduvault.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.fontbox.ttf.TTFParser;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);

    @Value("${app.storage.local-dir}")
    private String storageDir;

    private Path fileStorageLocation;

    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(storageDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
            
            // Optimize font loading to prevent repeated cache building
            System.setProperty("pdfbox.fontcache", "true");
            
            // Suppress font warnings to reduce log noise
            java.util.logging.Logger.getLogger("org.apache.pdfbox").setLevel(java.util.logging.Level.WARNING);
            
            logger.info("FileStorageService initialized with font cache optimization");
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public String storeFile(MultipartFile file) {
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        
        String storedFileName = UUID.randomUUID().toString() + fileExtension;

        try {
            if (storedFileName.contains("..")) {
                throw new RuntimeException("Sorry! Filename contains invalid path sequence " + storedFileName);
            }

            Path targetLocation = this.fileStorageLocation.resolve(storedFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return storedFileName; // Just return filename instead of full path
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + storedFileName + ". Please try again!", ex);
        }
    }
    
    public String extractText(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName);
            File file = filePath.toFile();
            if (!file.exists()) {
                return "File not found for extraction.";
            }

            String text = "";
            String lowerName = fileName.toLowerCase();

            if (lowerName.endsWith(".pdf")) {
                try (PDDocument document = Loader.loadPDF(file)) {
                    PDFTextStripper stripper = new PDFTextStripper();
                    text = stripper.getText(document);
                }
            } else if (lowerName.endsWith(".docx")) {
                try (XWPFDocument doc = new XWPFDocument(Files.newInputStream(filePath))) {
                    StringBuilder sb = new StringBuilder();
                    for (XWPFParagraph p : doc.getParagraphs()) {
                        sb.append(p.getText()).append("\n");
                    }
                    text = sb.toString();
                }
            } else if (lowerName.endsWith(".pptx")) {
                try (XMLSlideShow ppt = new XMLSlideShow(Files.newInputStream(filePath))) {
                    StringBuilder sb = new StringBuilder();
                    for (XSLFSlide slide : ppt.getSlides()) {
                        for (XSLFShape shape : slide.getShapes()) {
                            if (shape instanceof XSLFTextShape) {
                                XSLFTextShape textShape = (XSLFTextShape) shape;
                                sb.append(textShape.getText()).append("\n");
                            }
                        }
                    }
                    text = sb.toString();
                }
            } else {
                 return "Text extraction only supported for PDFs, DOCX and PPTX.";
            }
            
            return text;
        } catch (Exception e) {
            logger.error("Failed to extract text from: " + fileName, e);
            return "Failed to extract text.";
        }
    }
    
    public Path getFilePath(String fileName) {
        return this.fileStorageLocation.resolve(fileName).normalize();
    }
    
    public void deleteFile(String fileName) {
        try {
            Files.deleteIfExists(this.fileStorageLocation.resolve(fileName).normalize());
        } catch (IOException e) {
            logger.error("Could not delete file " + fileName, e);
        }
    }
}
